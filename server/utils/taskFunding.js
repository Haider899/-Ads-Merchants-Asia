function evaluateTaskCompletionFunding(balance, price, isDeficit) {
  const userBalance = Number(balance);
  const taskPrice = Number(price);
  if (!Number.isFinite(userBalance) || !Number.isFinite(taskPrice) || taskPrice < 0) {
    return { ok: false, code: 'invalid_funding', userBalance, taskPrice };
  }
  if (userBalance < 0) {
    return { ok: false, code: 'unfunded_deficit', deficit: Math.abs(userBalance), userBalance, taskPrice };
  }
  // Deficit orders already reserved their principal when they started. Once the
  // shortfall is cleared, completion must not deduct the principal a second time.
  if (isDeficit) return { ok: true, userBalance, taskPrice };
  if (userBalance < taskPrice) {
    return { ok: false, code: 'insufficient_balance', shortfall: taskPrice - userBalance, userBalance, taskPrice };
  }
  return { ok: true, userBalance, taskPrice };
}

module.exports = { evaluateTaskCompletionFunding };
