const MAX_SELECTION_ITEMS = 100;
const MAX_PRODUCT_PRICE = 9999999999999.99;

function normalizeProductSelection(catalog, requestedItems) {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { ok: false, error: 'Select at least one product for this task.' };
  }
  if (requestedItems.length > MAX_SELECTION_ITEMS) {
    return { ok: false, error: `Select no more than ${MAX_SELECTION_ITEMS} products.` };
  }

  const seenIds = new Set();
  const selection = [];
  for (const item of requestedItems) {
    const productId = item && item.productId !== undefined && item.productId !== null
      ? String(item.productId).trim()
      : '';
    if (!productId || seenIds.has(productId)) continue;

    const product = (catalog || []).find(candidate => String(candidate.id) === productId);
    if (!product || (product.is_active !== undefined && Number(product.is_active) === 0)) {
      return { ok: false, error: 'One or more selected products are unavailable. Refresh the product catalog and try again.' };
    }

    const rawPrice = item.price === undefined || item.price === null || item.price === ''
      ? String(product.price)
      : String(item.price).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(rawPrice)) {
      return { ok: false, error: `Enter a valid price (up to 2 decimal places) for ${product.name}.` };
    }
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price <= 0 || price > MAX_PRODUCT_PRICE) {
      return { ok: false, error: `Price for ${product.name} must be greater than zero and within the supported limit.` };
    }

    seenIds.add(productId);
    selection.push({ product_id: productId, price: Number(price.toFixed(2)) });
  }

  if (selection.length === 0) {
    return { ok: false, error: 'Select at least one valid product for this task.' };
  }
  return { ok: true, selection };
}

function parseProductSelection(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function resolveSelectedProducts(catalog, storedSelection) {
  return parseProductSelection(storedSelection).map(selection => {
    const product = (catalog || []).find(candidate => String(candidate.id) === String(selection.product_id));
    if (!product || (product.is_active !== undefined && Number(product.is_active) === 0)) return null;
    const selectedPrice = Number(selection.price);
    return {
      ...product,
      price: Number.isFinite(selectedPrice) && selectedPrice > 0 ? Number(selectedPrice.toFixed(2)) : Number(product.price || 0)
    };
  }).filter(Boolean);
}

function selectClosestUnusedProduct(catalog, targetPrice, usedNames = new Set(), usedImages = new Set()) {
  const products = (catalog || []).filter(product => product &&
    (product.is_active === undefined || Number(product.is_active) !== 0));
  const normalizedNames = usedNames instanceof Set ? usedNames : new Set(usedNames);
  const normalizedImages = usedImages instanceof Set ? usedImages : new Set(usedImages);
  const isUnused = product => {
    const name = String(product.name || '').trim().toLowerCase();
    const image = String(product.image || '').trim().toLowerCase();
    return !normalizedNames.has(name) && (!image || !normalizedImages.has(image));
  };
  const unusedProducts = products.filter(isUnused);
  const unusedNameProducts = products.filter(product => {
    const name = String(product.name || '').trim().toLowerCase();
    return !normalizedNames.has(name);
  });
  const pool = unusedProducts.length ? unusedProducts : (unusedNameProducts.length ? unusedNameProducts : products);
  if (!pool.length) return null;
  const amount = Number(targetPrice) || 0;
  return [...pool].sort((a, b) =>
    Math.abs(Number(a.price || 0) - amount) - Math.abs(Number(b.price || 0) - amount)
  )[0];
}

module.exports = {
  MAX_SELECTION_ITEMS,
  MAX_PRODUCT_PRICE,
  normalizeProductSelection,
  parseProductSelection,
  resolveSelectedProducts,
  selectClosestUnusedProduct
};
