const image = name => `client/assets/uploads/products/${name}.jpg`;

const DEFINITIONS = [
  ['mobile_accessories', ['iphone_16', 'ringke_case', 'anker_cable', 'anker_charger', 'sandisk_card', 'apple_watch', 'airpods_pro', 'macbook_air', 'samsung_tv', 'jbl_speaker'], [
    ['Google Pixel 9a Smartphone with 5G', 499.99], ['Samsung Galaxy A56 Smartphone', 449.99], ['OnePlus Nord CE 4 Smartphone', 329.99], ['Spigen Ultra Hybrid Phone Case', 24.99], ['Belkin USB-C to Lightning Cable', 19.99], ['Anker MagGo Wireless Charging Stand', 79.99], ['SanDisk Extreme 256GB microSD Card', 29.99], ['Apple Watch Magnetic Charging Cable', 29.99], ['JBL Tune Wireless Headphones', 79.99], ['Logitech Bluetooth Keyboard for Tablet', 49.99]
  ]],
  ['toiletry_bags', ['garment_bag', 'cerave_lotion', 'loreal_serum', 'oralb_brush', 'contigo_mug', 'stanley_tumbler', 'apple_watch', 'anker_charger', 'ringke_case', 'echo_pop'], [
    ['BAGSMART Hanging Toiletry Bag with Waterproof Compartments', 29.99], ['Kibou Travel Makeup Organizer Bag', 24.99], ['Nishel Extra Large Cosmetic Travel Case', 34.99], ['Silicone Travel Bottle Set for Toiletries', 12.99], ['Mossio Travel Toiletry Organizer with Hook', 27.99], ['Sea to Summit Hanging Toiletry Bag', 39.99], ['Portable Makeup Brush Organizer Case', 18.99], ['Clear TSA Approved Toiletry Bag Set', 14.99], ['Leather Travel Shaving Kit Organizer', 32.99], ['Compact Electric Toothbrush Travel Case', 16.99]
  ]],
  ['home_garden', ['outdoor_shed', 'shark_vacuum', 'dyson_vacuum', 'air_fryer', 'kitchenaid_mixer', 'crockpot', 'espresso_machine', 'cooler', 'power_station', 'camping_tent'], [
    ['Keter Outdoor Garden Storage Box', 129.99], ['Gardena Expandable Garden Hose', 39.99], ['BLACK+DECKER Cordless Leaf Blower', 119.99], ['Scotts EdgeGuard Lawn Spreader', 59.99], ['Bissell PowerFresh Steam Mop', 99.99], ['Honeywell Air Purifier for Home', 149.99], ['Rubbermaid Garden Tool Storage Rack', 44.99], ['Keurig Compact Coffee Maker', 89.99], ['Ninja Indoor Grill and Air Fryer', 199.99], ['Cuisinart Stainless Steel Food Processor', 179.99]
  ]],
  ['handheld_vacuums', ['dyson_vacuum', 'shark_vacuum', 'outdoor_shed', 'power_station', 'cooler', 'air_fryer', 'camping_tent', 'cooler', 'dyson_vacuum', 'shark_vacuum'], [
    ['Dyson V8 Cordless Handheld Vacuum', 349.99], ['Shark Wandvac Cordless Hand Vacuum', 129.99], ['BLACK+DECKER Dustbuster Hand Vacuum', 79.99], ['Bissell AeroSlim Cordless Handheld Vacuum', 49.99], ['Eureka Blaze Handheld Vacuum Cleaner', 59.99], ['Hoover ONEPWR Handheld Vacuum', 99.99], ['Ryobi ONE+ 18V Hand Vacuum Kit', 119.99], ['VacLife Cordless Car Vacuum Cleaner', 39.99], ['Eufy HomeVac H11 Handheld Vacuum', 49.99], ['Tineco Pure One Mini Hand Vacuum', 149.99]
  ]],
  ['pet_supplies', ['camping_tent', 'cooler', 'stanley_tumbler', 'contigo_mug', 'outdoor_shed', 'air_fryer', 'shark_vacuum', 'power_station', 'garment_bag', 'jbl_speaker'], [
    ['Amazon Basics Foldable Pet Travel Carrier', 39.99], ['Furhaven Memory Foam Pet Bed', 59.99], ['IRIS Airtight Pet Food Storage Container', 44.99], ['PetSafe Automatic Ball Launcher', 129.99], ['KONG Classic Durable Dog Toy', 14.99], ['Catit Flower Water Fountain for Cats', 34.99], ['Outward Hound Slow Feeder Pet Bowl', 19.99], ['Necoichi Elevated Cat Food Bowl', 29.99], ['Ruffwear Front Range Dog Harness', 39.99], ['Frisco Portable Pet Playpen', 69.99]
  ]],
  ['massage_relaxation', ['soundbar', 'sony_headphones', 'stanley_tumbler', 'contigo_mug', 'dyson_vacuum', 'shark_vacuum', 'apple_watch', 'camping_tent', 'power_station', 'cooler'], [
    ['RENPHO Shiatsu Foot Massager Machine', 119.99], ['Comfier Neck and Shoulder Massager', 69.99], ['Therabody Mini Percussion Massage Gun', 199.99], ['HoMedics Back and Neck Massager', 89.99], ['Gaiam Yoga Mat with Carry Strap', 29.99], ['Manduka Pro Premium Yoga Mat', 129.99], ['Corkcicle Insulated Wellness Tumbler', 34.99], ['Sleep Sound White Noise Machine', 49.99], ['Sunbeam Heated Throw Blanket', 59.99], ['Nekteck Shiatsu Foot Massager with Heat', 99.99]
  ]],
  ['electric_clippers', ['oralb_brush', 'blackdecker_drill', 'dewalt_drill', 'loreal_serum', 'cerave_lotion', 'apple_watch', 'anker_charger', 'logitech_mouse', 'soundcore_earbuds', 'echo_pop'], [
    ['Wahl Professional Cordless Hair Clipper', 89.99], ['Philips Norelco Multigroom Trimmer', 59.99], ['Andis Master Cordless Clipper', 149.99], ['Braun All-in-One Style Kit', 79.99], ['Remington Shortcut Pro Hair Clipper', 49.99], ['Panasonic ER-GP21 Professional Trimmer', 119.99], ['ConairMAN Even Cut Rotary Haircut Kit', 39.99], ['Manscaped The Lawn Mower Body Trimmer', 89.99], ['Philips OneBlade Face and Body Trimmer', 44.99], ['Bevel Pro All-in-One Clipper and Trimmer', 249.99]
  ]],
  ['portable_speakers', ['jbl_speaker', 'soundbar', 'soundcore_earbuds', 'sony_headphones', 'airpods_pro', 'echo_pop', 'firestick_4k', 'jbl_speaker', 'soundbar', 'echo_pop'], [
    ['JBL Charge 5 Portable Bluetooth Speaker', 179.99], ['Bose SoundLink Flex Bluetooth Speaker', 149.99], ['Marshall Kilburn II Portable Speaker', 299.99], ['Sony SRS-XB100 Compact Bluetooth Speaker', 59.99], ['Ultimate Ears WONDERBOOM 4 Speaker', 99.99], ['Anker Soundcore Motion Boom Plus', 179.99], ['Bang & Olufsen Beosound A1 Speaker', 299.99], ['Tribit StormBox Micro 2 Speaker', 59.99], ['Sonos Roam Portable Smart Speaker', 179.99], ['Harman Kardon Onyx Studio Bluetooth Speaker', 229.99]
  ]],
  ['storage_shed', ['outdoor_shed', 'camping_tent', 'cooler', 'power_station', 'shark_vacuum', 'dyson_vacuum', 'outdoor_shed', 'cooler', 'camping_tent', 'power_station'], [
    ['Suncast Vertical Outdoor Storage Shed', 399.99], ['Keter Manor Apex Garden Storage Shed', 699.99], ['Rubbermaid Outdoor Storage Shed', 549.99], ['Arrow EZEE Steel Storage Shed', 849.99], ['Lifetime Outdoor Utility Shed', 1299.99], ['Yardline Cedar Garden Storage Shed', 1899.99], ['Duramax Vinyl Storage Shed', 999.99], ['Palram Skylight Garden Shed', 1499.99], ['Heartland Hillside Wood Storage Shed', 2299.99], ['Lifetime 8x10 Outdoor Storage Shed', 2499.99]
  ]],
  ['nursing_feeding', ['contigo_mug', 'cooler', 'camping_tent', 'stanley_tumbler', 'oralb_brush', 'cerave_lotion', 'air_fryer', 'kitchenaid_mixer', 'echo_pop', 'garment_bag'], [
    ['Dr. Browns Natural Flow Baby Bottle Set', 29.99], ['Philips Avent Anti-Colic Baby Bottle Set', 34.99], ['Skip Hop Insulated Baby Bottle Bag', 24.99], ['Munchkin Miracle 360 Trainer Cup', 9.99], ['OXO Tot Transitions Straw Cup', 12.99], ['Tommee Tippee Closer to Nature Bottle Set', 27.99], ['Baby Brezza Formula Pro Advanced', 249.99], ['Haakaa Silicone Breast Pump', 19.99], ['Boon Lawn Countertop Drying Rack', 24.99], ['Boppy Nursing Pillow and Positioner', 39.99]
  ]]
];

const ADDITIONAL_CATALOG = [];
let sku = 501;
for (const [category, images, products] of DEFINITIONS) {
  products.forEach(([name, price], index) => {
    ADDITIONAL_CATALOG.push({
      name,
      price,
      category,
      image: image(images[index % images.length]),
      sku: `INTL-${String(sku++).padStart(3, '0')}`,
      is_active: 1,
      commission_rate: 0.20,
      reward_rate: 0.20
    });
  });
}

module.exports = { ADDITIONAL_CATALOG };
