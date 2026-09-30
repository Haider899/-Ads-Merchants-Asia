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
  // Assigned/deficit orders use the same submit-time accounting as the normal
  // daily task flow. Their principal is deducted when the user submits, so an
  // admin-assigned order may legitimately take Working Balance below zero.
  // The caller still rejects an already-negative balance before another task.
  if (!isDeficitFlag(isDeficit) && userBalance < taskPrice) {
    return { ok: false, code: 'insufficient_balance', shortfall: taskPrice - userBalance, userBalance, taskPrice };
  }
  return { ok: true, userBalance, taskPrice };
}

module.exports = { evaluateTaskCompletionFunding, isDeficitFlag };
