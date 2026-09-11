const db = require('../server/db');

async function main() {
  const users = await db.getUsers();
  const testUsers = users.filter(u => u.username && ['testing1', 'haider', 'testuser'].includes(u.username.toLowerCase()));
  
  if (testUsers.length === 0) {
    console.log('No matching test users found.');
    process.exit(0);
  }

  const authenticOrders = [
    {
      product_name: 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)',
      product_price: 3674.00,
      commission_rate: 0.20,
      commission_earned: 4408.80,
      status: 'completed',
      product_image: 'client/assets/uploads/products/outdoor_shed.jpg',
      created_at: '2026-08-19 03:50:00',
      order_num: 1
    },
    {
      product_name: 'Bulk 15000 PCS Foam Glow Sticks with 3 Modes Colorful Flashing, Glow in Dark Party Supplies, for Wedding, Raves, Concert, Halloween,',
      product_price: 1856.00,
      commission_rate: 0.20,
      commission_earned: 2227.20,
      status: 'completed',
      product_image: 'client/assets/uploads/products/glow_sticks.jpg',
      created_at: '2026-08-19 02:57:00',
      order_num: 2
    },
    {
      product_name: 'Garment Bags for Travel, Convertible Carry on Garment Bag with Shoe Compartment, SOLOSAIC Garment Duffle Bags for Travel for Men Women, 2 in 1 Hanging Dress Suitcase Suit Bag with Toiletry Bag, Black',
      product_price: 11.00,
      commission_rate: 0.22,
      commission_earned: 2.42,
      status: 'completed',
      product_image: 'client/assets/uploads/products/garment_bag.jpg',
      created_at: '2026-08-19 00:37:00',
      order_num: 3
    },
    {
      product_name: 'DAIMOND PRODUCT 1',
      product_price: 9.00,
      commission_rate: 0.22,
      commission_earned: 1.98,
      status: 'completed',
      product_image: 'client/assets/uploads/products/daimond_product_1.jpg',
      created_at: '2026-08-19 00:37:00',
      order_num: 4
    }
  ];

  for (const user of testUsers) {
    console.log(`Seeding authentic orders for user ${user.username} (${user.id})...`);
    // Delete any old generic tasks for this user
    await db.query('DELETE FROM tasks WHERE user_id = ?', [user.id]);
    
    for (let i = 0; i < authenticOrders.length; i++) {
      const ord = authenticOrders[i];
      const taskId = `tsk_${user.id}_auth_${i + 1}`;
      await db.query(
        `INSERT INTO tasks (id, user_id, product_name, product_price, commission_rate, commission_earned, status, created_at, product_image, order_num, is_deficit, deficit_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [taskId, user.id, ord.product_name, ord.product_price, ord.commission_rate, ord.commission_earned, ord.status, ord.created_at, ord.product_image, ord.order_num]
      );
    }
    console.log(`Successfully seeded ${authenticOrders.length} authentic orders for user ${user.username}.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
