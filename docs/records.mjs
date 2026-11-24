// These are challenge parameter sets, ordered by the design paper's first ePrint.
// Only the score ledger below determines official standings.
const forsEntry = "/tree/main/examples/entries/construction/";
const porsRules = "/blob/main/RULES.md#pors-family-references";
export const constructions = [
  { name: "FORS", bytes: 2432, certified: true, paper: "2019/1086", source: forsEntry + "fors-2432" },
  { name: "FORS+C", bytes: 2132, certified: true, paper: "2022/778", source: forsEntry + "fors-c-2132" },
  { name: "FORS+C", bytes: 2020, certified: true, paper: "2022/778", source: forsEntry + "fors-c-2020" },
  { name: "PORS+FP", bytes: 1780, certified: false, paper: "2025/2069", source: porsRules },
  { name: "BPORS+FP", bytes: 1492, certified: false, paper: "2026/1328", source: porsRules },
  { name: "BPORS-C+BFP", bytes: 1188, certified: false, paper: "2026/2374", source: porsRules },
  { name: "GRS-CC", bytes: 756, certified: false, paper: "2026/2502", source: "/tree/main/examples/grs-cc" },
];

// One sample per accepted snapshot, in the judge's intake order. Only records move a bound.
export function boundSeries(ledger) {
  const state = {
    lower: ledger.opening["lower-bound"],
    upper: ledger.opening.construction,
  };
  const samples = [{ ...state, label: "Opening" }];
  for (const entry of ledger.history) {
    if (entry.record) {
      if (entry.track === "lower-bound") state.lower = entry.bound_bytes;
      if (entry.track === "construction") state.upper = entry.bound_bytes;
    }
    samples.push({ ...state, label: "PR #" + entry.pr });
  }
  return samples;
}

export function axis(values) {
  let low = Infinity,
    high = -Infinity;
  for (const v of values)
    if (Number.isFinite(v)) {
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
  if (!Number.isFinite(low)) return { min: 0, max: 4, step: 1 };
  const rough = Math.max(1, (high - low) / 3.5);
  const unit = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].find((k) => k * unit >= rough) * unit;
  let min = Math.max(0, Math.floor(low / step) * step);
  let max = Math.ceil(high / step) * step;
  if (min === low && min >= step) min -= step;
  if (max === high) max += step;
  return { min, max, step };
}
