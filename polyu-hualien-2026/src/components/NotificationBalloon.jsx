// src/components/NotificationBalloon.jsx
import { useEffect, useState, useRef } from 'react';

/* ── 像素小電腦角色（16×16 pixel art） ─────────── */
function AssistantChar({ talking, blink }) {
  const eyeY = blink ? 5 : 3;
  const eyeH = blink ? 1 : 2;

  return (
    <svg
      viewBox="0 0 16 16"
      style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
    >
      {/* 外框 */}
      <rect x="1" y="0" width="14" height="10" fill="#c0c0c0" />
      <rect x="0" y="1" width="1"  height="8"  fill="#c0c0c0" />
      <rect x="15" y="1" width="1" height="8"  fill="#c0c0c0" />
      {/* 外框斜角（立體感） */}
      <rect x="1" y="0" width="13" height="1" fill="#fff" />
      <rect x="0" y="1" width="1"  height="7" fill="#fff" />
      <rect x="14" y="1" width="1" height="8" fill="#808080" />
      <rect x="1" y="9" width="14" height="1" fill="#808080" />
      {/* 螢幕 */}
      <rect x="2" y="1" width="12" height="8" fill="#000080" />
      {/* 左眼 */}
      <rect x="4"  y={eyeY} width="2" height={eyeH} fill="#fff" />
      {/* 右眼 */}
      <rect x="10" y={eyeY} width="2" height={eyeH} fill="#fff" />
      {/* 嘴巴：說話時張開 */}
      {talking ? (
        <>
          <rect x="5" y="6" width="6" height="1" fill="#fff" />
          <rect x="6" y="7" width="4" height="1" fill="#fff" />
        </>
      ) : (
        <rect x="5" y="7" width="6" height="1" fill="#fff" />
      )}
      {/* 支柱 */}
      <rect x="6" y="10" width="4" height="2" fill="#808080" />
      {/* 底座 */}
      <rect x="3" y="12" width="10" height="1" fill="#fff" />
      <rect x="3" y="13" width="10" height="1" fill="#c0c0c0" />
      <rect x="3" y="14" width="10" height="1" fill="#808080" />
    </svg>
  );
}

/* ── 單一訊息泡泡 ─────────────────────────────── */
function Bubble({ id, title, message, icon = '💬', onDismiss, duration = 5000 }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer  = setTimeout(() => setFading(true), duration - 400);
    const closeTimer = setTimeout(() => onDismiss(id), duration);
    return () => { clearTimeout(fadeTimer); clearTimeout(closeTimer); };
  }, []);

  return (
    <div style={{
      width: 'min(230px, 72vw)',
      backgroundColor: '#ffffc1',
      border: '1px solid #c8a000',
      boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
      fontFamily: "'DotGothic16', 'Courier New', monospace",
      fontSize: '0.82rem',
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.4s ease',
      pointerEvents: fading ? 'none' : 'auto',
      position: 'relative',
    }}>
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
        <span style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => onDismiss(id)}>✕</span>
      </div>
      {/* 內容 */}
      <div style={{ padding: '8px 10px', lineHeight: 1.6 }}>{message}</div>
      {/* 箭頭指向右下角（角色方向） */}
      <div style={{
        position: 'absolute', bottom: -8, right: 18,
        width: 0, height: 0,
        borderLeft: '8px solid transparent',
        borderTop: '8px solid #c8a000',
      }} />
      <div style={{
        position: 'absolute', bottom: -6, right: 19,
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderTop: '6px solid #ffffc1',
      }} />
    </div>
  );
}

/* ── 主元件：角色 + 泡泡 ─────────────────────── */
function NotificationBalloon({ notifications, onDismiss }) {
  const [talking, setTalking] = useState(false);
  const [blink,   setBlink]   = useState(false);
  const prevLen = useRef(0);

  // 有新通知時觸發「說話」動畫 2 秒
  useEffect(() => {
    const prev = prevLen.current;
    prevLen.current = notifications.length;
    if (notifications.length > prev) {
      setTalking(true);
      const t = setTimeout(() => setTalking(false), 2000);
      return () => clearTimeout(t);
    }
  }, [notifications.length]);

  // 隨機眨眼
  useEffect(() => {
    let timer;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => { setBlink(false); schedule(); }, 150);
      }, 2500 + Math.random() * 2500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  const isTalking = talking || notifications.length > 0;

  return (
    <div style={{
      position: 'absolute',
      bottom: 30,  /* 狀態列高度約 24px，留 6px 間距 */
      right: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 6,
      zIndex: 9998,
      pointerEvents: 'none',
    }}>
      {/* 訊息泡泡（由下往上堆疊） */}
      <div style={{
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'flex-end',
        gap: 6,
        pointerEvents: notifications.length ? 'auto' : 'none',
      }}>
        {notifications.map((n) => (
          <Bubble key={n.id} {...n} onDismiss={onDismiss} />
        ))}
      </div>

      {/* 角色本體 */}
      <div
        style={{
          width: 52,
          height: 52,
          cursor: notifications.length ? 'pointer' : 'default',
          animation: isTalking
            ? 'assistant-bounce 0.35s ease infinite alternate'
            : 'assistant-idle 5s ease infinite',
          filter: 'drop-shadow(1px 2px 0 rgba(0,0,0,0.4))',
          pointerEvents: 'auto',
          flexShrink: 0,
        }}
        title={notifications.length ? '點擊關閉通知' : '小助手'}
        onClick={() => { if (notifications.length) onDismiss(notifications[0].id); }}
      >
        <AssistantChar talking={isTalking} blink={blink} />
      </div>
    </div>
  );
}

export default NotificationBalloon;
