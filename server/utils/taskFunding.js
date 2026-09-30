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
  // A deficit/shortfall order remains pending until its full principal is
  // funded. It must never be completed by deducting more than the available
  // Working Balance; the caller will show the recharge/insufficient-funds
  // popup and leave the task/order in its shortfall state.
  if (userBalance < taskPrice) {
    return { ok: false, code: 'insufficient_balance', shortfall: taskPrice - userBalance, userBalance, taskPrice };
  }
  return { ok: true, userBalance, taskPrice };
}

module.exports = { evaluateTaskCompletionFunding, isDeficitFlag };
