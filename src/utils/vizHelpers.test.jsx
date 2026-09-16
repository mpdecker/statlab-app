// @vitest-environment happy-dom
import React, { useRef } from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useCanvasSize } from './vizHelpers.js';

function Probe({ onSize }) {
  const ref = useRef(null);
  const size = useCanvasSize(ref);
  onSize(size);
  return <div ref={ref} />;
}

describe('useCanvasSize', () => {
  test('returns the default floor size before any observed resize', () => {
    let seen;
    render(<Probe onSize={s => { seen = s; }} />);
    // happy-dom does not implement ResizeObserver callbacks synchronously
    // (or at all, depending on version), so the only behavior this
    // environment can assert is the pre-resize default. The clamp/padding
    // arithmetic that actually runs inside the ResizeObserver callback is
    // extracted as the pure function `clampCanvasSize` and covered directly
    // by unit tests in vizHelpers.test.js — it is NOT exercised by
    // ExplorePanel.test.jsx (which only renders and does a text match, with
    // no resize) or by any other test.
    expect(seen).toEqual({ w: 320, h: 240 });
  });

  test('honors custom floor overrides', () => {
    let seen;
    function ProbeCustom() {
      const ref = useRef(null);
      seen = useCanvasSize(ref, { minW: 160, minH: 120 });
      return <div ref={ref} />;
    }
    render(<ProbeCustom />);
    expect(seen).toEqual({ w: 160, h: 120 });
  });

  test('honors a separate initial size from the resize floor', () => {
    let seen;
    function ProbeInitial() {
      const ref = useRef(null);
      seen = useCanvasSize(ref, { minW: 320, minH: 240, initialW: 560, initialH: 360 });
      return <div ref={ref} />;
    }
    render(<ProbeInitial />);
    expect(seen).toEqual({ w: 560, h: 360 });
  });
});
