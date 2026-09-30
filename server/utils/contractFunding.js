function toCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function calculateSecondContractFunding(investmentAmount, totalBalance, workingBalance = 0) {
  const amountCents = toCents(investmentAmount);
  const totalCents = toCents(totalBalance);
  const workingCents = toCents(workingBalance);

  if (amountCents <= 0) return { ok: false, code: 'invalid_amount' };
  if (totalCents < amountCents) {
    return {
      ok: false,
      code: 'insufficient_total_balance',
      available: (totalCents / 100).toFixed(2),
      requested: (amountCents / 100).toFixed(2)
    };
  }

  return {
    ok: true,
    amount: (amountCents / 100).toFixed(2),
    totalBalanceAfter: ((totalCents - amountCents) / 100).toFixed(2),
    workingBalanceAfter: ((workingCents + amountCents) / 100).toFixed(2)
  };
}

module.exports = { calculateSecondContractFunding };
