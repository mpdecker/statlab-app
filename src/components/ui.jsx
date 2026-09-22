import { C, PAL } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

// ── Stat chip ─────────────────────────────────────────────────────────────────
export function Chip({ label, value, color, sub }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "3px 8px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <span style={{ fontSize: 7, color: C.dim, ...mono, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 11, color: color || C.accent, ...mono, fontWeight: 600, whiteSpace: "nowrap" }}>{value}</span>
      {sub && <span style={{ fontSize: 7, color: C.dim, ...mono }}>{sub}</span>}
    </div>
  );
}

// ── Dropdown select ───────────────────────────────────────────────────────────
export function Sel({ label, value, onChange, options, width }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {label && <label style={{ fontSize: 8, color: C.dim, ...mono, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 10, padding: "3px 5px", borderRadius: 3, outline: "none", cursor: "pointer", width }}
      >
        {options.map(o => <option key={String(o.value ?? o)} value={String(o.value ?? o)}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────
export function Inp({ label, value, onChange, width, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {label && <label style={{ fontSize: 8, color: C.dim, ...mono, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</label>}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 10, padding: "3px 5px", borderRadius: 3, width: width || 70 }}
      />
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function TA({ label, value, onChange, rows = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {label && <label style={{ fontSize: 8, color: C.dim, ...mono, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 9, padding: "4px 6px", borderRadius: 3, width: "100%" }}
      />
    </div>
  );
}

// ── Checkbox list ─────────────────────────────────────────────────────────────
export function CheckList({ label, items, selected, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {label && <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</div>}
      {items.map(c => (
        <label key={c} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, ...mono, color: selected.includes(c) ? C.accent : C.text, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={selected.includes(c)}
            onChange={e => onChange(s => e.target.checked ? [...s, c] : s.filter(x => x !== c))}
            style={{ accentColor: C.accent }}
          />
          {c}
        </label>
      ))}
    </div>
  );
}

// ── Group editor (add/remove named groups, each a checklist) ──────────────────
export function GroupEditor({ label, items, groups, onChange }) {
  function addGroup() { onChange([...groups, { items: [] }]); }
  function removeGroup(gi) { onChange(groups.filter((_, i) => i !== gi)); }
  function toggleItem(gi, item, checked) {
    onChange(groups.map((g, i) => i === gi
      ? { items: checked ? [...g.items, item] : g.items.filter(x => x !== item) }
      : g));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</div>}
      {groups.map((g, gi) => (
        <div key={gi} style={{ border: `1px solid ${C.border}`, borderRadius: 3, padding: 5, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, ...mono, color: C.dim }}>Group {gi + 1}</span>
            <button
              type="button"
              onClick={() => removeGroup(gi)}
              style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, padding: "1px 6px", borderRadius: 3, cursor: "pointer", fontSize: 10 }}
            >×</button>
          </div>
          {items.map(it => (
            <label key={it} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, ...mono, color: g.items.includes(it) ? C.accent : C.text, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={g.items.includes(it)}
                onChange={e => toggleItem(gi, it, e.target.checked)}
                style={{ accentColor: C.accent }}
              />
              {it}
            </label>
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={addGroup}
        style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, padding: "3px 8px", borderRadius: 3, cursor: "pointer", fontSize: 9, ...mono, alignSelf: "flex-start" }}
      >+ Add group</button>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
export function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
      <span style={{ fontSize: 10, color: C.dim, ...mono, flexShrink: 0 }}>{label}</span>
      <div
        onClick={() => onChange(!value)}
        style={{ width: 30, height: 15, borderRadius: 8, position: "relative", background: value ? C.accent : C.border, cursor: "pointer", flexShrink: 0, transition: "background .15s" }}
      >
        <div style={{ position: "absolute", top: 2, left: value ? 15 : 2, width: 11, height: 11, borderRadius: "50%", background: value ? "#000" : C.dim, transition: "left .15s" }} />
      </div>
    </div>
  );
}

// ── Normality badge ───────────────────────────────────────────────────────────
export function NormBadge({ nt, label }) {
  if (!nt) return null;
  return (
    <div style={{ fontSize: 8, ...mono, color: nt.normal ? C.ok : C.warn, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "2px 6px", flexShrink: 0 }}>
      {label}: K²={nt.stat} {nt.p < .001 ? "p<.001" : `p=${nt.p.toFixed(3)}`} {nt.normal ? "✓" : "⚠"}
    </div>
  );
}

// ── APA block ─────────────────────────────────────────────────────────────────
export function APABlock({ text, onCopy, copyMsg }) {
  if (!text) return null;
  return (
    <div style={{ background: "rgba(77,170,255,.05)", border: `1px solid rgba(77,170,255,.2)`, borderRadius: 4, padding: "6px 10px", fontSize: 10, ...mono, color: C.text, lineHeight: 1.7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <span style={{ fontSize: 7, color: C.pos, textTransform: "uppercase", letterSpacing: ".1em" }}>APA 7</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {copyMsg && <span style={{ fontSize: 8, color: C.ok }}>{copyMsg}</span>}
          <button onClick={onCopy} style={{ fontSize: 8, ...mono, background: "transparent", border: `1px solid ${C.border}`, color: C.dim, padding: "1px 6px", borderRadius: 3, cursor: "pointer" }}>copy</button>
        </div>
      </div>
      {text}
    </div>
  );
}

// ── Significance badge ────────────────────────────────────────────────────────
export function SigBadge({ p, alpha = .05 }) {
  if (p == null) return null;
  const isSig = p < alpha;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ padding: "3px 12px", borderRadius: 3, background: isSig ? "rgba(77,255,210,.1)" : "rgba(255,77,109,.08)", border: `1px solid ${isSig ? C.ok : C.neg}`, fontSize: 12, ...mono, fontWeight: 700, color: isSig ? C.ok : C.neg }}>
        {isSig ? "✓ SIGNIFICANT" : "✗ NOT SIGNIFICANT"} at α={alpha}
      </div>
      <div style={{ fontSize: 10, ...mono, color: isSig ? C.ok : C.neg }}>{p < .001 ? "p < .001" : `p = ${p.toFixed(3)}`}</div>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionHead({ label, color }) {
  return <div style={{ fontSize: 8, color: color || C.dim, ...mono, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4, marginBottom: 2 }}>{label}</div>;
}

// ── Grid tooltip ──────────────────────────────────────────────────────────────
export function CTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: "6px 10px", ...mono, fontSize: 10, color: C.text, borderRadius: 4 }}>
      {label != null && <div style={{ color: C.dim, fontSize: 9, marginBottom: 2 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.accent }}>
          {p.name}: <b>{typeof p.value === "number" ? p.value.toFixed(4) : p.value}</b>
        </div>
      ))}
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
export function ActionBtn({ label, onClick, disabled, accent }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: accent ? C.accent : "transparent", color: accent ? "#000" : C.text, border: `1px solid ${accent ? C.accent : C.border}`, ...mono, fontWeight: 700, fontSize: 10, padding: "4px 12px", borderRadius: 3, cursor: "pointer" }}
    >
      {label}
    </button>
  );
}

// ── Mini link button ──────────────────────────────────────────────────────────
export function LinkBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ fontSize: 8, ...mono, background: "transparent", border: `1px solid ${C.border}`, color: C.dim, padding: "2px 6px", borderRadius: 3, cursor: "pointer" }}
    >
      {label}
    </button>
  );
}
