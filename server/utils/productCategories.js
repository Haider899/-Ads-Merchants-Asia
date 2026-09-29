const CATEGORY_MARKER = '__CATEGORY__:';

const TASK_PRODUCT_CATEGORIES = [
  {
    key: 'budget',
    label: 'Budget Accessories',
    keywords: ['DAIMOND PRODUCT', 'Straw', 'Mouse', 'Cable', 'Case', 'MicroSD', 'Charger', 'Mug', 'Echo Pop']
  },
  {
    key: 'fashion_travel',
    label: 'Fashion & Travel',
    keywords: ['Garment', 'Levi']
  },
  {
    key: 'beauty_health',
    label: 'Beauty & Health',
    keywords: ['CeraVe', 'L\'Oreal', 'Oral-B']
  },
  {
    key: 'mobile_audio',
    label: 'Mobile & Audio',
    keywords: ['JBL', 'Soundcore', 'AirPods', 'Sony WH', 'Bose', 'Fire TV']
  },
  {
    key: 'home_kitchen',
    label: 'Home & Kitchen',
    keywords: ['Crock-Pot', 'Ninja Foodi', 'KitchenAid', 'Breville', 'Dyson', 'Shark']
  },
  {
    key: 'tools',
    label: 'Tools & Hardware',
    keywords: ['BLACK+DECKER', 'DeWalt']
  },
  {
    key: 'outdoor',
    label: 'Outdoor & Camping',
    keywords: ['Coleman', 'Segway', 'EcoFlow', 'Power Station', 'Outdoor Storage Shed', 'Lifetime 9446']
  },
  {
    key: 'gaming_entertainment',
    label: 'Gaming & Entertainment',
    keywords: ['PlayStation', 'Gaming Monitor']
  },
  {
    key: 'premium_electronics',
    label: 'Premium Electronics',
    keywords: ['iPhone', 'MacBook', 'Samsung', 'Canon', 'DJI']
  },
  { key: 'mobile_accessories', label: 'Mobile Phones & Accessories', keywords: ['Smartphone', 'Phone Case', 'USB-C', 'Wireless Charger', 'microSD'] },
  { key: 'toiletry_bags', label: 'Toiletry Bags', keywords: ['Toiletry', 'Cosmetic', 'Makeup', 'Travel Bottle', 'Shaving Kit'] },
  { key: 'home_garden', label: 'Home & Garden', keywords: ['Garden', 'Lawn', 'Steam Mop', 'Air Purifier', 'Storage Rack'] },
  { key: 'handheld_vacuums', label: 'Handheld Vacuums', keywords: ['Handheld Vacuum', 'Dustbuster', 'Wandvac', 'Cordless Vacuum'] },
  { key: 'pet_supplies', label: 'Pet Supplies', keywords: ['Pet', 'Dog', 'Cat', 'Puppy', 'Kitten'] },
  { key: 'massage_relaxation', label: 'Massage & Relaxation', keywords: ['Massage', 'Yoga', 'Heated Throw', 'White Noise', 'Wellness'] },
  { key: 'electric_clippers', label: 'Electric Clippers & Blades', keywords: ['Clipper', 'Trimmer', 'Shaver', 'Grooming'] },
  { key: 'portable_speakers', label: 'Portable Bluetooth Speakers', keywords: ['Portable Bluetooth Speaker', 'SoundLink', 'WONDERBOOM', 'Speaker'] },
  { key: 'storage_shed', label: 'Storage Shed', keywords: ['Storage Shed', 'Garden Shed', 'Utility Shed'] },
  { key: 'nursing_feeding', label: 'Nursing & Feeding', keywords: ['Baby Bottle', 'Nursing', 'Formula', 'Trainer Cup', 'Breast Pump'] },
  {
    key: 'high_ticket',
    label: 'High Ticket Deficit',
    minPrice: 600
  }
];

function getCategory(key) {
  if (typeof key !== 'string' || !key.trim()) return null;
  return TASK_PRODUCT_CATEGORIES.find(category => category.key === key) || {
    key: key.trim(),
    label: key.trim(),
    customCategory: true
  };
}

function getCatalogCategory(key) {
  const normalized = String(key || '').trim().toLowerCase();
  if (!normalized) return null;
  return {
    key: String(key).trim(),
    label: String(key).trim(),
    customCategory: true,
    catalogOnly: true,
    matchesProduct: product => String(product && product.category || '').trim().toLowerCase() === normalized
  };
}

function isCategoryMarker(value) {
  return typeof value === 'string' && value.startsWith(CATEGORY_MARKER);
}

function makeCategoryMarker(key) {
  return `${CATEGORY_MARKER}${key}`;
}

function parseCategoryMarker(value) {
  return isCategoryMarker(value) ? value.slice(CATEGORY_MARKER.length) : null;
}

function productMatchesCategory(product, category) {
  if (!product || !category) return false;
  if (product.is_active !== undefined && product.is_active !== null && Number(product.is_active) === 0) return false;
  if (category.catalogOnly && typeof category.matchesProduct === 'function') {
    return category.matchesProduct(product);
  }
  const price = parseFloat(product.price || 0);
  const name = String(product.name || '').toLowerCase();
  const productCategory = String(product.category || '').trim().toLowerCase();
  const categoryNames = [category.key, category.label].filter(Boolean).map(value => String(value).trim().toLowerCase());
  if (productCategory && categoryNames.includes(productCategory)) return true;
  if (category.customCategory) return false;

  if (category.minPrice !== undefined && price >= category.minPrice) {
    return true;
  }

  return (category.keywords || []).some(keyword => name.includes(String(keyword).toLowerCase()));
}

function getProductsForCategory(products, categoryKey) {
  const category = getCategory(categoryKey) || getCatalogCategory(categoryKey);
  if (!category) return [];
  return (products || []).filter(product => productMatchesCategory(product, category));
}

function pickRandom(items) {
  if (!items || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function pickCategoryProduct(products, categoryKey, tasks = [], userId = null) {
  const categoryProducts = getProductsForCategory(products, categoryKey);
  if (categoryProducts.length === 0) return null;

  const currentUserId = userId !== null && userId !== undefined ? String(userId) : null;
  const currentUserUsed = new Set(
    tasks
      .filter(task => currentUserId && String(task.user_id) === currentUserId)
      .map(task => task.product_name)
      .filter(Boolean)
  );
  const pendingElsewhere = new Set(
    tasks
      .filter(task => task.status === 'pending' && (!currentUserId || String(task.user_id) !== currentUserId))
      .map(task => task.product_name)
      .filter(Boolean)
  );

  const freshForUser = categoryProducts.filter(product => !currentUserUsed.has(product.name));
  const uniqueNow = freshForUser.filter(product => !pendingElsewhere.has(product.name));

  return pickRandom(uniqueNow) || pickRandom(freshForUser) || pickRandom(categoryProducts);
}

module.exports = {
  CATEGORY_MARKER,
  TASK_PRODUCT_CATEGORIES,
  getCategory,
  getCatalogCategory,
  getProductsForCategory,
  isCategoryMarker,
  makeCategoryMarker,
  parseCategoryMarker,
  pickCategoryProduct
};
