const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const {
  isCategoryMarker,
  parseCategoryMarker,
  pickCategoryProduct
} = require('../utils/productCategories');
const {
  round,
  generateOrderNumber,
  generateTaskNumber,
  calculateOrder
} = require('../utils/orderCalculator');

function toDateString(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    if (val.match(/^\d{4}-\d{2}-\d{2}/)) return val.slice(0, 10);
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

// Helper: auto-reset daily stats ONLY if date has actually changed (24-hour cycle)
async function autoResetIfNewDay(user) {
  const today = toDateString(new Date());
  const lastReset = toDateString(user.last_reset_date);

  if (!lastReset) {
    await db.updateUser(user.id, { last_reset_date: today }).catch(() => {});
    user.last_reset_date = today;
    return user;
  }

  // Only reset if date actually changed AND user is not in negative balance (active deficit order)
  if (lastReset !== today && parseFloat(user.balance || 0) >= 0) {
    await db.updateUser(user.id, {
      today_tasks_completed: 0,
      today_profit: 0.00,
      current_set: 0,
      last_reset_date: today
    }).catch(() => {});
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
  const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.20, max_tasks: 6 };
  // Admin-set custom daily limit or sequence plan takes priority over default
  const maxTasks = (user.custom_daily_limit && user.custom_daily_limit > 0)
    ? user.custom_daily_limit
    : ((user.task_sequence_plan && user.task_sequence_plan.total_orders)
      ? user.task_sequence_plan.total_orders
      : 6);

  const userTasks = await db.getTasks(user.id);

  // Dynamically compute today's earned profit from tasks completed today
  // IMPORTANT: Only count tasks completed AFTER admin's last reset (tasks_reset_at)
  const todayStr = toDateString(new Date());
  const resetCutoff = user.tasks_reset_at ? new Date(user.tasks_reset_at) : null;

  const todaysCompletedTasks = (userTasks || []).filter(t => {
    if (t.status !== 'completed') return false;
    const taskDate = toDateString(t.completed_at || t.created_at);
    if (taskDate !== todayStr) return false;
    // If admin reset was done today, exclude tasks completed before the reset
    if (resetCutoff) {
      const taskTs = new Date(t.completed_at || t.created_at);
      if (taskTs < resetCutoff) return false;
    }
    return true;
  });

  const computedProfit = todaysCompletedTasks.reduce((sum, t) => {
    return sum + parseFloat(t.commission_earned || t.commission_amount || 0);
  }, 0);

  // Dynamically compute accumulated commission_balance (completed orders principal + profit)
  const computedCommBal = todaysCompletedTasks.reduce((sum, t) => {
    return sum + parseFloat(t.product_price || 0) + parseFloat(t.commission_earned || t.commission_amount || 0);
  }, 0);

  let currentTodayProfit = parseFloat(user.today_profit || 0);
  let currentTasksCompleted = parseInt(user.today_tasks_completed || 0, 10);
  let currentCommissionBalance = parseFloat(user.commission_balance || 0);

  // Self-heal profit and commission balance if not synced
  const userUpdates = {};
  if (computedProfit > currentTodayProfit) {
    currentTodayProfit = round(computedProfit);
    userUpdates.today_profit = currentTodayProfit;
  }
  if (todaysCompletedTasks.length > currentTasksCompleted) {
    currentTasksCompleted = todaysCompletedTasks.length;
    userUpdates.today_tasks_completed = currentTasksCompleted;
  }
  if (computedCommBal > currentCommissionBalance) {
    currentCommissionBalance = round(computedCommBal);
    userUpdates.commission_balance = currentCommissionBalance;
  }
  if (Object.keys(userUpdates).length > 0) {
    await db.updateUser(user.id, userUpdates).catch(() => {});
  }

  // Find any active pending task for this user
  const pendingTask = (userTasks || []).find(t => t.status === 'pending');

  res.json({
    success: true,
    data: {
      balance: user.balance,
      frozen_balance: user.frozen_balance,
      commission_balance: currentCommissionBalance,
      today_profit: currentTodayProfit,
      today_tasks_completed: currentTasksCompleted,
      current_set: user.current_set || 0,
      max_tasks: maxTasks,
      custom_daily_limit: user.custom_daily_limit || null,
      vip_level: user.vip_level,
      kyc_status: user.kyc_status || 'none',
      commission_rate: vipRate.commission,
      pending_task: pendingTask ? {
        id: pendingTask.id,
        order_number: pendingTask.order_number,
        product_name: pendingTask.product_name,
        product_price: parseFloat(pendingTask.product_price || 0),
        commission_amount: parseFloat(pendingTask.commission_amount !== undefined && pendingTask.commission_amount !== null ? pendingTask.commission_amount : (pendingTask.commission_earned || 0)),
        commission_rate: parseFloat(pendingTask.commission_rate || vipRate.commission),
        is_deficit: pendingTask.is_deficit,
        deficit_amount: pendingTask.deficit_amount
      } : null,
      recent_tasks: (userTasks || []).slice(0, 10)
    }
  });
});

// POST /api/tasks/generate - Match merchant order & initiate task
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    let user = await db.findUserById(req.user.id);
    // Auto-reset daily stats if it's a new day
    user = await autoResetIfNewDay(user);

    const settings = await db.getSettings();
    const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.20, max_tasks: 6 };
    const maxTasks = (user.custom_daily_limit && user.custom_daily_limit > 0)
      ? user.custom_daily_limit
      : ((user.task_sequence_plan && user.task_sequence_plan.total_orders)
        ? user.task_sequence_plan.total_orders
        : 6);

    // Recompute actual completed tasks since last admin reset (to prevent false daily-limit block)
    const todayStr2 = toDateString(new Date());
    const resetCutoff2 = user.tasks_reset_at ? new Date(user.tasks_reset_at) : null;
    const allUserTasks2 = await db.getTasks(user.id);
    const trulyCompleted = (allUserTasks2 || []).filter(t => {
      if (t.status !== 'completed') return false;
      const taskDate = toDateString(t.completed_at || t.created_at);
      if (taskDate !== todayStr2) return false;
      if (resetCutoff2) {
        const taskTs = new Date(t.completed_at || t.created_at);
        if (taskTs < resetCutoff2) return false;
      }
      return true;
    }).length;

    // Use whichever count is lower (DB field vs actual count) to prevent false blocks
    const effectiveCompleted = Math.min(parseInt(user.today_tasks_completed || 0, 10), trulyCompleted > 0 ? trulyCompleted : parseInt(user.today_tasks_completed || 0, 10));

    // Strict KYC & Merchant Contract Guard (Voice Note S8)
    if (user.kyc_status !== 'approved') {
      let msg = 'Please sign your Merchant Contract and complete KYC verification before starting optimization tasks.';
      if (user.kyc_status === 'pending') {
        msg = 'Your Merchant Contract & KYC verification are currently under review by administration. Please wait for approval before starting optimization tasks.';
      } else if (user.kyc_status === 'rejected') {
        msg = `Your KYC verification was rejected: ${user.kyc_notes || 'Please resubmit valid documents'}. Please update your contract to proceed.`;
      }
      return res.status(403).json({
        success: false,
        requires_kyc: true,
        kyc_status: user.kyc_status || 'none',
        message: msg
      });
    }

    if (effectiveCompleted >= maxTasks) {
      return res.status(400).json({
        success: false,
        message: `You have completed all ${maxTasks} daily optimization tasks. Please return tomorrow!`
      });
    }

    // Check if there is already a pending task for this user
    const existingTasks = await db.getTasks(user.id);
    const existingPending = existingTasks.find(t => t.status === 'pending');
    if (existingPending) {
      const price = parseFloat(existingPending.product_price || 0);
      const comm = parseFloat(existingPending.commission_amount !== undefined && existingPending.commission_amount !== null
        ? existingPending.commission_amount
        : (existingPending.commission_earned || 0));
      return res.json({
        success: true,
        task: {
          ...existingPending,
          product_price: price,
          commission_amount: comm,
          commission_rate: parseFloat(existingPending.commission_rate || 0.20)
        },
        is_existing: true
      });
    }

    // If balance is zero or negative and no pending task exists, user needs to deposit
    if (user.balance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient working balance to match merchant orders. Please deposit funds to continue.'
      });
    }

    const currentOrder = user.today_tasks_completed + 1;
    const products = await db.getProducts();

    // Check user's previous tasks to ensure variety
    const usedProductNames = new Set(existingTasks.map(t => t.product_name));
    let availableProducts = products.filter(p => !usedProductNames.has(p.name));
    if (availableProducts.length === 0) {
      availableProducts = [...products];
    }

    const commissionRate = vipRate.commission || 0.20;

    // Check if user has a planned order sequence from admin
    let plannedStep = null;
    if (user.task_sequence_plan) {
      try {
        const plan = typeof user.task_sequence_plan === 'string'
          ? JSON.parse(user.task_sequence_plan)
          : user.task_sequence_plan;
        if (Array.isArray(plan)) {
          plannedStep = plan.find(s => parseInt(s.order_num, 10) === currentOrder);
        }
      } catch (err) {
        console.error('[Task Sequence Plan] Parse error:', err.message);
      }
    }

    // Check if this is a Deficit / Forced Recharge Order:
    // Deficit orders MUST ONLY occur if admin explicitly configured it or planned in sequence plan (Voice Note S3 & S8)
    const isAdminCustom = Boolean(user.custom_order_num && (user.custom_order_num === currentOrder || user.custom_order_num <= currentOrder));
    let isDeficit = Boolean(plannedStep ? (plannedStep.is_deficit || parseFloat(plannedStep.amount || plannedStep.price || 0) > (user.balance || 0)) : isAdminCustom);

    let orderPrice;
    let deficitAmount = 0;
    let selectedProduct;

    if (plannedStep) {
      const plannedAmt = parseFloat(plannedStep.amount !== undefined ? plannedStep.amount : (plannedStep.price || 0));
      orderPrice = plannedAmt;
      isDeficit = Boolean(plannedStep.is_deficit || (plannedAmt > parseFloat(user.balance || 0)));

      if (isDeficit) {
        deficitAmount = plannedStep.deficit_amount !== undefined && plannedStep.deficit_amount !== null
          ? parseFloat(plannedStep.deficit_amount)
          : Math.max(10, parseFloat((orderPrice - parseFloat(user.balance || 0)).toFixed(2)));
        
        const sortedDesc = [...products].sort((a, b) => Math.abs(parseFloat(a.price) - orderPrice) - Math.abs(parseFloat(b.price) - orderPrice));
        const matched = sortedDesc[0];
        selectedProduct = {
          id: matched ? matched.id : null,
          name: matched ? matched.name : 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)',
          price: orderPrice,
          image: matched && matched.image ? matched.image : 'client/assets/uploads/products/outdoor_shed.jpg',
          category: matched ? (matched.category || 'General') : 'General'
        };
      } else {
        deficitAmount = 0;
        const sortedAsc = [...availableProducts].sort((a, b) => Math.abs(parseFloat(a.price) - orderPrice) - Math.abs(parseFloat(b.price) - orderPrice));
        const matched = sortedAsc[0] || availableProducts[0];
        selectedProduct = {
          id: matched ? matched.id : null,
          name: matched ? matched.name : 'Standard Optimization Item',
          price: orderPrice,
          image: matched && matched.image ? matched.image : 'client/assets/uploads/products/glow_sticks.jpg',
          category: matched ? (matched.category || 'General') : 'General'
        };
      }
    } else if (isDeficit) {
      deficitAmount = user.custom_deficit_amount !== null && user.custom_deficit_amount !== undefined
        ? parseFloat(user.custom_deficit_amount)
        : parseFloat((25 + Math.floor(Math.random() * 10)).toFixed(2));

      if (user.custom_product_name && isCategoryMarker(user.custom_product_name)) {
        const categoryKey = parseCategoryMarker(user.custom_product_name);
        selectedProduct = pickCategoryProduct(products, categoryKey, existingTasks, user.id);
        if (selectedProduct) {
          orderPrice = parseFloat(selectedProduct.price);
          deficitAmount = Math.max(10, parseFloat((orderPrice - user.balance).toFixed(2)));
        }
      } else if (user.custom_product_name && user.custom_product_price) {
        orderPrice = parseFloat(user.custom_product_price);
        deficitAmount = Math.max(10, parseFloat((orderPrice - user.balance).toFixed(2)));
        selectedProduct = {
          name: user.custom_product_name,
          price: orderPrice,
          image: 'client/assets/uploads/products/outdoor_shed.jpg'
        };
        const matched = products.find(p => p.name.toLowerCase().includes(user.custom_product_name.toLowerCase()));
        if (matched && matched.image) selectedProduct.image = matched.image;
        if (matched && (!orderPrice || orderPrice <= 0)) {
          orderPrice = parseFloat(matched.price);
          selectedProduct.price = orderPrice;
        }
      } else {
        const targetRequiredPrice = parseFloat((user.balance + deficitAmount).toFixed(2));
        const deficitCandidates = products.filter(p => parseFloat(p.price) >= targetRequiredPrice);
        if (deficitCandidates.length > 0) {
          deficitCandidates.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
          selectedProduct = deficitCandidates[0];
          orderPrice = parseFloat(selectedProduct.price);
          deficitAmount = parseFloat((orderPrice - user.balance).toFixed(2));
        } else {
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

      if (!selectedProduct) {
        const sortedDesc = [...products].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        selectedProduct = sortedDesc[0] || {
          name: 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)',
          price: 3674.00,
          image: 'client/assets/uploads/products/outdoor_shed.jpg'
        };
        orderPrice = parseFloat(selectedProduct.price);
        deficitAmount = parseFloat((orderPrice - user.balance).toFixed(2));
      }
    } else {
      // Normal Orders: Real products scaled realistically within user's working balance (Voice Note S1 & S3)
      const userBal = Math.max(10, parseFloat(user.balance || 0));
      let minBudget = Math.min(5.00, userBal * 0.15);
      let maxBudget = Math.min(25.00, userBal * 0.35);

      if (currentOrder === 1) {
        minBudget = Math.min(5.00, userBal * 0.15);
        maxBudget = Math.min(25.00, userBal * 0.35);
      } else if (currentOrder === 2) {
        minBudget = Math.min(10.00, userBal * 0.25);
        maxBudget = Math.min(45.00, userBal * 0.50);
      } else if (currentOrder === 3) {
        minBudget = Math.min(15.00, userBal * 0.35);
        maxBudget = Math.min(75.00, userBal * 0.65);
      } else {
        minBudget = Math.min(20.00, userBal * 0.40);
        maxBudget = Math.min(120.00, userBal * 0.75);
      }

      let matching = availableProducts.filter(p => {
        const pr = parseFloat(p.price);
        return pr >= minBudget && pr <= maxBudget && pr < (userBal * 0.90);
      });

      if (matching.length === 0) {
        matching = availableProducts.filter(p => parseFloat(p.price) < (userBal * 0.85));
      }
      if (matching.length === 0) {
        // Safe fallback: scale safely within available balance so balance NEVER goes negative on normal order
        const sortedAsc = [...availableProducts].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        const baseProd = sortedAsc[0] || { name: 'Standard Optimization Item', image: 'client/assets/uploads/products/glow_sticks.jpg' };
        const safePrice = round(Math.max(5.00, userBal * 0.30));
        selectedProduct = {
          id: baseProd.id || null,
          name: baseProd.name,
          price: safePrice,
          image: baseProd.image,
          category: baseProd.category || 'General'
        };
        orderPrice = safePrice;
      } else {
        selectedProduct = matching[Math.floor(Math.random() * matching.length)];
        orderPrice = parseFloat(selectedProduct.price);
      }
    }

    // Financial Calculation Engine - Single Source of Truth
    const calc = calculateOrder({
      unit_price: orderPrice,
      quantity: 1,
      commission_rate: commissionRate,
      reward_rate: commissionRate,
      available_balance: user.balance
    });

    const productName = selectedProduct.name;
    const productImage = selectedProduct.image || 'client/assets/uploads/products/outdoor_shed.jpg';
    const orderNumber = generateOrderNumber();
    const taskId = generateTaskNumber();
    const orderId = 'ord_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

    // Deduct order price / gross amount from user's working balance
    const currentBalance = round(user.balance);
    const newBalance = round(currentBalance - calc.gross_amount);
    const userUpdates = { balance: newBalance };
    if (newBalance < 0) {
      userUpdates.frozen_balance = round(Math.abs(newBalance));
    }
    await db.updateUser(user.id, userUpdates);

    // Create Order Record in orders table
    await db.createOrder({
      id: orderId,
      order_number: orderNumber,
      user_id: user.id,
      merchant_id: null,
      task_id: taskId,
      product_id: selectedProduct.id || null,
      product_name: productName,
      product_image: productImage,
      category: selectedProduct.category || 'General',
      unit_price: calc.unit_price,
      quantity: calc.quantity,
      subtotal: calc.subtotal,
      discount_rate: calc.discount_rate,
      discount_amount: calc.discount_amount,
      tax_rate: calc.tax_rate,
      tax_amount: calc.tax_amount,
      fee_amount: calc.fee_amount,
      gross_amount: calc.gross_amount,
      commission_rate: calc.commission_rate,
      commission_amount: calc.commission_amount,
      reward_rate: calc.reward_rate,
      reward_amount: calc.reward_amount,
      user_deduction: calc.gross_amount,
      payment_status: calc.is_deficit ? 'SHORTFALL' : 'PAID',
      order_status: 'PROCESSING',
      created_at: new Date()
    });

    // Record Ledger Entry: ORDER_RESERVE
    await db.createLedgerTransaction({
      userId: user.id,
      orderId: orderId,
      taskId: taskId,
      adminId: null,
      type: 'ORDER_RESERVE',
      amount: -calc.gross_amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      currency: 'USD',
      reference: orderNumber,
      description: `Order reserve deduction for ${productName}`
    });

    // Create Task Record
    const task = {
      id: taskId,
      order_number: orderNumber,
      user_id: user.id,
      product_name: productName,
      product_image: productImage,
      product_price: calc.gross_amount,
      commission_rate: calc.commission_rate,
      commission_earned: calc.commission_amount,
      commission_amount: calc.commission_amount,
      status: 'pending',
      order_num: currentOrder,
      is_deficit: calc.is_deficit ? 1 : 0,
      deficit_amount: calc.funding_shortfall,
      created_at: new Date().toISOString()
    };

    await db.createTask(task);

    res.json({
      success: true,
      task: {
        ...task,
        product_price: calc.gross_amount,
        commission_amount: calc.commission_amount,
        commission_rate: calc.commission_rate
      },
      order_number: orderNumber,
      new_balance: newBalance,
      is_deficit: calc.is_deficit,
      deficit_amount: calc.funding_shortfall
    });
  } catch (err) {
    console.error('Task generate error:', err);
    res.status(500).json({ success: false, message: 'Error matching task order: ' + err.message });
  }
});

// POST /api/tasks/submit - Submit review and claim commission
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const taskId = req.body.taskId || req.body.task_id;
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
    const commAmount = parseFloat(task.commission_amount !== undefined && task.commission_amount !== null
      ? task.commission_amount
      : (task.commission_earned || 0));

    // If user's balance is negative, deficit has not been cleared
    if (userBalance < 0) {
      const deficit = round(Math.abs(userBalance));
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
      commission_earned: commAmount,
      completed_at: new Date()
    });

    // Update corresponding order in orders table
    if (task.order_number) {
      await db.updateOrder(task.order_number, {
        task_id: task.id,
        payment_status: 'PAID',
        order_status: 'COMPLETED',
        completed_at: new Date()
      }).catch(err => console.error('[Order Update Notice]:', err.message));
    }

    // Financial Calculation:
    // As instructed by client: Order principal + profit move from Working Balance into Total Balance with Commission (commission_balance)
    const remainingWorkingBalance = round(userBalance);
    const prevCommBal = parseFloat(user.commission_balance || 0);
    const newCommissionBalance = round(prevCommBal + taskPrice + commAmount);

    // Record Ledger Entry 1: ORDER_RELEASE (credited to commission_balance)
    await db.createLedgerTransaction({
      userId: user.id,
      taskId: task.id,
      adminId: null,
      type: 'ORDER_RELEASE',
      amount: taskPrice,
      balanceBefore: prevCommBal,
      balanceAfter: prevCommBal + taskPrice,
      currency: 'USD',
      reference: task.order_number || task.id,
      description: `Principal credited to Total Balance with Commission: ${task.product_name}`
    });

    // Record Ledger Entry 2: REWARD (commission earned)
    await db.createLedgerTransaction({
      userId: user.id,
      taskId: task.id,
      adminId: null,
      type: 'REWARD',
      amount: commAmount,
      balanceBefore: prevCommBal + taskPrice,
      balanceAfter: newCommissionBalance,
      currency: 'USD',
      reference: task.order_number || task.id,
      description: `Optimization reward for order: ${task.product_name}`
    });

    const newTodayProfit = round((parseFloat(user.today_profit) || 0) + commAmount);
    const newCompletedTasks = (parseInt(user.today_tasks_completed, 10) || 0) + 1;
    const newTotalTasks = (parseInt(user.total_tasks_completed, 10) || 0) + 1;

    const updates = {
      balance: remainingWorkingBalance,
      commission_balance: newCommissionBalance,
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

    // If user was executing an admin order sequence plan, check if finished
    if (user.task_sequence_plan) {
      try {
        const plan = typeof user.task_sequence_plan === 'string'
          ? JSON.parse(user.task_sequence_plan)
          : user.task_sequence_plan;
        if (Array.isArray(plan) && plan.length > 0) {
          const maxPlannedOrder = Math.max(...plan.map(s => parseInt(s.order_num, 10) || 0));
          if (newCompletedTasks >= maxPlannedOrder) {
            updates.task_sequence_plan = null;
          }
        }
      } catch (err) {
        console.error('[Task Sequence Plan Submit] Error:', err.message);
      }
    }

    await db.updateUser(user.id, updates);

    return res.json({
      success: true,
      message: `Optimization successful! +$${commAmount.toFixed(2)} added to Total Balance with Commission.`,
      data: {
        balance: remainingWorkingBalance,
        commission_balance: newCommissionBalance,
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

// GET /api/tasks/records - List user tasks & orders with full details for All, Pending, Completed tabs
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    const userTasks = await db.getTasks(req.user.id);
    const userOrders = await db.getOrders({ user_id: req.user.id }).catch(() => []);
    const userDeposits = await db.getDeposits(req.user.id);
    const userWithdrawals = await db.getWithdrawals(req.user.id);
    const allProducts = await db.getProducts().catch(() => []);

    const userBal = parseFloat((user && user.balance) || 0);
    const isUserInDeficit = userBal < 0;
    const userDeficitAmt = isUserInDeficit ? Math.abs(userBal) : 0;

    // Today's date in YYYY-MM-DD
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const formattedTasks = userTasks.map(t => {
      let prodImage = t.product_image;
      if (!prodImage || prodImage.includes('undefined') || String(prodImage).trim() === '') {
        const match = allProducts.find(p => p.name && t.product_name && (p.name.toLowerCase().includes(t.product_name.substring(0, 15).toLowerCase()) || t.product_name.toLowerCase().includes(p.name.substring(0, 15).toLowerCase())));
        prodImage = (match && match.image) ? match.image : 'client/assets/uploads/products/outdoor_shed.jpg';
      }
      if (!prodImage.startsWith('/') && !prodImage.startsWith('http')) {
        prodImage = '/' + prodImage;
      }

      const price = parseFloat(t.product_price || 0);
      let comm = parseFloat(t.commission_amount !== undefined && t.commission_amount !== null ? t.commission_amount : (t.commission_earned || 0));
      if (!comm || comm <= 0) {
        const rate = parseFloat(t.commission_rate || 0.20);
        comm = parseFloat((price * rate).toFixed(2));
      }

      // Check task deficit status
      const isDeficitTask = Boolean(t.is_deficit || (t.deficit_amount && parseFloat(t.deficit_amount) > 0) || (t.status === 'pending' && isUserInDeficit));
      let deficitVal = parseFloat(t.deficit_amount || 0);
      if (deficitVal <= 0 && t.status === 'pending' && isUserInDeficit) {
        deficitVal = userDeficitAmt;
      }

      // Calculate if completed today
      const createdDateStr = t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : '';
      const completedDateStr = t.completed_at ? new Date(t.completed_at).toISOString().slice(0, 10) : createdDateStr;
      const tStatus = String(t.status || '').toLowerCase().trim();
      const isCompleted = tStatus === 'completed' || tStatus === 'approved' || tStatus === 'complete' || tStatus === 'done';
      const isCompletedToday = isCompleted && (completedDateStr === todayStr);

      return {
        id: t.id,
        order_number: t.order_number || (String(t.id).startsWith('TSK') ? t.id : `ORD-${t.id}`),
        type: 'task',
        title: t.product_name,
        product_name: t.product_name,
        product_image: prodImage,
        product_price: price.toFixed(2),
        total_amount: price.toFixed(2),
        commission_amount: comm.toFixed(2),
        commission_earned: comm.toFixed(2),
        profit: comm.toFixed(2),
        order_num: t.order_num || 1,
        is_deficit: isDeficitTask ? 1 : 0,
        deficit_amount: deficitVal.toFixed(2),
        amount: `+$${comm.toFixed(2)}`,
        status: isCompleted ? 'completed' : 'pending',
        created_at: t.created_at,
        completed_at: t.completed_at || (isCompleted ? t.created_at : null),
        is_completed_today: isCompletedToday,
        completed_date: completedDateStr
      };
    });

    // Also include any standalone orders from orders table that don't already exist in tasks
    const existingTaskIds = new Set(formattedTasks.map(t => String(t.id)));
    const existingOrderNums = new Set(formattedTasks.map(t => String(t.order_number)));

    for (const o of userOrders) {
      if (!existingTaskIds.has(String(o.task_id)) && !existingOrderNums.has(String(o.order_number))) {
        const price = parseFloat(o.gross_amount || o.unit_price || 0);
        const comm = parseFloat(o.commission_amount || 0);
        const oStatus = String(o.order_status || '').toLowerCase().trim();
        const isComp = oStatus === 'completed' || oStatus === 'approved' || oStatus === 'complete' || oStatus === 'done';
        const ordCreatedStr = o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : '';
        const ordCompStr = o.completed_at ? new Date(o.completed_at).toISOString().slice(0, 10) : ordCreatedStr;
        const isCompToday = isComp && (ordCompStr === todayStr);

        formattedTasks.push({
          id: o.task_id || o.id,
          order_number: o.order_number,
          type: 'order',
          title: o.product_name,
          product_name: o.product_name,
          product_image: o.product_image || '/client/assets/uploads/products/outdoor_shed.jpg',
          product_price: price.toFixed(2),
          total_amount: price.toFixed(2),
          commission_amount: comm.toFixed(2),
          commission_earned: comm.toFixed(2),
          profit: comm.toFixed(2),
          order_num: 1,
          is_deficit: (o.payment_status === 'SHORTFALL' || isUserInDeficit) ? 1 : 0,
          deficit_amount: isUserInDeficit ? userDeficitAmt.toFixed(2) : '0.00',
          amount: `+$${comm.toFixed(2)}`,
          status: isComp ? 'completed' : 'pending',
          created_at: o.created_at,
          completed_at: o.completed_at,
          is_completed_today: isCompToday,
          completed_date: ordCompStr
        });
      }
    }

    // Sort newest first
    formattedTasks.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const pendingTasks = formattedTasks.filter(t => t.status === 'pending');
    const todayCompletedTasks = formattedTasks.filter(t => t.status === 'completed' && t.is_completed_today);
    const allCompletedTasks = formattedTasks.filter(t => t.status === 'completed');

    res.json({
      success: true,
      all_tasks: formattedTasks,
      pending_tasks: pendingTasks,
      today_completed_tasks: todayCompletedTasks,
      all_completed_tasks: allCompletedTasks,
      tasks: formattedTasks,
      user: {
        id: (user && user.id) || req.user.id,
        balance: userBal.toFixed(2),
        frozen_balance: parseFloat((user && user.frozen_balance) || 0).toFixed(2),
        today_profit: parseFloat((user && user.today_profit) || 0).toFixed(2),
        today_tasks_completed: (user && user.today_tasks_completed) || 0,
        is_deficit: isUserInDeficit,
        deficit_amount: userDeficitAmt.toFixed(2)
      },
      today_date: todayStr,
      deposits: userDeposits,
      withdrawals: userWithdrawals
    });
  } catch (err) {
    console.error('Records fetch error:', err);
    res.status(500).json({ success: false, message: 'Error fetching records' });
  }
});

module.exports = router;
