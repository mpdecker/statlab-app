// Nash Equilibrium for 2x2 game
export function nashEquilibrium(matrix) {
  if (!matrix || matrix.length !== 2 || !matrix[0] || matrix[0].length !== 2) return null;
  const [[a, b], [c, d]] = matrix[0].map((_, i) => matrix.map(r => r[i]));
  const p = (d - b) / (a - b - c + d || 1);
  const q = (d - c) / (a - b - c + d || 1);
  const pClean = Math.max(0, Math.min(1, +p.toFixed(4)));
  const qClean = Math.max(0, Math.min(1, +q.toFixed(4)));
  return { test: 'Nash Equilibrium', mixed: { p: pClean, q: qClean }, pure: [{ p: 0, q: 0 }, { p: 1, q: 1 }].filter(eq => true), apa: `NE: mixed (${pClean.toFixed(3)}, ${qClean.toFixed(3)})` };
}

// Shapley Value
export function shapleyValue(players, coalitionValues) {
  if (!players || !players.length || !coalitionValues) return null;
  const n = players.length;
  const shapley = Array(n).fill(0);
  const factorial = (x) => { let f = 1; for (let i = 2; i <= x; i++) f *= i; return f; };
  for (let i = 0; i < n; i++) {
    for (let s = 0; s < (1 << (n - 1)); s++) {
      const coalitionWithout = [];
      let mask = 0;
      for (let j = 0, bit = 0; j < n; j++) { if (j !== i) { if ((s >> bit) & 1) coalitionWithout.push(players[j]); bit++; } }
      const cSize = coalitionWithout.length;
      const keyWithout = coalitionWithout.sort().join('|');
      const valWithout = coalitionValues[keyWithout] || 0;
      const coalitionWith = [...coalitionWithout, players[i]].sort().join('|');
      const valWith = coalitionValues[coalitionWith] || 0;
      const margin = valWith - valWithout;
      shapley[i] += factorial(cSize) * factorial(n - cSize - 1) * margin / factorial(n);
    }
  }
  return { test: 'Shapley Value', values: players.map((p, i) => ({ player: p, shapley: +shapley[i].toFixed(4) })), n, apa: `Shapley: ${shapley.map(v => v.toFixed(2)).join(', ')}` };
}

// Dominated Strategies
export function dominatedStrategies(matrix) {
  if (!matrix || !matrix.length) return null;
  const n = matrix.length; const m = matrix[0]?.length || 0;
  const dominated = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let strictlyBetter = true;
      for (let k = 0; k < m; k++) { if (matrix[i][k] <= matrix[j][k]) strictlyBetter = false; }
      if (strictlyBetter) dominated.push({ player: 'row', strategy: j, dominatedBy: i });
    }
  }
  return { test: 'Dominated Strategies', dominated, nRows: n, nCols: m, apa: `Dominated: ${dominated.length} strategies` };
}

// Pareto Optimal
export function paretoOptimal(outcomes) {
  if (!outcomes || !outcomes.length) return null;
  const n = outcomes.length;
  const efficient = outcomes.map((o, i) => {
    const dominated = outcomes.some((p, j) => i !== j && p[0] >= o[0] && p[1] >= o[1] && (p[0] > o[0] || p[1] > o[1]));
    return !dominated;
  });
  return { test: 'Pareto Optimal', paretoEfficient: efficient, n, nEfficient: efficient.filter(v => v).length, apa: `Pareto: ${efficient.filter(v => v).length}/${n} efficient` };
}

// Auction Revenue
export function auctionRevenue(bids, type = 'first') {
  if (!bids || !bids.length || bids.length < 2) return null;
  const sorted = [...bids].sort((a, b) => b - a);
  const revenue = type === 'first' ? sorted[0] : sorted[1];
  return { test: 'Auction Revenue', revenue: +revenue.toFixed(4), type, nBids: bids.length, maxBid: +sorted[0].toFixed(4), apa: `Revenue: ${revenue.toFixed(2)} (${type}-price)` };
}
