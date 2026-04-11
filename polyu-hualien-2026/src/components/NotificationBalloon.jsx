// src/components/NotificationBalloon.jsx
import { useEffect, useState } from 'react';

function Balloon({ id, title, message, icon = '💬', onDismiss, duration = 5000 }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer  = setTimeout(() => setFading(true), duration - 400);
    const closeTimer = setTimeout(() => onDismiss(id), duration);
    return () => { clearTimeout(fadeTimer); clearTimeout(closeTimer); };
  }, []);

  return (
    <div
      style={{
        width: 230,
        backgroundColor: '#ffffc1',
        border: '1px solid #c8a000',
        boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
        fontFamily: "'DotGothic16', 'Courier New', monospace",
        fontSize: '0.82rem',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: fading ? 'none' : 'auto',
        position: 'relative',
      }}
    >
      {/* 標題列 */}
      <div style={{
        background: 'linear-gradient(to right, #000080, #1084d0)',
        color: 'white',
        padding: '2px 6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.78rem',
        gap: 4,
      }}>
        <span>{icon} {title || '系統通知'}</span>
        <span
          style={{ cursor: 'pointer', flexShrink: 0 }}
          onClick={() => onDismiss(id)}
        >✕</span>
      </div>
      {/* 內容 */}
      <div style={{ padding: '8px 10px', lineHeight: 1.6 }}>
        {message}
      </div>
      {/* 箭頭指向右下角（systray 方向） */}
      <div style={{
        position: 'absolute',
        bottom: -8,
        right: 14,
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderTop: '8px solid #c8a000',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -6,
        right: 15,
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderTop: '6px solid #ffffc1',
      }} />
    </div>
  );
}

/** 容器：固定在右下角，多則由下往上堆疊 */
function NotificationBalloon({ notifications, onDismiss }) {
  if (!notifications.length) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 36,
      right: 12,
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 8,
      zIndex: 9998,
      pointerEvents: 'none',
    }}>
      {notifications.map((n) => (
        <div key={n.id} style={{ pointerEvents: 'auto' }}>
          <Balloon {...n} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

export default NotificationBalloon;
