import { useState, useRef, useCallback, useEffect } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const LS_PREFIX = 'statlab_band_v1.';

function loadHeight(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw != null) { const v = JSON.parse(raw); if (typeof v === 'number') return v; }
  } catch { /* ignore */ }
  return fallback;
}

function saveHeight(key, h) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(h)); } catch { /* ignore */ }
}

export function ResizableBand({
  title,
  collapsed,
  onToggleCollapse,
  height,
  minHeight = 120,
  maxHeight = 600,
  defaultHeight = 260,
  onResize,
  storageKey,
  children,
  ...rest
}) {
  const [internalHeight, setInternalHeight] = useState(() =>
    height != null ? height : loadHeight(storageKey, defaultHeight)
  );
  const [dragging, setDragging] = useState(false);
  const dragInfo = useRef(null);

  const effectiveHeight = height != null ? height : internalHeight;

  const beginDrag = useCallback((clientY) => {
    setDragging(true);
    dragInfo.current = { startY: clientY, startHeight: effectiveHeight };
    document.body.style.userSelect = 'none';
  }, [effectiveHeight]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    beginDrag(e.clientY);
  }, [beginDrag]);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    if (t) beginDrag(t.clientY);
  }, [beginDrag]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (clientY) => {
      const info = dragInfo.current;
      if (!info) return;
      const delta = info.startY - clientY;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, info.startHeight + delta));
      if (height == null) setInternalHeight(newHeight);
      onResize?.(newHeight);
    };

    const handleMouseMove = (e) => onMove(e.clientY);
    const handleTouchMove = (e) => { const t = e.touches[0]; if (t) onMove(t.clientY); };

    const endDrag = () => {
      const info = dragInfo.current;
      if (info && storageKey) saveHeight(storageKey, height != null ? height : internalHeight);
      setDragging(false);
      dragInfo.current = null;
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', endDrag);
      document.removeEventListener('touchcancel', endDrag);
    };
  }, [dragging, minHeight, maxHeight, height, onResize, storageKey, internalHeight]);

  const handleDoubleClick = useCallback(() => {
    onToggleCollapse?.();
  }, [onToggleCollapse]);

  return (
    <div
      className="no-print"
      style={{
        height: collapsed ? 28 : effectiveHeight,
        minHeight: collapsed ? 28 : minHeight,
        maxHeight: collapsed ? 28 : maxHeight,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'height 200ms ease',
        position: 'relative',
        borderTop: `1px solid ${C.border}`,
      }}
      {...rest}
    >
      {!collapsed && (
        <div
          className="no-print"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          style={{
            position: 'absolute', left: 0, right: 0, top: -2, height: 4,
            cursor: 'row-resize',
            background: dragging ? C.accent : 'transparent',
            transition: 'background 150ms',
            zIndex: 10,
          }}
          onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.background = C.border; }}
          onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.background = 'transparent'; }}
        />
      )}

      <div style={{
        padding: '4px 8px',
        borderBottom: collapsed ? 'none' : `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0, cursor: 'default',
      }}>
        <span style={{ fontSize: 8, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', flex: 1 }}>
          {title}
        </span>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          style={{
            background: 'transparent', border: 'none', color: C.dim,
            cursor: 'pointer', fontSize: 10, ...mono, padding: 0, lineHeight: 1,
          }}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}
