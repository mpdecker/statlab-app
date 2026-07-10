/** Shared deterministic fixtures for core statistical modules */
import { mulberry32 } from './phase3.js';

export { mulberry32 };

export const GROUP_A = [2, 3, 4, 5, 6, 7, 8];
export const GROUP_B = [5, 6, 7, 8, 9, 10, 11];
export const GROUP_C = [8, 9, 10, 11, 12, 13, 14];

export function mkGroups() {
  return [
    { name: 'A', vals: GROUP_A },
    { name: 'B', vals: GROUP_B },
    { name: 'C', vals: GROUP_C },
  ];
}

export function mkTabular(seed = 42, n = 72) {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    group: i < n / 3 ? 'A' : i < (2 * n) / 3 ? 'B' : 'C',
    cat1: i % 2 ? 'yes' : 'no',
    cat2: i % 3 === 0 ? 'low' : i % 3 === 1 ? 'mid' : 'high',
    treat: i < n / 2 ? 'T' : 'C',
    x: +(i * 0.15 + rnd() * 0.5).toFixed(4),
    y: +(10 + i * 0.12 + (i < n / 2 ? 3 : 0) + rnd()).toFixed(4),
    z: i % 6,
    m: +(5 + i * 0.08 + rnd() * 0.3).toFixed(4),
    school: `S${i % 10}`,
    rm1: 40 + i * 0.3 + rnd(),
    rm2: 42 + i * 0.25 + rnd(),
    rm3: 44 + i * 0.2 + rnd(),
    item1: 1 + (i % 5),
    item2: 2 + (i % 4),
    item3: 1 + ((i + 1) % 5),
    item4: 3 + (i % 3),
  }));
}

export function mkRmMatrix(rows) {
  return rows.map(r => [r.rm1, r.rm2, r.rm3]);
}

export function mkScaleMatrix(n = 35, k = 5, seed = 1) {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, () =>
    Array.from({ length: k }, () => +(1 + rnd() * 4).toFixed(2)));
}

export function mk2x2Table() {
  return [
    ...Array(12).fill({ col1: 'A', col2: 'X' }),
    ...Array(18).fill({ col1: 'A', col2: 'Y' }),
    ...Array(20).fill({ col1: 'B', col2: 'X' }),
    ...Array(22).fill({ col1: 'B', col2: 'Y' }),
  ];
}

export function mkMetaStudies() {
  return [
    { label: 'S1', d: 0.35, se: 0.12 },
    { label: 'S2', d: 0.52, se: 0.15 },
    { label: 'S3', d: 0.28, se: 0.11 },
    { label: 'S4', d: 0.61, se: 0.18 },
  ];
}
