const DEFAULT_MINIMUM_DEPOSIT = 1;

function positiveAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function effectiveDepositMinimum(user, settings = {}) {
  const userMinimum = positiveAmount(user && user.custom_min_deposit);
  if (userMinimum !== null) return userMinimum;
  const systemMinimum = positiveAmount(settings && settings.min_deposit);
  return systemMinimum === null ? DEFAULT_MINIMUM_DEPOSIT : systemMinimum;
}

module.exports = {
  DEFAULT_MINIMUM_DEPOSIT,
  effectiveDepositMinimum,
  positiveAmount
};
