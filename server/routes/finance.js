const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/finance/wallets - Retrieve current crypto deposit addresses
router.get('/wallets', async (req, res) => {
  const settings = await db.getSettings();
  res.json({
    success: true,
    wallets: {
      TRC20: {
        network: 'USDT (TRC20)',
        address: settings.trc20_address || 'TJ8Yg9pKaV8vU3mQ2jN5xL7wE1tZ4dC6bA',
        min_deposit: settings.min_deposit || 20,
        confirmations: '1 Network Confirmation'
      },
      ERC20: {
        network: 'USDT (ERC20)',
        address: settings.erc20_address || '0x88922C0A5A901F1aA719d3f1FeA6bA34B20C888A',
        min_deposit: settings.min_deposit || 20,
        confirmations: '12 Network Confirmations'
      },
      BTC: {
        network: 'Bitcoin (BTC)',
        address: settings.btc_address || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        min_deposit: settings.min_deposit || 20,
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
  const { amount, method, txid, proof_image, notes } = req.body;
  const user = await db.findUserById(req.user.id);
  const settings = await db.getSettings();

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < (settings.min_deposit || 20)) {
    return res.status(400).json({
      success: false,
      message: `Minimum deposit amount is $${settings.min_deposit || 20}.00`
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
    user_email: user.email,
    amount: numAmount,
    method: method || 'TRC20',
    txid: txid.trim(),
    proof_image: proof_image || '',
    status: 'pending',
    admin_notes: notes || '',
    created_at: new Date().toISOString()
  };

  await db.createDeposit(deposit);

  res.json({
    success: true,
    message: `Deposit request of $${numAmount.toFixed(2)} submitted successfully! Your account will be credited once verified on the blockchain.`,
    deposit
  });
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

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < (settings.min_withdraw || 30)) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is $${settings.min_withdraw || 30}.00`
      });
    }

    const currentBalance = parseFloat(user.balance) || 0;
    const currentFrozen = parseFloat(user.frozen_balance) || 0;

    if (currentBalance < numAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient working balance. Available balance: $${currentBalance.toFixed(2)}`
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

    // Deduct balance and add to frozen balance
    const updatedBalance = parseFloat((currentBalance - numAmount).toFixed(2));
    const updatedFrozen = parseFloat((currentFrozen + numAmount).toFixed(2));

    await db.updateUser(user.id, {
      balance: updatedBalance,
      frozen_balance: updatedFrozen
    });

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
      new_balance: updatedBalance,
      new_frozen: updatedFrozen
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
