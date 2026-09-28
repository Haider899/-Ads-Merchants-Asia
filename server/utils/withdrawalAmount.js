const MIN_WITHDRAWAL_AMOUNT = 10;

function parseWholeDollarAmount(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!/^\d+(?:\.0+)?$/.test(normalized)) return null;

  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function effectiveWithdrawalMinimum(userOverride, systemSetting) {
  const parseMinimum = value => {
    if (value === null || value === undefined || value === '') return null;
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  };
  const override = parseMinimum(userOverride);
  const configured = parseMinimum(systemSetting);
  return Math.max(MIN_WITHDRAWAL_AMOUNT, override || configured || MIN_WITHDRAWAL_AMOUNT);
}

module.exports = {
  MIN_WITHDRAWAL_AMOUNT,
  parseWholeDollarAmount,
  effectiveWithdrawalMinimum
};
