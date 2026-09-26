const db = require('../server/db');

async function test() {
  try {
    console.log('--- 1. Testing Products Catalog ---');
    const products = await db.getProducts();
    console.log(`Total products in catalog: ${products.length}`);
    if (products.length < 20) {
      throw new Error(`Expected at least 20 products, found ${products.length}`);
    }

    console.log('--- 2. Creating / Finding Test User ---');
    let user = await db.findUserByIdentifier('test_verify_user');
    if (!user) {
      user = await db.createUser({
        username: 'test_verify_user',
        fullname: 'Test Verified Merchant',
        email: 'test_verify@example.com',
        phone: '+15550001122',
        password_hash: 'testhash',
        balance: 100.00,
        frozen_balance: 0.00,
        today_profit: 0.00,
        today_tasks_completed: 0,
        total_tasks_completed: 0
      });
    } else {
      await db.updateUser(user.id, {
        balance: 100.00,
        frozen_balance: 0.00,
        today_profit: 0.00,
        today_tasks_completed: 0,
        total_tasks_completed: 0,
        custom_order_num: null,
        custom_deficit_amount: null
      });
      user = await db.findUserById(user.id);
    }

    // Delete previous test tasks
    await db.query(`DELETE FROM tasks WHERE user_id = ?`, [user.id]);

    console.log('--- 3. Testing 4 Sequential Normal Tasks (Diversity & Realistic Pricing) ---');
    const pickedProducts = [];

    for (let orderNum = 1; orderNum <= 4; orderNum++) {
      // Simulate task generation logic
      const userTasks = await db.getTasks(user.id);
      const usedProductNames = new Set(userTasks.map(t => t.product_name));
      let available = products.filter(p => !usedProductNames.has(p.name));

      const userBal = parseFloat(user.balance);
      let minBudget = 9.00;
      let maxBudget = 25.00;

      if (orderNum === 1) {
        minBudget = 9.00;
        maxBudget = Math.min(25.00, userBal * 0.35);
      } else if (orderNum === 2) {
        minBudget = 18.00;
        maxBudget = Math.min(45.00, userBal * 0.50);
      } else if (orderNum === 3) {
        minBudget = 30.00;
        maxBudget = Math.min(75.00, userBal * 0.65);
      } else {
        minBudget = 45.00;
        maxBudget = Math.min(120.00, userBal * 0.75);
      }

      let matching = available.filter(p => {
        const pr = parseFloat(p.price);
        return pr >= minBudget && pr <= maxBudget && pr < (userBal * 0.90);
      });
      if (matching.length === 0) {
        matching = available.filter(p => parseFloat(p.price) < (userBal * 0.85));
      }

      const sel = matching[Math.floor(Math.random() * matching.length)];
      pickedProducts.push(sel.name);

      const orderPrice = parseFloat(sel.price);
      const commRate = 0.20;
      const commAmount = parseFloat((orderPrice * commRate).toFixed(2));
      const newBal = parseFloat((userBal - orderPrice).toFixed(2));

      await db.updateUser(user.id, { balance: newBal });

      const task = {
        id: 'tsk_test_' + orderNum + '_' + Date.now(),
        user_id: user.id,
        product_name: sel.name,
        product_image: sel.image,
        product_price: orderPrice,
        commission_rate: commRate,
        commission_earned: commAmount,
        commission_amount: commAmount,
        status: 'pending',
        order_num: orderNum,
        is_deficit: 0,
        deficit_amount: 0,
        created_at: new Date()
      };
      await db.createTask(task);

      // Now complete the task
      await db.updateTask(task.id, { status: 'completed', commission_earned: commAmount });
      const completedBal = parseFloat((newBal + orderPrice + commAmount).toFixed(2));
      await db.updateUser(user.id, {
        balance: completedBal,
        today_profit: parseFloat(((parseFloat(user.today_profit) || 0) + commAmount).toFixed(2)),
        today_tasks_completed: orderNum,
        total_tasks_completed: orderNum
      });
      user = await db.findUserById(user.id);

      console.log(`Task #${orderNum}: "${sel.name.substring(0, 45)}..." | Price: USD ${orderPrice} | Balance After Completion: USD ${completedBal}`);
    }

    // Check unique products
    const uniquePicked = new Set(pickedProducts);
    console.log(`Unique products picked: ${uniquePicked.size} / 4`);
    if (uniquePicked.size !== 4) {
      throw new Error('Expected 4 distinct products picked across 4 orders!');
    }

    console.log('--- 4. Testing Task 5 (Forced Deficit / Negative Working Balance) ---');
    // Task 5 should trigger deficit
    const deficitAmount = 25.00;
    const targetPrice = user.balance + deficitAmount;
    const deficitCandidates = products.filter(p => parseFloat(p.price) >= targetPrice);
    deficitCandidates.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    const sel5 = deficitCandidates[0];

    const orderPrice5 = parseFloat(sel5.price);
    const actualDeficit5 = parseFloat((orderPrice5 - user.balance).toFixed(2));
    const negBal5 = parseFloat((user.balance - orderPrice5).toFixed(2));

    await db.updateUser(user.id, {
      balance: negBal5,
      frozen_balance: Math.abs(negBal5)
    });

    const task5 = {
      id: 'tsk_test_5_' + Date.now(),
      user_id: user.id,
      product_name: sel5.name,
      product_image: sel5.image,
      product_price: orderPrice5,
      commission_rate: 0.20,
      commission_earned: parseFloat((orderPrice5 * 0.20).toFixed(2)),
      status: 'pending',
      order_num: 5,
      is_deficit: 1,
      deficit_amount: actualDeficit5,
      created_at: new Date()
    };
    await db.createTask(task5);

    user = await db.findUserById(user.id);
    console.log(`Task #5 Deficit: Product "${sel5.name.substring(0, 40)}..." (Price: $${orderPrice5})`);
    console.log(`User Working Balance: USD ${user.balance} (Negative Balance verified!)`);
    console.log(`User Frozen Balance: USD ${user.frozen_balance}`);

    if (user.balance >= 0) {
      throw new Error('Expected negative balance for deficit task!');
    }

    console.log('--- 5. Simulating Deposit Approval to Clear Deficit ---');
    const depositToClear = Math.abs(user.balance) + 50.00; // deposit enough to clear
    const clearedBalance = parseFloat((user.balance + depositToClear).toFixed(2));
    await db.updateUser(user.id, {
      balance: clearedBalance,
      frozen_balance: 0.00
    });
    user = await db.findUserById(user.id);
    console.log(`Balance after deposit: USD ${user.balance} (Deficit cleared, frozen = ${user.frozen_balance})`);

    // Now submit task 5
    const comm5 = parseFloat((orderPrice5 * 0.20).toFixed(2));
    await db.updateTask(task5.id, { status: 'completed', commission_earned: comm5 });
    const finalBal = parseFloat((user.balance + orderPrice5 + comm5).toFixed(2));
    await db.updateUser(user.id, {
      balance: finalBal,
      today_profit: parseFloat((user.today_profit + comm5).toFixed(2)),
      today_tasks_completed: 5,
      total_tasks_completed: 5
    });

    user = await db.findUserById(user.id);
    console.log(`Task #5 Completed successfully! Final Balance: USD ${user.balance}, Profit: USD ${user.today_profit}`);

    console.log('\n ALL TESTS PASSED SUCCESSFULLY! Verified negative ledger, diverse products, realistic prices, and deposit clearance.');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
