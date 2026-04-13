// src/components/ErrorBoundary.jsx
// 捕捉子元件的 JS 錯誤，防止整個頁面白屏
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#008080',
        fontFamily: "'DotGothic16', 'Courier New', monospace",
        zIndex: 99999,
      }}>
        <div className="win95-window" style={{ maxWidth: 420, width: '90vw' }}>
          <div className="win95-title-bar" style={{ backgroundColor: '#aa0000' }}>
            <span>⚠️ 系統錯誤</span>
          </div>
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>
              程式發生了一個意外的錯誤，造成不便敬請見諒。
            </p>
            <div style={{
              backgroundColor: '#f0f0f0', border: '2px inset #808080',
              padding: '8px 10px', fontSize: '0.78rem', color: '#555',
              maxHeight: 80, overflowY: 'auto', fontFamily: 'monospace',
            }}>
              {this.state.error?.message || '未知錯誤'}
            </div>
            <button
              className="win95-button"
              style={{ alignSelf: 'flex-start', padding: '4px 18px' }}
              onClick={() => window.location.reload()}
            >
              🔄 重新載入頁面
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
