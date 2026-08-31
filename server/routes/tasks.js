const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/tasks/status - Get current user task statistics
router.get('/status', authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  const settings = db.getSettings();
  const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.005, max_tasks: 38 };

  const userTasks = db.getTasks(user.id);

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
router.post('/generate', authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  const settings = db.getSettings();
  const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.005, max_tasks: 38 };

  if (user.today_tasks_completed >= vipRate.max_tasks) {
    return res.status(400).json({
      success: false,
      message: `You have completed all ${vipRate.max_tasks} daily optimization tasks for VIP ${user.vip_level}. Please upgrade VIP or return tomorrow!`
    });
  }

  if (user.balance <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient working balance to match merchant orders. Please deposit funds to continue.'
    });
  }

  const products = db.getProducts();
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  
  // Calculate commission based on order value or working balance
  const commissionRate = vipRate.commission || 0.005;
  const orderPrice = Math.min(randomProduct.price, Math.max(50, user.balance * 0.9));
  const commissionAmount = parseFloat((orderPrice * commissionRate).toFixed(2));

  const task = {
    id: 'tsk_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    user_id: user.id,
    product_name: randomProduct.name,
    product_image: randomProduct.image,
    product_price: orderPrice,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    status: 'pending',
    order_num: user.today_tasks_completed + 1,
    created_at: new Date().toISOString()
  };

  db.createTask(task);

  res.json({
    success: true,
    task
  });
});

// POST /api/tasks/submit - Submit review and claim commission
router.post('/submit', authMiddleware, (req, res) => {
  const { taskId } = req.body;
  const user = db.findUserById(req.user.id);

  if (!taskId) {
    return res.status(400).json({ success: false, message: 'Task ID required' });
  }

  const tasks = db.getTasks(user.id);
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ success: false, message: 'Optimization task not found' });
  }

  if (task.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Task already completed and commission claimed.' });
  }

  // Update task to completed
  db.updateTask(taskId, {
    status: 'completed',
    completed_at: new Date().toISOString()
  });

  // Credit commission to user balance
  const newBalance = parseFloat((user.balance + task.commission_amount).toFixed(2));
  const newTodayProfit = parseFloat((user.today_profit + task.commission_amount).toFixed(2));
  const newCompletedTasks = user.today_tasks_completed + 1;
  const newTotalTasks = user.total_tasks_completed + 1;

  db.updateUser(user.id, {
    balance: newBalance,
    today_profit: newTodayProfit,
    today_tasks_completed: newCompletedTasks,
    total_tasks_completed: newTotalTasks,
    current_set: newCompletedTasks
  });

  res.json({
    success: true,
    message: `Optimization successful! +$${task.commission_amount.toFixed(2)} credited to your account.`,
    data: {
      balance: newBalance,
      today_profit: newTodayProfit,
      today_tasks_completed: newCompletedTasks,
      commission_earned: task.commission_amount
    }
  });
});

// GET /api/tasks/records - List all user tasks
router.get('/records', authMiddleware, (req, res) => {
  const statusFilter = req.query.status; // 'all', 'pending', 'completed'
  let tasks = db.getTasks(req.user.id);

  if (statusFilter && statusFilter !== 'all') {
    tasks = tasks.filter(t => t.status === statusFilter);
  }

  res.json({
    success: true,
    tasks
  });
});

module.exports = router;
