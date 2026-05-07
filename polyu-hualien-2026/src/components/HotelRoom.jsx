// src/components/HotelRoom.jsx
import { useEffect } from 'react';
import { playClick } from '../lib/sounds';

function HotelRoom({ playerData, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9000,
      }}
      onClick={onClose}
    >
      <div
        className="win95-window"
        style={{ width: 'min(360px, 92vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="win95-title-bar">
          <span>🚪 我的房間資訊</span>
          <div className="win95-title-buttons">
            <div className="win95-btn" onClick={() => { playClick(); onClose(); }}>X</div>
          </div>
        </div>
        <div className="win95-content" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div className="pixel-icon icon-door" style={{ flexShrink: 0 }}></div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{playerData?.name}</div>
              <div style={{ color: 'var(--win95-title)', fontSize: '0.85rem' }}>{playerData?.group}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 12px 8px 0', fontWeight: 'bold', whiteSpace: 'nowrap', color: 'var(--win95-dark)' }}>
                  房號
                </td>
                <td style={{ padding: '8px 0' }}>
                  <div
                    style={{
                      border: '2px inset var(--win95-mid)',
                      padding: '6px 12px',
                      backgroundColor: 'white',
                      fontFamily: 'monospace',
                      fontSize: '1.3rem',
                      letterSpacing: '2px',
                      fontWeight: 'bold',
                    }}
                  >
                    {playerData?.room}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px 8px 0', fontWeight: 'bold', whiteSpace: 'nowrap', color: 'var(--win95-dark)' }}>
                  密碼
                </td>
                <td style={{ padding: '8px 0' }}>
                  <div
                    style={{
                      border: '2px inset var(--win95-mid)',
                      padding: '6px 12px',
                      backgroundColor: 'white',
                      fontFamily: 'monospace',
                      fontSize: '1.3rem',
                      letterSpacing: '2px',
                      fontWeight: 'bold',
                    }}
                  >
                    {playerData?.password}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="win95-button"
              onClick={() => { playClick(); onClose(); }}
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HotelRoom;
