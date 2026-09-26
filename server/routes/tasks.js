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

  if (lastReset !== today) {
    // DEFICIT GUARD: Check balance AND pending deficit tasks/orders
    // Even if balance is positive (e.g. after a deposit), if there are
    // unfinished deficit tasks or SHORTFALL orders, do NOT reset.
    const userBalance = parseFloat(user.balance || 0);
    let hasActiveDeficit = userBalance < 0;

    if (!hasActiveDeficit) {
      // Check for pending tasks that are deficit orders
      const pendingDeficitTasks = await db.query(
        'SELECT COUNT(*) as cnt FROM tasks WHERE user_id = ? AND status = "pending" AND is_deficit = 1',
        [user.id]
      ).catch(() => [{ cnt: 0 }]);
      if (pendingDeficitTasks && pendingDeficitTasks[0] && parseInt(pendingDeficitTasks[0].cnt, 10) > 0) {
        hasActiveDeficit = true;
      }
    }

    if (!hasActiveDeficit) {
      // Check for any SHORTFALL orders still in PROCESSING state
      const shortfallOrders = await db.query(
        'SELECT COUNT(*) as cnt FROM orders WHERE user_id = ? AND payment_status = "SHORTFALL" AND order_status = "PROCESSING"',
        [user.id]
      ).catch(() => [{ cnt: 0 }]);
      if (shortfallOrders && shortfallOrders[0] && parseInt(shortfallOrders[0].cnt, 10) > 0) {
        hasActiveDeficit = true;
      }
    }

    if (!hasActiveDeficit) {
      // Also check for ANY pending task (deficit or normal) — don't reset mid-cycle
      const anyPendingTasks = await db.query(
        'SELECT COUNT(*) as cnt FROM tasks WHERE user_id = ? AND status = "pending"',
        [user.id]
      ).catch(() => [{ cnt: 0 }]);
      if (anyPendingTasks && anyPendingTasks[0] && parseInt(anyPendingTasks[0].cnt, 10) > 0) {
        hasActiveDeficit = true;
      }
    }

    if (!hasActiveDeficit) {
      // Safe to reset daily stats
      await db.updateUser(user.id, {
        today_tasks_completed: 0,
        today_profit: 0.00,
        current_set: 0,
        commission_balance: 0.00,
        last_reset_date: today
      }).catch(() => {});
      return await db.findUserById(user.id);
    }
    // Deficit active: do NOT reset, but update last_reset_date so we don't re-check every request
    // Actually do NOT update last_reset_date — we want to keep checking until deficit is cleared
  }
  return user;
}

// GET /api/tasks/status - Get current user task statistics
router.get('/status', authMiddleware, async (req, res) => {
  let user = await db.findUserById(req.user.id);
  user = await autoResetIfNewDay(user);

  const settings = await db.getSettings();
  const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.20, max_tasks: 5 };
  // Admin-set custom daily limit or sequence plan takes priority over default
  let maxTasks = (user.custom_daily_limit && user.custom_daily_limit > 0)
    ? user.custom_daily_limit
    : ((user.task_sequence_plan && user.task_sequence_plan.total_orders)
      ? user.task_sequence_plan.total_orders
      : 5);

  // If admin pushed orders to this user, expand maxTasks so progress bars and limits reflect assigned quantity
  const pendingAssignedOrders = await db.query('SELECT COUNT(*) as cnt FROM orders WHERE user_id = ? AND order_status = "ASSIGNED"', [user.id]).catch(() => [{ cnt: 0 }]);
  const assignedCnt = (pendingAssignedOrders && pendingAssignedOrders[0] && parseInt(pendingAssignedOrders[0].cnt, 10)) || 0;
  if (assignedCnt > 0) {
    maxTasks = Math.max(maxTasks, (parseInt(user.today_tasks_completed || 0, 10) || 0) + assignedCnt);
  }

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

  let currentTodayProfit = parseFloat(user.today_profit || 0);
  let currentTasksCompleted = parseInt(user.today_tasks_completed || 0, 10);

  // Self-heal if user.today_profit was prematurely zeroed out by previous date bug
  // Only heal upward if the computed value reflects tasks AFTER the last reset
  if (computedProfit > currentTodayProfit) {
    currentTodayProfit = round(computedProfit);
    await db.updateUser(user.id, { today_profit: currentTodayProfit }).catch(() => {});
  }
  if (todaysCompletedTasks.length > currentTasksCompleted) {
    currentTasksCompleted = todaysCompletedTasks.length;
    await db.updateUser(user.id, { today_tasks_completed: currentTasksCompleted }).catch(() => {});
  }

  // Self-heal commission_balance if 0 but user has completed tasks
  let currentCommBalance = parseFloat(user.commission_balance || 0);
  if (currentCommBalance === 0 && todaysCompletedTasks.length > 0) {
    const computedComm = todaysCompletedTasks.reduce((sum, t) => {
      const p = parseFloat(t.product_price || 0);
      const c = parseFloat(t.commission_earned || t.commission_amount || 0);
      return sum + p + c;
    }, 0);
    if (computedComm > 0) {
      currentCommBalance = round(computedComm);
      await db.updateUser(user.id, { commission_balance: currentCommBalance }).catch(() => {});
    }
  }

  // Find any active pending task for this user
  const pendingTask = (userTasks || []).find(t => t.status === 'pending');

  res.json({
    success: true,
    data: {
      balance: user.balance,
      frozen_balance: user.frozen_balance,
      commission_balance: currentCommBalance,
      today_profit: currentTodayProfit,
      today_tasks_completed: currentTasksCompleted,
      current_set: user.current_set || 0,
      max_tasks: maxTasks,
      has_assigned_push_order: assignedCnt > 0,
      assigned_count: assignedCnt,
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
    const vipRate = (settings.vip_rates && settings.vip_rates[user.vip_level]) || { commission: 0.20, max_tasks: 5 };
    let maxTasks = (user.custom_daily_limit && user.custom_daily_limit > 0)
      ? user.custom_daily_limit
      : ((user.task_sequence_plan && user.task_sequence_plan.total_orders)
        ? user.task_sequence_plan.total_orders
        : 5);

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

    // Check if there are admin pushed assigned orders or custom order overrides
    const assignedOrdersQueue = await db.query('SELECT * FROM orders WHERE user_id = ? AND order_status = "ASSIGNED" ORDER BY created_at ASC', [user.id]).catch(() => []);
    const assignedCnt = (assignedOrdersQueue && assignedOrdersQueue.length) || 0;
    if (assignedCnt > 0) {
      maxTasks = Math.max(maxTasks, (parseInt(user.today_tasks_completed || 0, 10) || 0) + assignedCnt);
    }
    const hasPushedOrders = (assignedCnt > 0) || (user.custom_order_num && user.custom_order_num > effectiveCompleted);

    // Disabled / Restricted user check
    if (user.status === 'disabled' || user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently disabled from starting tasks. Please contact customer support.'
      });
    }

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

    if (!hasPushedOrders && effectiveCompleted >= maxTasks) {
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

    // ALSO check orders table for SHORTFALL orders that may not have a task record
    // (e.g. if task was deleted by admin reset but the deficit order remains)
    const pendingShortfallOrders = await db.query(
      'SELECT * FROM orders WHERE user_id = ? AND payment_status = "SHORTFALL" AND order_status IN ("PROCESSING", "ASSIGNED") ORDER BY created_at ASC LIMIT 1',
      [user.id]
    ).catch(() => []);
    if (pendingShortfallOrders && pendingShortfallOrders.length > 0) {
      const sfo = pendingShortfallOrders[0];
      const sfoPrice = parseFloat(sfo.gross_amount || sfo.unit_price || 0);
      const sfoComm = parseFloat(sfo.commission_amount || 0);
      // Re-create the pending task record from the order so user sees it
      const sfoTaskId = sfo.task_id || generateTaskNumber();
      const sfoTask = {
        id: sfoTaskId,
        order_number: sfo.order_number,
        user_id: user.id,
        product_name: sfo.product_name,
        product_image: sfo.product_image || 'client/assets/uploads/products/outdoor_shed.jpg',
        product_price: sfoPrice,
        commission_rate: parseFloat(sfo.commission_rate || 0.20),
        commission_amount: sfoComm,
        commission_earned: sfoComm,
        status: 'pending',
        order_num: (parseInt(user.today_tasks_completed, 10) || 0) + 1,
        is_deficit: 1,
        deficit_amount: Math.abs(parseFloat(user.balance || 0)),
        created_at: sfo.created_at || new Date()
      };
      await db.createTask(sfoTask).catch(() => {});
      await db.updateOrder(sfo.id, { task_id: sfoTaskId, order_status: 'PROCESSING' }).catch(() => {});
      return res.json({
        success: true,
        task: {
          ...sfoTask,
          product_price: sfoPrice,
          commission_amount: sfoComm,
          commission_rate: parseFloat(sfo.commission_rate || 0.20)
        },
        is_existing: true,
        message: 'You have a pending deficit order that must be completed first.'
      });
    }

    // PRIORITY 1: IF ADMIN PUSHED AN ASSIGNED ORDER, GENERATE IT IMMEDIATELY
    if (assignedOrdersQueue && assignedOrdersQueue.length > 0) {
      const ao = assignedOrdersQueue[0];
      const orderPrice = parseFloat(ao.gross_amount || ao.unit_price || 0);
      const commAmount = parseFloat(ao.commission_amount || 0);
      const commRate = parseFloat(ao.commission_rate || 0.20);
      const isDeficit = Boolean(ao.payment_status === 'SHORTFALL' || orderPrice > parseFloat(user.balance || 0) || parseFloat(user.balance || 0) < 0);
      const taskId = ao.task_id || generateTaskNumber();

      const currentBalance = round(user.balance);
      let newBalance = currentBalance;
      let deficitVal = 0;

      if (isDeficit) {
        newBalance = round(currentBalance - orderPrice);
        deficitVal = round(Math.abs(newBalance));
        await db.updateUser(user.id, {
          balance: newBalance,
          frozen_balance: deficitVal
        });
      }

      // Create the pending task record with exact pushed order details
      const pushTask = {
        id: taskId,
        order_number: ao.order_number,
        user_id: user.id,
        product_name: ao.product_name,
        product_image: ao.product_image || 'client/assets/uploads/products/outdoor_shed.jpg',
        product_price: orderPrice,
        commission_rate: commRate,
        commission_amount: commAmount,
        commission_earned: commAmount,
        status: 'pending',
        order_num: (parseInt(user.today_tasks_completed, 10) || 0) + 1,
        is_deficit: isDeficit ? 1 : 0,
        deficit_amount: deficitVal,
        created_at: new Date()
      };
      await db.createTask(pushTask);

      // Update the order in orders table to PROCESSING
      await db.updateOrder(ao.id, {
        task_id: taskId,
        order_status: 'PROCESSING',
        payment_status: isDeficit ? 'SHORTFALL' : 'PAID'
      }).catch(() => {});

      if (isDeficit) {
        // Record ledger entry
        await db.createLedgerTransaction({
          userId: user.id,
          orderId: ao.id,
          taskId: taskId,
          adminId: null,
          type: 'ORDER_RESERVE',
          amount: -orderPrice,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          currency: 'USD',
          reference: ao.order_number || taskId,
          description: `Deficit order reserve deduction for pushed order: ${ao.product_name}`
        }).catch(() => {});
      }

      return res.json({
        success: true,
        message: 'Order matched successfully!',
        task: pushTask,
        new_balance: newBalance,
        deficit_amount: deficitVal,
        is_deficit: isDeficit
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

    // Deduct order price / gross amount from user's working balance ONLY IF DEFICIT
    // For normal orders: deduction happens upon submission so cancelling does NOT touch balance
    const currentBalance = round(user.balance);
    let newBalance = currentBalance;
    if (calc.is_deficit) {
      newBalance = round(currentBalance - calc.gross_amount);
      const userUpdates = { balance: newBalance };
      if (newBalance < 0) {
        userUpdates.frozen_balance = round(Math.abs(newBalance));
      }
      await db.updateUser(user.id, userUpdates);
    }

    // Check if there is an ASSIGNED order already queued for this user by admin push
    const assignedOrders = await db.query('SELECT * FROM orders WHERE user_id = ? AND order_status = "ASSIGNED" ORDER BY created_at DESC LIMIT 1', [user.id]).catch(() => []);
    let activeOrderId = orderId;
    let activeOrderNum = orderNumber;
    if (assignedOrders && assignedOrders.length > 0) {
      const ao = assignedOrders[0];
      activeOrderId = ao.id;
      activeOrderNum = ao.order_number;
      await db.query(`
        UPDATE orders SET 
          task_id = ?, 
          product_name = ?, 
          product_image = ?, 
          gross_amount = ?, 
          commission_amount = ?, 
          payment_status = ?, 
          order_status = "PROCESSING" 
        WHERE id = ?
      `, [taskId, productName, productImage, calc.gross_amount, calc.commission_amount, calc.is_deficit ? 'SHORTFALL' : 'PAID', ao.id]).catch(() => {});
    } else {
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
    }

    if (calc.is_deficit) {
      // Record Ledger Entry: ORDER_RESERVE for deficit orders
      await db.createLedgerTransaction({
        userId: user.id,
        orderId: activeOrderId,
        taskId: taskId,
        adminId: null,
        type: 'ORDER_RESERVE',
        amount: -calc.gross_amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        currency: 'USD',
        reference: activeOrderNum,
        description: `Order reserve deficit deduction for ${productName}`
      }).catch(() => {});
    }

    // Create Task Record
    const task = {
      id: taskId,
      order_number: activeOrderNum,
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
    let task = tasks.find(t => String(t.id) === String(taskId) || String(t.order_number) === String(taskId));

    if (!task) {
      // Check if taskId matches an order in orders table (e.g. pushed by admin)
      const userOrders = await db.getOrders({ user_id: user.id }).catch(() => []);
      const matchedOrder = userOrders.find(o => String(o.id) === String(taskId) || String(o.order_number) === String(taskId) || String(o.task_id) === String(taskId));
      if (matchedOrder) {
        const commAmt = parseFloat(matchedOrder.commission_amount || 0);
        const price = parseFloat(matchedOrder.gross_amount || matchedOrder.unit_price || 0);
        const curBal = parseFloat(user.balance || 0);
        const isDeficit = matchedOrder.payment_status === 'SHORTFALL' || (price > curBal) || (curBal < 0);
        const generatedTaskId = matchedOrder.task_id || ('TSK-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900));

        let defVal = 0;
        if (isDeficit) {
          if (curBal >= 0 && price > curBal) {
            const newBal = round(curBal - price);
            defVal = round(Math.abs(newBal));
            await db.updateUser(user.id, {
              balance: newBal,
              frozen_balance: defVal
            });
            user.balance = newBal;
            user.frozen_balance = defVal;
          } else {
            defVal = round(Math.abs(curBal));
          }
        }

        task = {
          id: generatedTaskId,
          order_number: matchedOrder.order_number,
          user_id: user.id,
          product_name: matchedOrder.product_name,
          product_image: matchedOrder.product_image || 'client/assets/uploads/products/outdoor_shed.jpg',
          product_price: price,
          commission_rate: matchedOrder.commission_rate || 0.20,
          commission_amount: commAmt,
          commission_earned: commAmt,
          status: 'pending',
          order_num: (user.today_tasks_completed || 0) + 1,
          is_deficit: isDeficit ? 1 : 0,
          deficit_amount: defVal,
          created_at: matchedOrder.created_at || new Date()
        };
        await db.createTask(task).catch(() => {});
        await db.updateOrder(matchedOrder.id, {
          task_id: task.id,
          order_status: 'PROCESSING',
          payment_status: isDeficit ? 'SHORTFALL' : 'PAID'
        }).catch(() => {});
      }
    }

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
        message: 'Your account balance is currently in deficit. Please clear the shortfall to complete this order.',
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
    // Order amount was deducted from working balance at task match.
    // At task submit:
    // - Working balance remains at current level (unspent amount).
    // - Total Balance with Commission (commission_balance) accumulates: previous commission_balance + taskPrice + commAmount.
    // - Today's profit accumulates: previous today_profit + commAmount.
    let prevCommBalance = parseFloat(user.commission_balance || 0);
    if (prevCommBalance === 0) {
      const todayStr = toDateString(new Date());
      const resetCutoff = user.tasks_reset_at ? new Date(user.tasks_reset_at) : null;
      const priorCompleted = (tasks || []).filter(t => {
        if (t.status !== 'completed' || String(t.id) === String(task.id)) return false;
        const taskDate = toDateString(t.completed_at || t.created_at);
        if (taskDate !== todayStr) return false;
        if (resetCutoff && new Date(t.completed_at || t.created_at) < resetCutoff) return false;
        return true;
      });
      const priorSum = priorCompleted.reduce((sum, t) => {
        const p = parseFloat(t.product_price || 0);
        const c = parseFloat(t.commission_earned || t.commission_amount || 0);
        return sum + p + c;
      }, 0);
      prevCommBalance = round(priorSum);
    }
    let finalWorkingBalance = round(userBalance);
    if (!task.is_deficit) {
      if (userBalance < taskPrice) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient working balance to complete this order.'
        });
      }
      finalWorkingBalance = round(userBalance - taskPrice);
      // Record Ledger Entry: ORDER_RESERVE for normal task upon submission
      await db.createLedgerTransaction({
        userId: user.id,
        taskId: task.id,
        adminId: null,
        type: 'ORDER_RESERVE',
        amount: -taskPrice,
        balanceBefore: round(userBalance),
        balanceAfter: finalWorkingBalance,
        currency: 'USD',
        reference: task.order_number || task.id,
        description: `Order deduction upon submission for ${task.product_name}`
      }).catch(() => {});
    }

    const newCommBalance = round(prevCommBalance + taskPrice + commAmount);
    const newTodayProfit = round((parseFloat(user.today_profit) || 0) + commAmount);
    const newCompletedTasks = (parseInt(user.today_tasks_completed, 10) || 0) + 1;
    const newTotalTasks = (parseInt(user.total_tasks_completed, 10) || 0) + 1;

    // Record Ledger Entry: REWARD (commission earned)
    await db.createLedgerTransaction({
      userId: user.id,
      taskId: task.id,
      adminId: null,
      type: 'REWARD',
      amount: commAmount,
      balanceBefore: finalWorkingBalance,
      balanceAfter: finalWorkingBalance,
      currency: 'USD',
      reference: task.order_number || task.id,
      description: `Optimization reward for order: ${task.product_name}`
    });

    const updates = {
      balance: finalWorkingBalance,
      commission_balance: newCommBalance,
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
      message: `Optimization successful! +$${commAmount.toFixed(2)} credited to your account.`,
      data: {
        balance: finalWorkingBalance,
        commission_balance: newCommBalance,
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

// POST /api/tasks/cancel - Cancel an unsubmitted normal task
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { taskId } = req.body;
    const tasks = await db.getTasks(user.id);
    const task = taskId
      ? tasks.find(t => String(t.id) === String(taskId) && t.status === 'pending')
      : tasks.find(t => t.status === 'pending');

    if (!task) {
      return res.status(404).json({ success: false, message: 'No pending order found to cancel.' });
    }

    if (task.is_deficit) {
      return res.status(400).json({
        success: false,
        message: 'Deficit orders cannot be cancelled. Please clear the shortfall to proceed.'
      });
    }

    // Delete the pending task so user can start fresh
    await db.deleteTask(task.id).catch(async () => {
      await db.updateTask(task.id, { status: 'cancelled' });
    });

    // Mark order as CANCELLED in orders table
    if (task.order_number) {
      await db.updateOrder(task.order_number, {
        order_status: 'CANCELLED',
        payment_status: 'CANCELLED'
      }).catch(() => {});
    }

    // Ensure user balance is intact (it was not deducted for normal task)
    const refreshedUser = await db.findUserById(user.id);

    return res.json({
      success: true,
      message: 'Order cancelled. Your working balance is unaffected.',
      data: {
        balance: refreshedUser.balance,
        today_profit: refreshedUser.today_profit,
        commission_balance: refreshedUser.commission_balance
      }
    });
  } catch (err) {
    console.error('Task Cancel Error:', err);
    res.status(500).json({ success: false, message: 'Error cancelling order: ' + err.message });
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
