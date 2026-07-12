import Papa from 'papaparse';
import { clamp } from 'statlab/math/core';

const _cache = {};
export { _cache };

const MAX_CSV_ROWS = 100_000;

export async function loadDataset(key) {
  if (_cache[key]) return _cache[key];
  const entry = BUILTIN[key];
  if (!entry?.url) throw new Error(`No URL for dataset: ${key}`);
  return new Promise((resolve, reject) => {
    Papa.parse(entry.url, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length) console.warn('CSV parse warnings:', errors);
        let rows = Array.isArray(data) ? data : [];
        if (!rows.length) {
          reject(new Error(`Dataset "${key}" returned no rows`));
          return;
        }
        if (rows.length > MAX_CSV_ROWS) rows = rows.slice(0, MAX_CSV_ROWS);
        if (key === 'schools') {
          rows = data.map(r => {
            const id = r.school ?? r.School ?? r.school_id;
            const { school, School, school_id, ...rest } = r;
            return { school_id: id, ...rest };
          });
        }
        if (key === 'mathachieve') {
          rows = data.map(r => {
            const id = r.School ?? r.school;
            const copy = { ...r };
            if (id != null) copy.school_id = id;
            delete copy.School;
            return copy;
          });
        }
        _cache[key] = rows;
        resolve(rows);
      },
      error: reject,
    });
  });
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
}
function randn(rng, μ, σ) {
  const u = Math.max(rng(), 1e-10);
  return μ + σ * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export function makeIris() {
  const rng = lcg(1337);
  const specs = [
    { species: "setosa",     sl: [5.01, .35], sw: [3.43, .38], pl: [1.46, .17], pw: [.25, .11] },
    { species: "versicolor", sl: [5.94, .52], sw: [2.77, .31], pl: [4.26, .47], pw: [1.33, .20] },
    { species: "virginica",  sl: [6.59, .64], sw: [2.97, .32], pl: [5.55, .55], pw: [2.03, .27] },
  ];
  return specs.flatMap(({ species, sl, sw, pl, pw }) =>
    Array.from({ length: 50 }, () => ({
      species,
      sepalLength: +clamp(randn(rng, sl[0], sl[1]), 4, 8).toFixed(2),
      sepalWidth:  +clamp(randn(rng, sw[0], sw[1]), 1.5, 5).toFixed(2),
      petalLength: +clamp(randn(rng, pl[0], pl[1]), .5, 7).toFixed(2),
      petalWidth:  +clamp(randn(rng, pw[0], pw[1]), 0, 2.8).toFixed(2),
    }))
  );
}

export function makeDiamonds() {
  const rng = lcg(9999);
  const cuts   = ["Fair", "Good", "Very Good", "Premium", "Ideal"];
  const colors = ["J", "I", "H", "G", "F", "E", "D"];
  const cutMu  = { Fair: .9, Good: .75, "Very Good": .65, Premium: .60, Ideal: .55 };
  return Array.from({ length: 200 }, () => {
    const cut   = cuts[Math.floor(rng() * cuts.length)];
    const color = colors[Math.floor(rng() * colors.length)];
    const carat = +clamp(randn(rng, cutMu[cut], .35), .2, 5).toFixed(2);
    return {
      carat, cut, color,
      price: Math.round(2200 * carat ** 1.7 * (1 + (7 - colors.indexOf(color)) * .03) * (.85 + rng() * .4)),
      depth: +clamp(randn(rng, 61.7, 1.4), 56, 70).toFixed(1),
      table: +clamp(randn(rng, 57.5, 2.2), 50, 70).toFixed(0),
    };
  });
}

export function makeGapminder() {
  return [
    { country: "Afghanistan", continent: "Asia",     lifeExp: 43.8, gdpPercap: 975,   pop: 31889923 },
    { country: "Albania",     continent: "Europe",   lifeExp: 76.4, gdpPercap: 5937,  pop: 3600523 },
    { country: "Algeria",     continent: "Africa",   lifeExp: 72.3, gdpPercap: 6223,  pop: 33333216 },
    { country: "Angola",      continent: "Africa",   lifeExp: 42.7, gdpPercap: 4797,  pop: 12420476 },
    { country: "Argentina",   continent: "Americas", lifeExp: 75.3, gdpPercap: 12779, pop: 40301927 },
    { country: "Australia",   continent: "Oceania",  lifeExp: 81.2, gdpPercap: 34435, pop: 20434176 },
    { country: "Brazil",      continent: "Americas", lifeExp: 72.4, gdpPercap: 9066,  pop: 190010647 },
    { country: "Canada",      continent: "Americas", lifeExp: 80.7, gdpPercap: 36319, pop: 33390141 },
    { country: "China",       continent: "Asia",     lifeExp: 72.9, gdpPercap: 4959,  pop: 1318683096 },
    { country: "Egypt",       continent: "Africa",   lifeExp: 71.3, gdpPercap: 5581,  pop: 80264543 },
    { country: "Ethiopia",    continent: "Africa",   lifeExp: 52.9, gdpPercap: 690,   pop: 76511887 },
    { country: "France",      continent: "Europe",   lifeExp: 80.7, gdpPercap: 30470, pop: 61083916 },
    { country: "Germany",     continent: "Europe",   lifeExp: 79.4, gdpPercap: 32170, pop: 82400996 },
    { country: "Ghana",       continent: "Africa",   lifeExp: 60.0, gdpPercap: 1328,  pop: 22873338 },
    { country: "India",       continent: "Asia",     lifeExp: 64.7, gdpPercap: 2452,  pop: 1110396331 },
    { country: "Indonesia",   continent: "Asia",     lifeExp: 70.6, gdpPercap: 3541,  pop: 223547000 },
    { country: "Italy",       continent: "Europe",   lifeExp: 80.5, gdpPercap: 28570, pop: 58147733 },
    { country: "Japan",       continent: "Asia",     lifeExp: 82.6, gdpPercap: 31656, pop: 127467972 },
    { country: "Kenya",       continent: "Africa",   lifeExp: 54.1, gdpPercap: 1463,  pop: 35610177 },
    { country: "Mexico",      continent: "Americas", lifeExp: 76.2, gdpPercap: 11978, pop: 108700891 },
    { country: "Nigeria",     continent: "Africa",   lifeExp: 46.9, gdpPercap: 2014,  pop: 135031164 },
    { country: "Norway",      continent: "Europe",   lifeExp: 80.2, gdpPercap: 49357, pop: 4627926 },
    { country: "Pakistan",    continent: "Asia",     lifeExp: 65.5, gdpPercap: 2606,  pop: 169270617 },
    { country: "Philippines", continent: "Asia",     lifeExp: 71.7, gdpPercap: 3190,  pop: 91077287 },
    { country: "Poland",      continent: "Europe",   lifeExp: 75.6, gdpPercap: 15390, pop: 38518241 },
    { country: "Russia",      continent: "Europe",   lifeExp: 66.0, gdpPercap: 9860,  pop: 142402665 },
    { country: "South Africa",continent: "Africa",   lifeExp: 49.3, gdpPercap: 9270,  pop: 43997828 },
    { country: "Spain",       continent: "Europe",   lifeExp: 80.9, gdpPercap: 28821, pop: 40448191 },
    { country: "Sweden",      continent: "Europe",   lifeExp: 80.9, gdpPercap: 33860, pop: 9031088 },
    { country: "UK",          continent: "Europe",   lifeExp: 79.4, gdpPercap: 33203, pop: 60776238 },
    { country: "USA",         continent: "Americas", lifeExp: 78.2, gdpPercap: 42952, pop: 301139947 },
    { country: "Vietnam",     continent: "Asia",     lifeExp: 74.2, gdpPercap: 2442,  pop: 85262356 },
    { country: "Zimbabwe",    continent: "Africa",   lifeExp: 43.5, gdpPercap: 470,   pop: 12311143 },
  ];
}

export function makeLifeSat() {
  const rng = lcg(4242);
  const subscales = [['autonomy', 'auto'], ['competence', 'comp'], ['relatedness', 'rel']];
  const cohorts = ["A", "B", "C"];
  return Array.from({ length: 200 }, (_, i) => {
    const row = { cohort: cohorts[i % 3] };
    subscales.forEach(([, prefix]) => {
      const trait = clamp(randn(rng, 3, 0.8), 1, 5);
      for (let j = 1; j <= 4; j++) {
        const raw = j === 4 ? 6 - trait : trait;
        row[`${prefix}${j}`] = Math.round(clamp(raw + randn(rng, 0, 0.4), 1, 5));
      }
    });
    return row;
  });
}

export function makeVocabTest() {
  const rng = lcg(9001);
  const grades = ["9th", "10th", "11th", "12th"];
  const nItems = 15;
  const difficulty = (i) => -2 + (4 * i) / (nItems - 1);
  const discrimination = (i) => 0.7 + (i % 5) * 0.25;
  return Array.from({ length: 300 }, (_, p) => {
    const theta = randn(rng, 0, 1);
    const row = { grade: grades[p % 4] };
    for (let i = 0; i < nItems; i++) {
      const b = difficulty(i);
      const a = discrimination(i);
      const prob = 1 / (1 + Math.exp(-a * (theta - b)));
      row[`q${i + 1}`] = rng() < prob ? 1 : 0;
    }
    return row;
  });
}

/** Per-dataset default axes for Quick View after switch */
export const DATASET_DEFAULTS = {
  iris: { x: 'sepalLength', y: 'petalLength', color: 'species' },
  diamonds: { x: 'carat', y: 'price', color: 'cut' },
  gapminder: { x: 'gdpPercap', y: 'lifeExp', color: 'continent' },
  cps: { x: 'education', y: 'wage', color: 'sex' },
  salaries: { x: 'yrs.since.phd', y: 'salary', color: 'rank' },
  schools: { x: 'standLRT', y: 'normexam', color: 'type' },
  mathachieve: { x: 'SES', y: 'MathAch', color: 'Sex' },
  sleep: { x: 'Days', y: 'Reaction', color: 'Subject' },
  affairs: { x: 'age', y: 'affairs', color: 'gender' },
  lifesat: { x: 'auto1', y: 'comp1', color: 'cohort' },
  vocabtest: { x: 'q1', y: 'q2', color: 'grade' },
};

export const BUILTIN = {
  iris: {
    label: "Iris", desc: "150 flowers · Fisher 1936",
    numeric: ["sepalLength", "sepalWidth", "petalLength", "petalWidth"],
    categorical: ["species"],
    make: makeIris,
  },
  diamonds: {
    label: "Diamonds", desc: "200 diamonds · cut/color/price",
    numeric: ["carat", "price", "depth", "table"],
    categorical: ["cut", "color"],
    make: makeDiamonds,
  },
  gapminder: {
    label: "Gapminder", desc: "33 countries · 2007",
    numeric: ["lifeExp", "gdpPercap", "pop"],
    categorical: ["continent"],
    make: makeGapminder,
  },
  cps: {
    label: 'CPS 1985',
    desc: 'wage · education · sector',
    url: 'https://vincentarelbundock.github.io/Rdatasets/csv/Ecdat/CPS1985.csv',
    make: null,
    numeric: ['wage', 'education', 'experience'],
    categorical: ['sex', 'minority', 'union', 'sector'],
  },
  salaries: {
    label: 'Salaries',
    desc: 'faculty salaries · rank · discipline',
    url: 'https://vincentarelbundock.github.io/Rdatasets/csv/carData/Salaries.csv',
    make: null,
    numeric: ['yrs.since.phd', 'yrs.service', 'salary'],
    categorical: ['rank', 'discipline', 'sex'],
  },
  schools: {
    label: 'Schools',
    desc: 'mlmRev · nested schools · HLM demos',
    url: 'https://vincentarelbundock.github.io/Rdatasets/csv/mlmRev/Schools.csv',
    make: null,
    numeric: ['normexam', 'standLRT'],
    categorical: ['school_id', 'sex', 'type'],
  },
  mathachieve: {
    label: 'Math Achieve',
    desc: 'nlme · MathAch · SES · school nested',
    url: 'https://vincentarelbundock.github.io/Rdatasets/csv/nlme/MathAchieve.csv',
    make: null,
    numeric: ['SES', 'MathAch'],
    categorical: ['school_id', 'Minority', 'Sex'],
  },
  sleep: {
    label: 'Sleep Study',
    desc: 'reaction time · days · subject',
    url: 'https://vincentarelbundock.github.io/Rdatasets/csv/lme4/sleepstudy.csv',
    make: null,
    numeric: ['Reaction', 'Days'],
    categorical: ['Subject'],
  },
  affairs: {
    label: 'Affairs',
    desc: 'extramarital affairs survey',
    url: 'https://vincentarelbundock.github.io/Rdatasets/csv/AER/Affairs.csv',
    make: null,
    numeric: ['affairs', 'age', 'yearsmarried', 'religiousness', 'education', 'occupation', 'rating'],
    categorical: ['gender', 'children'],
  },
  lifesat: {
    label: "Life Satisfaction Survey", desc: "200 respondents · 12-item scale · 3 subscales",
    numeric: ["auto1", "auto2", "auto3", "auto4", "comp1", "comp2", "comp3", "comp4", "rel1", "rel2", "rel3", "rel4"],
    categorical: ["cohort"],
    make: makeLifeSat,
  },
  vocabtest: {
    label: "Vocabulary Test", desc: "300 respondents · 15 binary items · IRT-structured",
    numeric: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12", "q13", "q14", "q15"],
    categorical: ["grade"],
    make: makeVocabTest,
  },
};

/** Auto-detect numeric vs categorical columns from parsed CSV rows */
export function detectCols(rows) {
  if (!rows.length) return { numeric: [], categorical: [] };
  const numeric = [], categorical = [];
  Object.keys(rows[0]).forEach(k => {
    const vals = rows.map(r => r[k]).filter(v => v != null && v !== "");
    if (!vals.length) { categorical.push(k); return; }
    const numCount = vals.filter(v => Number.isFinite(+v)).length;
    (numCount / vals.length > 0.6 ? numeric : categorical).push(k);
  });
  return { numeric, categorical };
}
