const MAX_INVESTMENT_AMOUNT = 9999999999999.99;

function parseInvestmentAmount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;

  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_INVESTMENT_AMOUNT) return null;
  return Number(amount.toFixed(2));
}

module.exports = { MAX_INVESTMENT_AMOUNT, parseInvestmentAmount };
