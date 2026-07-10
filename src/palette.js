export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Barlow+Condensed:wght@400;600;700;900&display=swap');`;

export const PAL = [
  "#c4ff00","#ff4d6d","#4daaff","#ff9f4d","#bf5af2",
  "#4dffd2","#ff6bd6","#ffe44d","#f87171","#34d399",
  "#60a5fa","#fbbf24",
  // batch expansion
  "#f97316","#06b6d4","#22c55e","#8b5cf6","#ec4899",
  "#14b8a6","#eab308","#6366f1","#84cc16","#f43f5e",
  "#0ea5e9","#a855f7","#10b981","#ef4444","#e11d48",
  "#7c3aed","#059669","#d946ef","#ea580c","#2563eb",
  "#be123c","#c026d3","#65a30d","#0284c7","#b91c1c",
  "#4f46e5","#15803d","#c2410c","#1d4ed8","#9d174d",
  "#0f766e","#a21caf","#4d7c0f","#0369a1","#991b1b",
];

export const C = {
  bg:      "#070b10",
  panel:   "#0d1219",
  border:  "#1a2535",
  accent:  "#c4ff00",
  text:    "#b8c8d8",
  dim:     "#4a5a6a",
  chartBg: "#0a0f18",
  neg:     "#ff4d6d",
  pos:     "#4daaff",
  warn:    "#ff9f4d",
  ok:      "#4dffd2",
  purple:  "#bf5af2",
  orange:  "#f97316",
  cyan:    "#06b6d4",
  green:   "#22c55e",
  rose:    "#ec4899",
  teal:    "#14b8a6",
  yellow:  "#eab308",
  indigo:  "#6366f1",
  lime:    "#84cc16",
  red:     "#f43f5e",
  sky:     "#0ea5e9",
  violet:  "#a855f7",
  emerald: "#10b981",
};

export const GLOBAL_CSS = `
  select option { background: #0d1219; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #070b10; }
  ::-webkit-scrollbar-thumb { background: #1a2535; border-radius: 3px; }
  * { box-sizing: border-box; }
  button:disabled { opacity: .3; cursor: default; }
  input { outline: none; }
  input[type=checkbox] { cursor: pointer; }
  textarea { resize: vertical; }
`;
