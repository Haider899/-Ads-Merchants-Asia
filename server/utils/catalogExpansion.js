const image = name => `client/assets/uploads/products/${name}.jpg`;

const VARIANTS = ['Classic', 'Plus', 'Pro', 'Max'];

function buildCategory(category, imagePool, items, startIndex) {
  const products = [];
  items.forEach(([name, price], itemIndex) => {
    VARIANTS.forEach((variant, variantIndex) => {
      const multiplier = [1, 1.18, 1.42, 1.75][variantIndex];
      products.push({
        name: `${name} ${variant}`,
        price: Number((price * multiplier).toFixed(2)),
        category,
        image: image(imagePool[(itemIndex + variantIndex) % imagePool.length]),
        sku: `INTL-${String(startIndex + products.length).padStart(3, '0')}`,
        is_active: 1,
        commission_rate: 0.20,
        reward_rate: 0.20
      });
    });
  });
  return products;
}

// Forty additional products per existing category. Together with the original
// ten products per category, this provides a 500-item marketplace catalog.
const EXPANDED_CATALOG = [
  ...buildCategory('budget', ['anker_cable', 'anker_charger', 'ringke_case', 'sandisk_card', 'contigo_mug', 'echo_pop'], [
    ['UGREEN Braided USB-C Charging Cable 1m', 8.99], ['Baseus Compact Wall Charger 20W', 11.99], ['Spigen Rugged Phone Case', 13.99], ['Kingston Canvas 128GB Memory Card', 16.99], ['Targus Compact Wireless Mouse', 17.99], ['Belkin Lightning Cable 2-Pack', 18.99], ['Logitech K120 USB Keyboard', 19.99], ['Amazon Basics Laptop Sleeve', 21.99], ['Philips LED Desk Lamp', 24.99], ['Moleskine Classic Notebook Set', 27.99]
  ], 101),
  ...buildCategory('fashion_travel', ['garment_bag', 'stanley_tumbler', 'apple_watch', 'contigo_mug'], [
    ['Herschel City Travel Backpack', 44.99], ['American Tourister Softside Carry-On', 69.99], ['Samsonite Packing Cube Set', 29.99], ['Timberland Everyday Leather Belt', 34.99], ['Eastpak Padded Daypack', 39.99], ['Puma Essentials Training Sneakers', 64.99], ['Columbia Lightweight Rain Jacket', 89.99], ['Fossil Minimalist Leather Wallet', 49.99], ['Calvin Klein Cotton Lounge Set', 74.99], ['Travelpro Compression Packing Organizers', 54.99]
  ], 141),
  ...buildCategory('beauty_health', ['cerave_lotion', 'loreal_serum', 'oralb_brush'], [
    ['Vanicream Gentle Facial Cleanser', 13.99], ['The Ordinary Niacinamide Serum', 12.99], ['Cetaphil Hydrating Body Lotion', 16.99], ['Philips Essential Electric Shaver', 59.99], ['Revlon One-Step Hair Dryer Brush', 49.99], ['Nivea Soft Moisturizing Cream', 9.99], ['Eucerin Advanced Repair Cream', 18.99], ['Garnier Micellar Cleansing Water', 11.99], ['Conair InfinitiPRO Curling Iron', 39.99], ['Braun ThermoScan Digital Thermometer', 54.99]
  ], 181),
  ...buildCategory('mobile_audio', ['jbl_speaker', 'airpods_pro', 'sony_headphones', 'soundcore_earbuds', 'firestick_4k', 'soundbar'], [
    ['JBL Clip Portable Bluetooth Speaker', 49.99], ['Anker Soundcore Wireless Headphones', 59.99], ['Belkin MagSafe Wireless Charger', 39.99], ['Google Chromecast 4K Streaming Device', 49.99], ['Roku Express 4K Streaming Player', 39.99], ['Sennheiser Momentum Wireless Headphones', 249.99], ['Marshall Emberton Bluetooth Speaker', 169.99], ['Samsung Galaxy Buds Wireless Earbuds', 129.99], ['Amazon Kindle Basic E-Reader', 109.99], ['Sonos Beam Compact Soundbar', 499.99]
  ], 221),
  ...buildCategory('home_kitchen', ['crockpot', 'air_fryer', 'kitchenaid_mixer', 'dyson_vacuum', 'espresso_machine', 'shark_vacuum'], [
    ['Hamilton Beach Programmable Slow Cooker', 39.99], ['Cosori Digital Air Fryer', 89.99], ['Ninja Professional Blender', 99.99], ['Mr. Coffee Espresso and Cappuccino Maker', 79.99], ['Bissell CleanView Bagless Vacuum', 129.99], ['iRobot Roomba Robot Vacuum', 299.99], ['Calphalon Nonstick Cookware Set', 159.99], ['Pyrex Glass Food Storage Set', 34.99], ['Cuisinart Food Processor', 149.99], ['GE Countertop Microwave Oven', 119.99]
  ], 261),
  ...buildCategory('tools', ['blackdecker_drill', 'dewalt_drill'], [
    ['Kobalt 24V Cordless Drill Kit', 119.99], ['WORX 20V PowerShare Driver Kit', 89.99], ['HART 20V Cordless Tool Kit', 149.99], ['Husky 149-Piece Mechanics Tool Set', 199.99], ['IRWIN Quick-Grip Bar Clamp Set', 44.99], ['Fiskars PowerGear Pruner', 29.99], ['Dremel EZ Drum Sander Kit', 69.99], ['Bosch Laser Measure', 59.99], ['CRAFTSMAN Portable Air Compressor', 129.99], ['STANLEY FatMax Rolling Workshop', 179.99]
  ], 301),
  ...buildCategory('outdoor', ['camping_tent', 'power_station', 'cooler', 'scooter', 'outdoor_shed'], [
    ['Klymit Static V Camping Sleeping Pad', 54.99], ['Coleman Portable Camping Cot', 89.99], ['Black Diamond Trail Trekking Poles', 79.99], ['Hydro Flask Wide Mouth Bottle', 44.99], ['Thermos Stainless Steel Cooler', 69.99], ['Eureka Copper Canyon Tent', 249.99], ['Garmin Forerunner GPS Watch', 299.99], ['Goal Zero Nomad Solar Panel', 199.99], ['Traeger Portable Pellet Grill', 449.99], ['Thule Apex Hitch Bike Rack', 399.99]
  ], 341),
  ...buildCategory('gaming_entertainment', ['ps5_console', 'gaming_monitor', 'logitech_mouse', 'soundbar'], [
    ['Xbox Wireless Controller', 59.99], ['Nintendo Switch Pro Controller', 69.99], ['SteelSeries Arctis Gaming Headset', 99.99], ['HyperX Alloy Gaming Keyboard', 89.99], ['Razer BlackShark Gaming Headset', 119.99], ['Logitech G502 Gaming Mouse', 79.99], ['AOC 24-Inch Gaming Monitor', 159.99], ['Elgato Stream Deck Mini', 79.99], ['Turtle Beach Gaming Headset', 69.99], ['Secretlab Memory Foam Lumbar Pillow', 59.99]
  ], 381),
  ...buildCategory('premium_electronics', ['dji_drone', 'iphone_16', 'macbook_air', 'samsung_tv', 'canon_camera', 'apple_watch'], [
    ['Google Pixel 9 Pro Smartphone', 999.99], ['Samsung Galaxy S25 Ultra Smartphone', 1299.99], ['OnePlus 13 5G Smartphone', 899.99], ['Microsoft Surface Laptop', 1199.99], ['Lenovo Yoga 7i Laptop', 899.99], ['ASUS Zenbook OLED Laptop', 1299.99], ['Sony Alpha A6700 Camera Body', 1399.99], ['Fujifilm X-T50 Mirrorless Camera', 1499.99], ['Bose QuietComfort Ultra Headphones', 429.99], ['Garmin Fenix GPS Multisport Watch', 699.99]
  ], 421),
  ...buildCategory('high_ticket', ['samsung_tv', 'macbook_air', 'canon_camera', 'dji_drone', 'dyson_vacuum', 'espresso_machine'], [
    ['Samsung 85-Inch Neo QLED Smart TV', 3299.99], ['LG 83-Inch OLED Smart TV', 3499.99], ['Apple Mac Studio Desktop', 1999.99], ['Dell XPS 17 Creator Laptop', 2499.99], ['Sony Alpha A1 Mirrorless Camera', 6499.99], ['Canon EOS R5 Mark II Camera Kit', 4299.99], ['DJI Inspire Professional Drone Kit', 3999.99], ['Miele Triflex Cordless Vacuum System', 1199.99], ['Breville Oracle Touch Espresso Machine', 2499.99], ['Herman Miller Embody Office Chair', 1895.99]
  ], 461)
];

module.exports = { EXPANDED_CATALOG };
