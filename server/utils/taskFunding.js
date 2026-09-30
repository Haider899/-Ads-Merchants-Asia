function isDeficitFlag(value) {
  return value === true || value === 1 || String(value).trim().toLowerCase() === '1' || String(value).trim().toLowerCase() === 'true';
}

function evaluateTaskCompletionFunding(balance, price, isDeficit, options = {}) {
  const userBalance = Number(balance);
  const taskPrice = Number(price);
  if (!Number.isFinite(userBalance) || !Number.isFinite(taskPrice) || taskPrice < 0) {
    return { ok: false, code: 'invalid_funding', userBalance, taskPrice };
  }
  if (userBalance < 0) {
    return { ok: false, code: 'unfunded_deficit', deficit: Math.abs(userBalance), userBalance, taskPrice };
  }
  // A deficit task may skip the second principal deduction only when the start
  // path actually reserved it. frozen_balance is the durable evidence of that
  // reservation; the deficit flag alone is not enough because legacy/alternate
  // assignment paths can create the flag without changing the user's balance.
  if (isDeficitFlag(isDeficit)) {
    const reserveRecorded = Number(options.frozenBalance || 0) > 0 || options.principalReserved === true;
    if (reserveRecorded || userBalance >= taskPrice) return { ok: true, userBalance, taskPrice };
    return {
      ok: false,
      code: 'insufficient_balance',
      shortfall: taskPrice - userBalance,
      userBalance,
      taskPrice
    };
  }
  if (userBalance < taskPrice) {
    return { ok: false, code: 'insufficient_balance', shortfall: taskPrice - userBalance, userBalance, taskPrice };
  }
  return { ok: true, userBalance, taskPrice };
}

module.exports = { evaluateTaskCompletionFunding, isDeficitFlag };
