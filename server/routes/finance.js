const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { MIN_WITHDRAWAL_AMOUNT, parseWholeDollarAmount, effectiveWithdrawalMinimum } = require('../utils/withdrawalAmount');
const { effectiveDepositMinimum, DEFAULT_MINIMUM_DEPOSIT } = require('../utils/depositAmount');

// GET /api/finance/wallets - Retrieve current crypto deposit addresses
router.get('/wallets', async (req, res) => {
  const settings = await db.getSettings();
  const minimum = Number(settings.min_deposit) > 0 ? Number(settings.min_deposit) : DEFAULT_MINIMUM_DEPOSIT;
  res.json({
    success: true,
    wallets: {
      TRC20: {
        network: 'USDT (TRC20)',
        address: settings.trc20_address || 'TJ8Yg9pKaV8vU3mQ2jN5xL7wE1tZ4dC6bA',
        min_deposit: minimum,
        confirmations: '1 Network Confirmation'
      },
      ERC20: {
        network: 'USDT (ERC20)',
        address: settings.erc20_address || '0x88922C0A5A901F1aA719d3f1FeA6bA34B20C888A',
        min_deposit: minimum,
        confirmations: '12 Network Confirmations'
      },
      BTC: {
        network: 'Bitcoin (BTC)',
        address: settings.btc_address || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        min_deposit: minimum,
        confirmations: '2 Network Confirmations'
      }
    },
    support: {
      telegram: settings.telegram_support,
      whatsapp: settings.whatsapp_support
    }
  });
});

// POST /api/finance/deposit - Submit deposit request
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount, method, txid, proof_image, notes } = req.body;
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User session expired. Please log in again.' });
    }
    const settings = await db.getSettings();

    const numAmount = parseFloat(amount);
    const minimum = effectiveDepositMinimum(user, settings);
    if (isNaN(numAmount) || numAmount < minimum) {
      return res.status(400).json({
        success: false,
        message: `Minimum deposit amount is $${minimum.toFixed(2)}`
      });
    }

    if (!txid || txid.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Blockchain Transaction ID (TxHash) or Reference Number.'
      });
    }

    const deposit = {
      id: 'dep_' + Date.now(),
      user_id: user.id,
      user_email: user.email || '',
      amount: numAmount,
      method: method || 'TRC20',
      txid: txid.trim(),
      proof_image: proof_image || '',
      status: 'pending',
      admin_notes: notes || '',
      created_at: new Date().toISOString()
    };

    await db.createDeposit(deposit);
    await db.createNotification({
      user_id: user.id,
      title: 'Deposit Processing',
      message: `Your deposit of $${numAmount.toFixed(2)} submitted successfully! Your payment is currently being processed and will be completed shortly.`,
      type: 'info'
    }).catch(err => console.error('[Deposit Notification Error]', err.message));

    res.json({
      success: true,
      message: `Your deposit of $${numAmount.toFixed(2)} submitted successfully! Your payment is currently being processed and will be completed shortly.`,
      deposit
    });
  } catch (err) {
    console.error('[Deposit Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process deposit: ' + err.message
    });
  }
});

// POST /api/finance/withdraw - Submit withdrawal request
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, method, network, wallet_address, bank_name, account_holder, iban } = req.body;
    const user = await db.findUserById(req.user.id);
    const settings = await db.getSettings();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Account restriction check (when disabled by admin: deposit allowed, withdrawal blocked)
    if (user.status === 'disabled' || user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Withdrawals are currently suspended on your account. Please contact customer support.'
      });
    }

    // 1. Mandatory requirement: All assigned tasks and daily orders must be completed before withdrawal
    const isNegative = parseFloat(user.balance || 0) < 0;
    const userTasks = await db.getTasks(user.id);
    const pendingTask = (userTasks || []).find(t => t.status === 'pending');

    const userOrders = await db.getOrders({ user_id: user.id });
    const pendingOrder = (userOrders || []).find(o => 
      ['PENDING', 'PROCESSING', 'SHORTFALL'].includes((o.order_status || '').toUpperCase())
    );

    const maxTasks = (user.custom_daily_limit && user.custom_daily_limit > 0)
      ? user.custom_daily_limit
      : ((user.task_sequence_plan && user.task_sequence_plan.total_orders)
        ? user.task_sequence_plan.total_orders
        : 5);

    const completedTasks = parseInt(user.today_tasks_completed || 0, 10);

    if (isNegative || pendingTask || pendingOrder || completedTasks < maxTasks) {
      let reason = 'You have to complete your pending order before requesting a withdrawal.';
      if (pendingTask || pendingOrder) {
        reason = 'You have an active pending order in progress. You have to complete your assigned orders before you can make a withdrawal.';
      } else if (isNegative) {
        reason = 'Your working balance is currently negative. Please clear the deficit and complete your order before requesting a withdrawal.';
      } else if (completedTasks < maxTasks) {
        reason = `You have to complete all daily orders (${completedTasks}/${maxTasks} completed) before requesting a withdrawal.`;
      }

      return res.status(400).json({
        success: false,
        has_pending_tasks: true,
        pending_order_number: pendingTask ? pendingTask.order_number : (pendingOrder ? pendingOrder.order_number : null),
        product_name: pendingTask ? pendingTask.product_name : null,
        completed_tasks: completedTasks,
        max_tasks: maxTasks,
        message: reason
      });
    }

    const minWithdraw = effectiveWithdrawalMinimum(user.custom_min_withdraw, settings.min_withdraw);
    const numAmount = parseWholeDollarAmount(amount);
    if (numAmount === null) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal amount must be a whole-dollar number (for example, $10 or $20).'
      });
    }
    if (numAmount < minWithdraw || numAmount < MIN_WITHDRAWAL_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is $${minWithdraw.toFixed(2)}`
      });
    }

    const commBalance = parseFloat(user.commission_balance || 0);
    const workBalance = parseFloat(user.balance || 0);
    // As instructed by client: user can only withdraw up to Total Balance with Commission (commission_balance)
    const availableWithdrawable = commBalance > 0 ? commBalance : workBalance;
    const currentFrozen = parseFloat(user.frozen_balance) || 0;

    if (availableWithdrawable < numAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient withdrawable balance. Available Total Balance with Commission: $${availableWithdrawable.toFixed(2)}`
      });
    }

    // Validate address/bank details
    const withdrawMethod = (method || 'USDT').toUpperCase();
    if (withdrawMethod === 'USDT' || withdrawMethod === 'BTC') {
      if (!wallet_address || wallet_address.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Please provide a valid receiving crypto wallet address.' });
      }
    } else if (withdrawMethod === 'BANK') {
      if (!bank_name || !account_holder || !iban) {
        return res.status(400).json({ success: false, message: 'Please complete all bank transfer details (Bank Name, Holder, IBAN/Account).' });
      }
    }

    // Deduct withdrawable balance and add to frozen balance
    const updates = {
      frozen_balance: parseFloat((currentFrozen + numAmount).toFixed(2))
    };
    if (commBalance > 0) {
      updates.commission_balance = parseFloat(Math.max(0, commBalance - numAmount).toFixed(2));
    } else {
      updates.balance = parseFloat((workBalance - numAmount).toFixed(2));
    }

    await db.updateUser(user.id, updates);

    const withdrawal = {
      id: 'wth_' + Date.now(),
      user_id: user.id,
      user_email: user.email,
      amount: numAmount,
      method: withdrawMethod,
      network: network || 'TRC20',
      wallet_address: (wallet_address || '').trim(),
      bank_name: (bank_name || withdrawMethod).trim(),
      account_name: (account_holder || user.fullname || user.username || 'Merchant').trim(),
      account_number: (wallet_address || iban || '').trim(),
      status: 'pending',
      admin_notes: '',
      created_at: new Date().toISOString()
    };

    await db.createWithdrawal(withdrawal);

    res.json({
      success: true,
      message: `Withdrawal request for $${numAmount.toFixed(2)} submitted successfully! Processing time is usually 15-60 minutes.`,
      withdrawal,
      new_balance: updates.balance !== undefined ? updates.balance : workBalance,
      new_commission_balance: updates.commission_balance !== undefined ? updates.commission_balance : commBalance,
      new_frozen: updates.frozen_balance
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ success: false, message: 'Error submitting withdrawal: ' + err.message });
  }
});

// GET /api/finance/history - User financial transaction log
router.get('/history', authMiddleware, async (req, res) => {
  const user = req.user;
  const deposits = await db.getDeposits(user.id);
  const withdrawals = await db.getWithdrawals(user.id);

  res.json({
    success: true,
    deposits,
    withdrawals
  });
});

module.exports = router;
