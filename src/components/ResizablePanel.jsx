import { useState, useRef, useCallback, useEffect } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const LS_PREFIX = 'statlab_panels_v1.';

function loadWidth(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw != null) { const v = JSON.parse(raw); if (typeof v === 'number') return v; }
  } catch { /* ignore */ }
  return fallback;
}

function saveWidth(key, w) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(w)); } catch { /* ignore */ }
}

export function ResizablePanel({
  title,
  collapsed,
  onToggleCollapse,
  width,
  minWidth = 100,
  maxWidth = 600,
  defaultWidth = 240,
  onResize,
  side = 'right',
  storageKey,
  collapsedRender,
  children,
  ...rest
}) {
  const [internalWidth, setInternalWidth] = useState(() =>
    width != null ? width : loadWidth(storageKey, defaultWidth)
  );
  const [dragging, setDragging] = useState(false);
  const dragInfo = useRef(null);

  const effectiveWidth = width != null ? width : internalWidth;

  const beginDrag = useCallback((clientX) => {
    setDragging(true);
    dragInfo.current = { startX: clientX, startWidth: effectiveWidth };
    document.body.style.userSelect = 'none';
  }, [effectiveWidth]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    beginDrag(e.clientX);
  }, [beginDrag]);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    if (t) beginDrag(t.clientX);
  }, [beginDrag]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (clientX) => {
      const info = dragInfo.current;
      if (!info) return;
      const delta = side === 'right' ? clientX - info.startX : info.startX - clientX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, info.startWidth + delta));
      if (width == null) setInternalWidth(newWidth);
      onResize?.(newWidth);
    };

    const handleMouseMove = (e) => onMove(e.clientX);
    const handleTouchMove = (e) => { const t = e.touches[0]; if (t) onMove(t.clientX); };

    const endDrag = () => {
      const info = dragInfo.current;
      if (info && storageKey) saveWidth(storageKey, width != null ? width : internalWidth);
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
  }, [dragging, side, minWidth, maxWidth, width, onResize, storageKey, internalWidth]);

  const handleDoubleClick = useCallback(() => {
    onToggleCollapse?.();
  }, [onToggleCollapse]);

  if (collapsed && !collapsedRender) return null;

  const collapsedWidth = collapsedRender ? 36 : 0;

  return (
    <div
      className="no-print"
      style={{
        width: collapsed ? collapsedWidth : effectiveWidth,
        minWidth: collapsed ? 0 : minWidth,
        maxWidth: collapsed ? collapsedWidth : maxWidth,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 200ms ease',
        position: 'relative',
        borderRight: side === 'right' ? `1px solid ${C.border}` : 'none',
        borderLeft: side === 'left' ? `1px solid ${C.border}` : 'none',
      }}
      {...rest}
    >
      {collapsed && collapsedRender ? (
        <div
          onClick={onToggleCollapse}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          title={`Expand ${title}`}
        >
          {collapsedRender}
        </div>
      ) : null}

      {!collapsed && (
        <>
          <div className="no-print" style={{
            padding: '4px 8px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 6,
            flexShrink: 0, cursor: 'default',
          }}>
            <span style={{ fontSize: 8, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', flex: 1 }}>
              {title}
            </span>
            <button
              onClick={onToggleCollapse}
              title="Collapse panel"
              style={{
                background: 'transparent', border: 'none', color: C.dim,
                cursor: 'pointer', fontSize: 10, ...mono, padding: 0, lineHeight: 1,
              }}
            >
              {side === 'right' ? '\u25C0' : '\u25B6'}
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {children}
          </div>
        </>
      )}

      {!collapsed && (
        <div
          className="no-print"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 4,
            cursor: 'col-resize',
            background: dragging ? C.accent : 'transparent',
            transition: 'background 150ms',
            zIndex: 10,
            ...(side === 'right' ? { right: -2 } : { left: -2 }),
          }}
          onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.background = C.border; }}
          onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.background = 'transparent'; }}
        />
      )}
    </div>
  );
}
