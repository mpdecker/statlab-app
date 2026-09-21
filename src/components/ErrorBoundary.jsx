import { Component } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Chart render error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontSize: 10, color: C.dim, ...mono, textAlign: 'center', lineHeight: 1.6 }}>
          Chart failed to render.
          <div style={{ marginTop: 4, color: C.neg, fontSize: 9 }}>{String(this.state.error?.message || this.state.error)}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
