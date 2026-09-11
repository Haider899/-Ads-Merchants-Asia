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
  {
    key: 'high_ticket',
    label: 'High Ticket Deficit',
    minPrice: 600
  }
];

function getCategory(key) {
  return TASK_PRODUCT_CATEGORIES.find(category => category.key === key) || null;
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
  const price = parseFloat(product.price || 0);
  const name = String(product.name || '').toLowerCase();

  if (category.minPrice !== undefined && price >= category.minPrice) {
    return true;
  }

  return (category.keywords || []).some(keyword => name.includes(String(keyword).toLowerCase()));
}

function getProductsForCategory(products, categoryKey) {
  const category = getCategory(categoryKey);
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
  getProductsForCategory,
  isCategoryMarker,
  makeCategoryMarker,
  parseCategoryMarker,
  pickCategoryProduct
};
