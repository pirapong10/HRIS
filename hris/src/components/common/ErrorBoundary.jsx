import React from 'react';
import { C } from '../../utils/theme';

export class ErrorBoundary extends React.Component {
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
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 300, gap: 16, padding: 32
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>
            เกิดข้อผิดพลาดในส่วนนี้
          </div>
          <div style={{
            fontSize: 13, color: C.textMuted, background: C.bg,
            padding: '8px 16px', borderRadius: 8, maxWidth: 400,
            wordBreak: 'break-all', textAlign: 'center'
          }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: C.brand, color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 20px', fontSize: 14,
              cursor: 'pointer', fontWeight: 500
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
