export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Barlow+Condensed:wght@400;600;700;900&display=swap');`;

export const PAL = [
  "#c4ff00","#ff4d6d","#4daaff","#ff9f4d","#bf5af2",
  "#4dffd2","#ff6bd6","#ffe44d","#f87171","#34d399",
  "#60a5fa","#fbbf24",
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
