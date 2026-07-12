import { C } from '../palette.js';
import { BUILTIN } from '../data/datasets.js';
import { getRecommendedDatasets } from '../config/datasetRecommendations.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

export function DatasetRecommendations({ activeTest, dsKey, onSelectDataset }) {
  const keys = getRecommendedDatasets(activeTest).filter(key => BUILTIN[key]);
  if (!keys.length) return null;

  return (
    <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
        Try this with
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {keys.map(key => {
          const active = key === dsKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDataset(key)}
              style={{
                background: active ? 'rgba(196,255,0,.12)' : 'transparent',
                border: `1px solid ${active ? C.accent : C.border}`,
                color: active ? C.accent : C.text,
                ...mono, fontSize: 9, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
              }}
            >
              {BUILTIN[key].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
