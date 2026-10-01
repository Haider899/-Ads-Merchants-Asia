function toCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function calculateApprovedDepositTotal(deposits = []) {
  return deposits.reduce((sum, deposit) => {
    const status = String(deposit.status || '').toLowerCase();
    return sum + (status === 'approved' || status === 'verified'
      ? Math.max(0, toCents(deposit.amount))
      : 0);
  }, 0);
}

function calculateDepositContractMatch(investmentAmount, deposits = []) {
  const contractCents = toCents(investmentAmount);
  const approvedCents = deposits.reduce((sum, deposit) =>
    sum + (String(deposit.status || '').toLowerCase() === 'approved' ? Math.max(0, toCents(deposit.amount)) : 0), 0);
  const heldCents = deposits.reduce((sum, deposit) =>
    sum + (String(deposit.status || '').toLowerCase() === 'verified' ? Math.max(0, toCents(deposit.amount)) : 0), 0);

  return {
    matches: contractCents > 0 && contractCents === approvedCents + heldCents,
    contractAmount: (contractCents / 100).toFixed(2),
    contractCents,
    approvedCents,
    heldCents,
    verifiedReleaseCents: heldCents,
    matchedDepositCents: approvedCents + heldCents
  };
}

module.exports = { calculateApprovedDepositTotal, calculateDepositContractMatch };
