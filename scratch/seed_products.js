const db = require('d:/Ads Merchants Asia/server/db');

const products = [
  // Tier 1: Budget / Everyday Accessories ($9 - $25)
  {
    name: 'Stanley Quencher Reusable Straw Replacement Pack, BPA-Free Tritan (4-Pack)',
    price: 9.99,
    image: 'client/assets/uploads/products/stanley_straws.jpg'
  },
  {
    name: 'Logitech M185 Wireless Compact Mouse with Nano USB Receiver, 2.4GHz, Grey',
    price: 12.99,
    image: 'client/assets/uploads/products/logitech_mouse.jpg'
  },
  {
    name: 'Anker Powerline III USB-C to USB-C 100W Fast Charging Cable 6ft (2-Pack)',
    price: 14.99,
    image: 'client/assets/uploads/products/anker_cable.jpg'
  },
  {
    name: 'CeraVe Daily Moisturizing Lotion with Hyaluronic Acid for Normal to Dry Skin 16oz',
    price: 15.99,
    image: 'client/assets/uploads/products/cerave_lotion.jpg'
  },
  {
    name: 'Ringke Onyx Heavy Duty Shockproof Matte Finish Protective Case for Smartphones',
    price: 16.99,
    image: 'client/assets/uploads/products/ringke_case.jpg'
  },
  {
    name: 'SanDisk 128GB Extreme PRO MicroSDXC UHS-I Memory Card with Adapter up to 200MB/s',
    price: 18.99,
    image: 'client/assets/uploads/products/sandisk_card.jpg'
  },
  {
    name: 'L\'Oreal Paris Revitalift 1.5% Pure Hyaluronic Acid Face Serum for Anti-Aging 1 fl oz',
    price: 21.99,
    image: 'client/assets/uploads/products/loreal_serum.jpg'
  },
  {
    name: 'Anker Nano 30W USB-C GaN Fast Charger, Compact Foldable Plug for Phones & Tablets',
    price: 22.99,
    image: 'client/assets/uploads/products/anker_charger.jpg'
  },
  {
    name: 'Contigo West Loop Stainless Steel Vacuum-Insulated Autoseal Travel Mug 20oz, Matte Black',
    price: 23.99,
    image: 'client/assets/uploads/products/contigo_mug.jpg'
  },
  {
    name: 'Echo Pop Compact Smart Speaker with Full Sound and Alexa Built-in, Charcoal',
    price: 24.99,
    image: 'client/assets/uploads/products/echo_pop.jpg'
  },

  // Tier 2: Mid Range Home, Audio & Tools ($30 - $79)
  {
    name: 'JBL GO 4 Ultra-Portable Waterproof and Dustproof Bluetooth Speaker, Black',
    price: 39.95,
    image: 'client/assets/uploads/products/jbl_speaker.jpg'
  },
  {
    name: 'Stanley Quencher H2.0 FlowState Stainless Steel Tumbler 40oz with Handle & Straw',
    price: 45.00,
    image: 'client/assets/uploads/products/stanley_tumbler.jpg'
  },
  {
    name: 'Amazon Fire TV Stick 4K Streaming Media Player with Alexa Voice Remote (Latest Gen)',
    price: 49.99,
    image: 'client/assets/uploads/products/firestick_4k.jpg'
  },
  {
    name: 'BLACK+DECKER 20V MAX Cordless Drill and Driver Kit with 30-Piece Accessory Set',
    price: 49.99,
    image: 'client/assets/uploads/products/blackdecker_drill.jpg'
  },
  {
    name: 'Oral-B Pro 1000 CrossAction Electric Rechargeable Toothbrush with Pressure Sensor',
    price: 49.99,
    image: 'client/assets/uploads/products/oralb_brush.jpg'
  },
  {
    name: 'Crock-Pot 7-Quart Oval Manual Slow Cooker, Brushed Stainless Steel Exterior',
    price: 49.99,
    image: 'client/assets/uploads/products/crockpot.jpg'
  },
  {
    name: 'Soundcore by Anker Life P3 Active Noise Cancelling True Wireless Earbuds, Black',
    price: 69.99,
    image: 'client/assets/uploads/products/soundcore_earbuds.jpg'
  },
  {
    name: 'Levi\'s Men\'s The Trucker Denim Jacket, Standard Fit, Dark Stonewash',
    price: 79.99,
    image: 'client/assets/uploads/products/levis_jacket.jpg'
  },

  // Tier 3: Upper-Mid Appliances, Tech & Outdoor ($100 - $499)
  {
    name: 'Shark NV360 Navigator Lift-Away Deluxe Upright Vacuum with Anti-Allergen Seal, Blue',
    price: 199.99,
    image: 'client/assets/uploads/products/shark_vacuum.jpg'
  },
  {
    name: 'DeWalt 20V MAX Cordless Drill and Impact Driver Combo Kit, 2-Tool with 2.0Ah Batteries',
    price: 229.00,
    image: 'client/assets/uploads/products/dewalt_drill.jpg'
  },
  {
    name: 'Apple AirPods Pro (2nd Generation) Wireless Earbuds with MagSafe Case (USB-C)',
    price: 249.00,
    image: 'client/assets/uploads/products/airpods_pro.jpg'
  },
  {
    name: 'Apple Watch SE (2nd Gen, GPS 40mm) Smartwatch with Starlight Sport Band',
    price: 249.00,
    image: 'client/assets/uploads/products/apple_watch.jpg'
  },
  {
    name: 'Ninja Foodi 10-in-1 DualZone 2-Basket Air Fryer XL, 10-Qt Capacity',
    price: 249.99,
    image: 'client/assets/uploads/products/air_fryer.jpg'
  },
  {
    name: 'Coleman WeatherMaster 10-Person Outdoor Camping Tent with Screen Room',
    price: 329.99,
    image: 'client/assets/uploads/products/camping_tent.jpg'
  },
  {
    name: 'Sony WH-1000XM5 Wireless Noise-Canceling Over-Ear Headphones, Black',
    price: 398.00,
    image: 'client/assets/uploads/products/sony_headphones.jpg'
  },
  {
    name: 'KitchenAid Artisan Series 5-Quart Tilt-Head Stand Mixer, Stainless Steel Bowl, Empire Red',
    price: 449.95,
    image: 'client/assets/uploads/products/kitchenaid_mixer.jpg'
  },
  {
    name: 'Sony PlayStation 5 Slim Console (PS5 Disc Edition) 1TB SSD with DualSense Controller',
    price: 499.99,
    image: 'client/assets/uploads/products/ps5_console.jpg'
  },

  // Tier 4 & 5: High-Ticket, Commercial & Deficit Orders ($600 - $3,700)
  {
    name: 'Anker SOLIX C1000 Portable Power Station, 1800W Solar Generator, 1056Wh LiFePO4',
    price: 649.00,
    image: 'client/assets/uploads/products/power_station.jpg'
  },
  {
    name: 'Dyson V15 Detect Cordless Vacuum Cleaner with Laser Dust Detection, Yellow/Iron',
    price: 749.99,
    image: 'client/assets/uploads/products/dyson_vacuum.jpg'
  },
  {
    name: 'LG 34-Inch UltraWide Curved Gaming Monitor 144Hz 1ms Nano IPS QHD, G-SYNC',
    price: 799.99,
    image: 'client/assets/uploads/products/gaming_monitor.jpg'
  },
  {
    name: 'EcoFlow Glacier Portable Refrigerator 40L with Integrated Ice Maker Dual Zone',
    price: 849.00,
    image: 'client/assets/uploads/products/cooler.jpg'
  },
  {
    name: 'Bose Smart Ultra Soundbar with Dolby Atmos and Voice Control, Black Wireless',
    price: 899.00,
    image: 'client/assets/uploads/products/soundbar.jpg'
  },
  {
    name: 'Segway Ninebot KickScooter MAX G2, 22 mph Max Speed, 43 Miles Long Range',
    price: 899.99,
    image: 'client/assets/uploads/products/scooter.jpg'
  },
  {
    name: 'Breville Barista Touch Espresso Machine, Brushed Stainless Steel, Touch Screen',
    price: 999.95,
    image: 'client/assets/uploads/products/espresso_machine.jpg'
  },
  {
    name: 'DJI Mini 4 Pro Fly More Combo Drone with DJI RC 2, 4K HDR Video',
    price: 1099.00,
    image: 'client/assets/uploads/products/dji_drone.jpg'
  },
  {
    name: 'Apple iPhone 16 Pro Max 256GB - Desert Titanium, 5G Unlocked',
    price: 1199.00,
    image: 'client/assets/uploads/products/iphone_16.jpg'
  },
  {
    name: 'Apple MacBook Air 15-inch Laptop with M3 chip, 16GB Memory, 512GB SSD, Midnight',
    price: 1499.00,
    image: 'client/assets/uploads/products/macbook_air.jpg'
  },
  {
    name: 'Samsung 65-Inch Class OLED 4K S90D Series HDR+ Smart TV with Dolby Atmos',
    price: 1597.99,
    image: 'client/assets/uploads/products/samsung_tv.jpg'
  },
  {
    name: 'Bulk 15000 PCS Foam Glow Sticks with 3 Modes Colorful Flashing, Glow in Dark Party Supplies',
    price: 1856.00,
    image: 'client/assets/uploads/products/glow_sticks.jpg'
  },
  {
    name: 'Canon EOS R6 Mark II Mirrorless Camera with 24-105mm STM Lens, 24.2 MP, 4K60p',
    price: 2399.00,
    image: 'client/assets/uploads/products/canon_camera.jpg'
  },
  {
    name: 'Lifetime 9446 Outdoor Storage Shed, 12x 16 Foot, Desert Sand Black&Brown (2 in set)',
    price: 3674.00,
    image: 'client/assets/uploads/products/outdoor_shed.jpg'
  }
];

async function seed() {
  try {
    await db.ensureTasksTable();
    await db.query(`CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(15,2) NOT NULL,
      image VARCHAR(255)
    )`);

    // Remove old placeholder or bad logo entries
    await db.query(`DELETE FROM products WHERE image LIKE '%icon.png%' OR image LIKE '%logo%'`);

    // Insert or update all 40 products
    for (const p of products) {
      const existing = await db.query(`SELECT id FROM products WHERE name = ?`, [p.name]);
      if (existing.length === 0) {
        await db.query(`INSERT INTO products (name, price, image) VALUES (?, ?, ?)`, [p.name, p.price, p.image]);
      } else {
        await db.query(`UPDATE products SET price = ?, image = ? WHERE id = ?`, [p.price, p.image, existing[0].id]);
      }
    }

    const all = await db.query(`SELECT id, name, price, image FROM products ORDER BY price ASC`);
    console.log(`Successfully seeded ${all.length} authentic Amazon products across all price tiers.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
