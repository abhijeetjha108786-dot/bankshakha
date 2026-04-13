function getSignedAmount(tx) {
  if (!tx || typeof tx.amount !== "number") return 0;
  return tx.type === "debit" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
}

function isSameMonth(date, now) {
  const d = new Date(date);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isSameDay(date, now) {
  const d = new Date(date);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function calculateEarningStats(transactions) {
  const now = new Date();

  let totalEarnedValue = 0;
  let monthlyEarnedValue = 0;
  let todayEarning = 0;

  for (const tx of transactions) {
    const signed = getSignedAmount(tx);
    totalEarnedValue += signed;

    if (isSameMonth(tx.createdAt, now)) {
      monthlyEarnedValue += signed;
    }

    if (isSameDay(tx.createdAt, now)) {
      todayEarning += signed;
    }
  }

  return {
    totalEarnedValue,
    monthlyEarnedValue,
    todayEarning,
  };
}

module.exports = {
  getSignedAmount,
  calculateEarningStats,
};
