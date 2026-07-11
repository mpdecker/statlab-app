import { useState, useRef, useEffect } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

export function DatasetPicker({ datasets, activeKey, activeLabel, activeCount, customEntry, onSelect }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const rows = [
    ...(customEntry ? [{ key: 'custom', label: customEntry.label, desc: customEntry.desc, isCustom: true }] : []),
    ...datasets.map(([key, d]) => ({ key, label: d.label, desc: d.desc, isCustom: false })),
  ];

  return (
    <div ref={rootRef} style={{ position: 'relative' }} data-tutorial-target="dataset">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.text,
          ...mono, fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span>{`${activeLabel} · n=${activeCount}`}</span>
        <span style={{ color: C.dim, fontSize: 8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
          width: 260, maxHeight: 360, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}>
          <div style={{ padding: '6px 10px', fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', borderBottom: `1px solid ${C.border}` }}>
            Sample datasets
          </div>
          {rows.map(row => (
            <button
              key={row.key}
              type="button"
              onClick={() => { onSelect(row.key); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: row.key === activeKey ? 'rgba(196,255,0,.08)' : 'transparent',
                border: 'none', borderBottom: `1px solid ${C.border}`,
                color: row.key === activeKey ? C.accent : C.text,
                padding: '6px 10px', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600 }}>
                {`${row.isCustom ? '✓ ' : ''}${row.label}`}
              </div>
              <div style={{ fontSize: 8, color: C.dim, ...mono }}>{row.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
