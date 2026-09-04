// ── Session persistence ──────────────────────────────────────────────────────
// Shared between App.jsx (reads the saved session once, on first paint, to
// decide whether to show the landing page) and the lazy-loaded Workbench.jsx
// (keeps saving on every change once launched).
const LS_KEY = 'statlab_session_v2';

export function loadSession() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

export function saveSession(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

export function getInitialState() {
  const saved = loadSession();
  return {
    dsKey:      saved?.dsKey      || 'iris',
    xVar:       saved?.xVar       || 'sepalLength',
    yVar:       saved?.yVar       || 'petalLength',
    colorVar:   saved?.colorVar   || 'species',
    activeTest: saved?.activeTest || 't_welch',
    vizMode:    saved?.vizMode    || 'auto',
    hasLaunched: !!saved,
  };
}
