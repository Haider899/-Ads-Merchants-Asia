const image = name => `client/assets/uploads/products/${name}.jpg`;
const { EXPANDED_CATALOG } = require('./catalogExpansion');

// Common international marketplace products. Images point to the local product-photo
// library so admin assignments and user task cards render consistently offline.
const INITIAL_CATALOG = [
  // Budget Accessories
  ['Stanley Quencher Reusable Straw Replacement Pack, 4-Pack', 9.99, 'budget', image('stanley_straws')],
  ['Logitech M185 Wireless Compact Mouse with Nano USB Receiver', 12.99, 'budget', image('logitech_mouse')],
  ['Anker PowerLine III USB-C to USB-C 100W Cable, 6ft', 14.99, 'budget', image('anker_cable')],
  ['Ringke Onyx Shockproof Matte Smartphone Case', 16.99, 'budget', image('ringke_case')],
  ['SanDisk 128GB Extreme PRO microSDXC Memory Card', 18.99, 'budget', image('sandisk_card')],
  ['Anker Nano 30W USB-C GaN Fast Charger', 22.99, 'budget', image('anker_charger')],
  ['Contigo West Loop Stainless Steel Travel Mug, 20oz', 23.99, 'budget', image('contigo_mug')],
  ['Amazon Echo Pop Compact Smart Speaker', 24.99, 'budget', image('echo_pop')],
  ['Apple Watch Sport Band Replacement, Silicone', 19.99, 'budget', image('apple_watch')],
  ['Stanley Quencher H2.0 FlowState Tumbler, 30oz', 35.00, 'budget', image('stanley_tumbler')],

  // Fashion & Travel
  ['SOLOSAIC Convertible Garment Duffle Bag with Shoe Compartment', 39.99, 'fashion_travel', image('garment_bag')],
  ["Levi's Men's The Trucker Denim Jacket, Standard Fit", 79.99, 'fashion_travel', image('garment_bag')],
  ['Samsonite Omni PC Hardside Expandable Luggage, 24-Inch', 139.99, 'fashion_travel', image('garment_bag')],
  ['The North Face Borealis Commuter Backpack, 28L', 99.00, 'fashion_travel', image('garment_bag')],
  ['Nike Air Max Everyday Running Shoes', 129.99, 'fashion_travel', image('garment_bag')],
  ['Ray-Ban Wayfarer Classic Polarized Sunglasses', 163.00, 'fashion_travel', image('garment_bag')],
  ['adidas Essentials 3-Stripes Fleece Hoodie', 55.00, 'fashion_travel', image('garment_bag')],
  ['Fossil Gen 6 Stainless Steel Smartwatch', 199.00, 'fashion_travel', image('apple_watch')],
  ['Travelpro Maxlite Air Carry-On Spinner', 179.99, 'fashion_travel', image('garment_bag')],
  ['Bose QuietComfort Travel Case and Organizer', 49.00, 'fashion_travel', image('garment_bag')],

  // Beauty & Health
  ['CeraVe Daily Moisturizing Lotion with Hyaluronic Acid, 16oz', 15.99, 'beauty_health', image('cerave_lotion')],
  ["L'Oreal Paris Revitalift Hyaluronic Acid Face Serum", 21.99, 'beauty_health', image('loreal_serum')],
  ['Oral-B Pro 1000 CrossAction Rechargeable Toothbrush', 49.99, 'beauty_health', image('oralb_brush')],
  ['Philips Sonicare ProtectiveClean 4100 Electric Toothbrush', 44.96, 'beauty_health', image('oralb_brush')],
  ['La Roche-Posay Toleriane Double Repair Face Moisturizer', 19.99, 'beauty_health', image('cerave_lotion')],
  ['Neutrogena Hydro Boost Water Gel Facial Moisturizer', 18.49, 'beauty_health', image('loreal_serum')],
  ['Braun Series 7 Electric Foil Shaver for Men', 149.94, 'beauty_health', image('oralb_brush')],
  ['Olay Regenerist Micro-Sculpting Face Cream', 28.99, 'beauty_health', image('cerave_lotion')],
  ['Cetaphil Gentle Skin Cleanser, 20oz', 12.99, 'beauty_health', image('cerave_lotion')],
  ['Colgate Optic White Rechargeable Electric Toothbrush', 39.99, 'beauty_health', image('oralb_brush')],

  // Mobile & Audio
  ['JBL GO 4 Ultra-Portable Waterproof Bluetooth Speaker', 39.95, 'mobile_audio', image('jbl_speaker')],
  ['Amazon Fire TV Stick 4K with Alexa Voice Remote', 49.99, 'mobile_audio', image('firestick_4k')],
  ['Soundcore Life P3 Active Noise Cancelling Earbuds', 69.99, 'mobile_audio', image('soundcore_earbuds')],
  ['Apple AirPods Pro, 2nd Generation with MagSafe USB-C Case', 249.00, 'mobile_audio', image('airpods_pro')],
  ['Sony WH-1000XM5 Wireless Noise-Canceling Headphones', 398.00, 'mobile_audio', image('sony_headphones')],
  ['Bose Smart Ultra Soundbar with Dolby Atmos', 899.00, 'mobile_audio', image('soundbar')],
  ['Google Pixel Buds Pro 2 Wireless Earbuds', 229.00, 'mobile_audio', image('soundcore_earbuds')],
  ['Amazon Kindle Paperwhite 16GB E-Reader', 159.99, 'mobile_audio', image('firestick_4k')],
  ['Jabra Elite 8 Active True Wireless Earbuds', 199.99, 'mobile_audio', image('soundcore_earbuds')],
  ['Sonos Era 100 Wireless Smart Speaker', 249.00, 'mobile_audio', image('soundbar')],

  // Home & Kitchen
  ['Crock-Pot 7-Quart Oval Manual Slow Cooker', 49.99, 'home_kitchen', image('crockpot')],
  ['Shark NV360 Navigator Lift-Away Deluxe Upright Vacuum', 199.99, 'home_kitchen', image('shark_vacuum')],
  ['Ninja Foodi 10-in-1 DualZone Air Fryer XL, 10-Qt', 249.99, 'home_kitchen', image('air_fryer')],
  ['KitchenAid Artisan Series 5-Quart Stand Mixer', 449.95, 'home_kitchen', image('kitchenaid_mixer')],
  ['Dyson V15 Detect Cordless Vacuum Cleaner', 749.99, 'home_kitchen', image('dyson_vacuum')],
  ['Breville Barista Touch Espresso Machine', 999.95, 'home_kitchen', image('espresso_machine')],
  ['Instant Pot Pro 10-in-1 Pressure Cooker, 6-Qt', 129.95, 'home_kitchen', image('crockpot')],
  ['Keurig K-Elite Single Serve Coffee Maker', 189.99, 'home_kitchen', image('espresso_machine')],
  ['Vitamix Explorian E310 Blender, Black', 349.95, 'home_kitchen', image('air_fryer')],
  ['Roborock Q Revo Robot Vacuum and Mop', 899.99, 'home_kitchen', image('dyson_vacuum')],

  // Tools & Hardware
  ['BLACK+DECKER 20V MAX Cordless Drill and Driver Kit', 49.99, 'tools', image('blackdecker_drill')],
  ['DeWalt 20V MAX Cordless Drill and Impact Driver Combo Kit', 229.00, 'tools', image('dewalt_drill')],
  ['Makita 18V LXT Brushless Cordless Drill Kit', 299.00, 'tools', image('dewalt_drill')],
  ['Bosch 12V Max Pocket Driver Kit', 129.00, 'tools', image('blackdecker_drill')],
  ['Milwaukee M18 Fuel Hammer Drill and Impact Driver Combo', 399.00, 'tools', image('dewalt_drill')],
  ['Ryobi ONE+ 18V Cordless Tool Combo Kit, 4-Piece', 199.00, 'tools', image('blackdecker_drill')],
  ['Stanley 65-Piece Homeowner Tool Kit', 79.99, 'tools', image('blackdecker_drill')],
  ['Dremel Lite 7760 Cordless Rotary Tool', 59.99, 'tools', image('blackdecker_drill')],
  ['CRAFTSMAN V20 Cordless Reciprocating Saw Kit', 149.00, 'tools', image('blackdecker_drill')],
  ['Kreg Pocket-Hole Jig 720PRO', 149.99, 'tools', image('dewalt_drill')],

  // Outdoor & Camping
  ['Coleman WeatherMaster 10-Person Camping Tent', 329.99, 'outdoor', image('camping_tent')],
  ['Anker SOLIX C1000 Portable Power Station, 1056Wh', 649.00, 'outdoor', image('power_station')],
  ['EcoFlow Glacier Portable Refrigerator, 40L', 849.00, 'outdoor', image('cooler')],
  ['Segway Ninebot KickScooter MAX G2, 43-Mile Range', 899.99, 'outdoor', image('scooter')],
  ['Lifetime 9446 Outdoor Storage Shed, 12x16 Foot', 3674.00, 'outdoor', image('outdoor_shed')],
  ['YETI Tundra Haul Portable Wheeled Cooler', 450.00, 'outdoor', image('cooler')],
  ['Osprey Atmos AG 65L Hiking Backpack', 270.00, 'outdoor', image('camping_tent')],
  ['Weber Spirit II E-310 Gas Grill', 549.00, 'outdoor', image('cooler')],
  ['Garmin Instinct 2 Solar Outdoor Smartwatch', 399.99, 'outdoor', image('apple_watch')],
  ['Coleman 1000-Lumen LED Lantern', 59.99, 'outdoor', image('camping_tent')],

  // Gaming & Entertainment
  ['Sony PlayStation 5 Slim Disc Edition, 1TB SSD', 499.99, 'gaming_entertainment', image('ps5_console')],
  ['LG 34-Inch UltraWide Curved Gaming Monitor, 144Hz', 799.99, 'gaming_entertainment', image('gaming_monitor')],
  ['Xbox Series X 1TB Console', 499.99, 'gaming_entertainment', image('ps5_console')],
  ['Nintendo Switch OLED Model, White', 349.99, 'gaming_entertainment', image('ps5_console')],
  ['Steam Deck OLED 512GB Handheld Gaming Console', 549.00, 'gaming_entertainment', image('gaming_monitor')],
  ['Logitech G915 TKL Wireless Gaming Keyboard', 229.99, 'gaming_entertainment', image('logitech_mouse')],
  ['Razer DeathAdder V3 Pro Wireless Gaming Mouse', 149.99, 'gaming_entertainment', image('logitech_mouse')],
  ['Elgato Game Capture 4K X', 229.99, 'gaming_entertainment', image('gaming_monitor')],
  ['Meta Quest 3S 128GB Mixed Reality Headset', 299.99, 'gaming_entertainment', image('gaming_monitor')],
  ['Secretlab TITAN Evo Gaming Chair', 549.00, 'gaming_entertainment', image('gaming_monitor')],

  // Premium Electronics
  ['DJI Mini 4 Pro Fly More Combo Drone', 1099.00, 'premium_electronics', image('dji_drone')],
  ['Apple iPhone 16 Pro Max 256GB, 5G Unlocked', 1199.00, 'premium_electronics', image('iphone_16')],
  ['Apple MacBook Air 15-inch with M3 Chip, 16GB/512GB', 1499.00, 'premium_electronics', image('macbook_air')],
  ['Samsung 65-Inch OLED 4K S90D Smart TV', 1597.99, 'premium_electronics', image('samsung_tv')],
  ['Canon EOS R6 Mark II Mirrorless Camera with Lens', 2399.00, 'premium_electronics', image('canon_camera')],
  ['Sony BRAVIA XR 65-Inch OLED 4K Smart TV', 1899.99, 'premium_electronics', image('samsung_tv')],
  ['Apple iPad Pro 13-inch M4, 256GB Wi-Fi', 1299.00, 'premium_electronics', image('macbook_air')],
  ['Nikon Z6 III Full-Frame Mirrorless Camera Body', 2499.95, 'premium_electronics', image('canon_camera')],
  ['GoPro HERO13 Black Action Camera', 399.99, 'premium_electronics', image('dji_drone')],
  ['Apple Watch Ultra 2 GPS + Cellular', 799.00, 'premium_electronics', image('apple_watch')],

  // High-ticket marketplace picks
  ['LG 77-Inch OLED evo 4K Smart TV', 2499.99, 'high_ticket', image('samsung_tv')],
  ['Apple MacBook Pro 16-inch M4 Pro, 24GB/512GB', 2499.00, 'high_ticket', image('macbook_air')],
  ['Sony Alpha A7 IV Full-Frame Mirrorless Camera Kit', 2498.00, 'high_ticket', image('canon_camera')],
  ['Bose Lifestyle 650 Home Theater System', 1999.00, 'high_ticket', image('soundbar')],
  ['Dyson Gen5detect Absolute Cordless Vacuum', 949.99, 'high_ticket', image('dyson_vacuum')],
  ['Peloton Bike+ Indoor Exercise Bike', 2495.00, 'high_ticket', image('gaming_monitor')],
  ['Miele Complete C3 PowerLine Canister Vacuum', 1199.00, 'high_ticket', image('dyson_vacuum')],
  ['Jura E8 Automatic Coffee Machine', 2499.00, 'high_ticket', image('espresso_machine')],
  ['DJI Mavic 3 Pro Fly More Combo Drone', 2999.00, 'high_ticket', image('dji_drone')],
  ['Herman Miller Aeron Ergonomic Office Chair', 1795.00, 'high_ticket', image('gaming_monitor')]
].map(([name, price, category, imagePath], index) => ({
  name,
  price,
  category,
  image: imagePath,
  sku: `INTL-${String(index + 1).padStart(3, '0')}`,
  is_active: 1,
  commission_rate: 0.20,
  reward_rate: 0.20
}));

const INTERNATIONAL_CATALOG = [...INITIAL_CATALOG, ...EXPANDED_CATALOG];

module.exports = { INTERNATIONAL_CATALOG };
