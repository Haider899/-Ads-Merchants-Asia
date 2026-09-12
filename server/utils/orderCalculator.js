/**
 * Centralized Order Calculation & Financial Precision Service
 * Enforces backend source of truth as required by BUILD SPECIFICATION.txt
 */

function round(val, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round((parseFloat(val) + Number.EPSILON) * factor) / factor;
}

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

function generateTaskNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `TSK-${dateStr}-${randomSuffix}`;
}

function generateTransactionId(prefix = '') {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const p = prefix ? `${prefix}-` : '';
  return `TXN-${p}${dateStr}-${randomSuffix}`;
}

/**
 * Single source of truth calculation engine for orders and tasks.
 * Never trust prices, commissions, or balance calculations from the frontend.
 * Supports snake_case, camelCase, and aliases.
 */
function calculateOrder(input = {}) {
  const rawPrice = input.unit_price !== undefined ? input.unit_price : (input.price !== undefined ? input.price : input.product_price);
  const price = round(Math.max(0, parseFloat(rawPrice) || 0));
  
  const rawQty = input.quantity !== undefined ? input.quantity : (input.qty !== undefined ? input.qty : 1);
  const qty = Math.max(1, parseInt(rawQty, 10) || 1);
  const subtotal = round(price * qty);

  const rawDisc = input.discount_rate !== undefined ? input.discount_rate : (input.discountRate !== undefined ? input.discountRate : 0.00);
  const discRate = round(parseFloat(rawDisc) || 0, 4);
  const discountAmount = round(subtotal * discRate);
  const netAmount = round(Math.max(0, subtotal - discountAmount));

  const rawTax = input.tax_rate !== undefined ? input.tax_rate : (input.taxRate !== undefined ? input.taxRate : 0.00);
  const tRate = round(parseFloat(rawTax) || 0, 4);
  const taxAmount = round(netAmount * tRate);

  const rawFee = input.fee_amount !== undefined ? input.fee_amount : (input.fee !== undefined ? input.fee : 0.00);
  const fee = round(Math.max(0, parseFloat(rawFee) || 0));
  const grossAmount = round(netAmount + taxAmount + fee);

  const rawCommRate = input.commission_rate !== undefined ? input.commission_rate : (input.commissionRate !== undefined ? input.commissionRate : 0.20);
  const commRate = round(parseFloat(rawCommRate) || 0.20, 4);
  const commAmount = round(subtotal * commRate);

  const rawRewRate = input.reward_rate !== undefined ? input.reward_rate : (input.rewardRate !== undefined ? input.rewardRate : commRate);
  const rewRate = round(parseFloat(rawRewRate) !== undefined && parseFloat(rawRewRate) !== null ? parseFloat(rawRewRate) : commRate, 4);
  const rewAmount = round(subtotal * rewRate);

  const rawBalance = input.available_balance !== undefined ? input.available_balance : (input.currentBalance !== undefined ? input.currentBalance : input.balance);
  const availBal = round(parseFloat(rawBalance) || 0);
  const fundingShortfall = grossAmount > availBal ? round(grossAmount - availBal) : 0.00;
  const isDeficit = fundingShortfall > 0;
  const totalPayout = round(grossAmount + commAmount);
  const newBalanceAfterReserve = round(availBal - grossAmount);

  return {
    // Standard schema fields
    unit_price: price,
    quantity: qty,
    subtotal,
    discount_rate: discRate,
    discount_amount: discountAmount,
    net_amount: netAmount,
    tax_rate: tRate,
    tax_amount: taxAmount,
    fee_amount: fee,
    gross_amount: grossAmount,
    commission_rate: commRate,
    commission_amount: commAmount,
    reward_rate: rewRate,
    reward_amount: rewAmount,
    available_balance: availBal,
    funding_shortfall: fundingShortfall,
    is_deficit: isDeficit,

    // Aliases for convenience across all services
    productPrice: price,
    commissionAmount: commAmount,
    commissionRate: commRate,
    totalPayout,
    shortfall: fundingShortfall,
    isDeficit,
    newBalanceAfterReserve
  };
}

module.exports = {
  round,
  generateOrderNumber,
  generateTaskNumber,
  generateTransactionId,
  calculateOrder
};
