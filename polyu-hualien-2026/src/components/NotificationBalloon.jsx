// src/components/NotificationBalloon.jsx
import { useEffect, useState, useRef, useCallback } from 'react';

/* ── 情境台詞 ────────────────────────────────────────────────── */
const CONTEXT_LINES = {
  login:      ['歡迎！快輸入代碼登入吧 👋', '準備好迎接花蓮之旅了嗎？'],
  desktop:    ['有什麼需要我幫忙的嗎？', '點圖示來探索吧！', '🌿 花蓮的空氣好新鮮'],
  discussion: ['有話說嗎？快留言！💬', '看看大家說什麼 👀', '記得禮貌喔！'],
  map:        ['你要去哪裡？🗺️', '花蓮景點超多的！', '別忘了帶水！'],
  snake:      ['加油！打破紀錄！🐍', '小心！別撞牆！', '蛇蛇好餓 👀'],
  disaster:   ['安全第一！⚠️', '遇到緊急狀況別慌！', '這些知識關鍵時刻會救命'],
  document:   ['認真看完了嗎？📖', '重要資訊，別漏掉！', '閱讀完成記得蓋章 ✅'],
  folder:     ['找到你要的資料了嗎？', '這裡有很多好東西 📁'],
};

function getTimeGreeting(name) {
  const h = new Date().getHours();
  const n = name ? `${name}，` : '';
  if (h >= 5  && h < 12) return `早安！${n}今天也加油喔 ☀️`;
  if (h >= 12 && h < 14) return `${n}午休時間，記得吃飯！🍱`;
  if (h >= 14 && h < 18) return `下午好！${n}繼續努力 💪`;
  if (h >= 18 && h < 22) return `晚上好！${n}今天辛苦了 🌙`;
  return `${n}這麼晚還在用？快去睡！😴`;
}

/* ── 像素角色 SVG（支援 mood 表情） ─────────────────────────── */
function AssistantChar({ mood = 'normal', blink }) {
  const renderEyes = () => {
    switch (mood) {
      case 'sleepy':
        return (
          <>
            {/* 半閉眼：眼皮蓋住上半 */}
            <rect x="4"  y="4" width="2" height="1" fill="#fff" />
            <rect x="10" y="4" width="2" height="1" fill="#fff" />
            <rect x="4"  y="3" width="2" height="1" fill="#000080" />
            <rect x="10" y="3" width="2" height="1" fill="#000080" />
          </>
        );
      case 'happy':
        return (
          <>
            {/* 彎彎笑眼 ^ */}
            <rect x="4"  y="3" width="2" height="1" fill="#fff" />
            <rect x="3"  y="4" width="4" height="1" fill="#fff" />
            <rect x="10" y="3" width="2" height="1" fill="#fff" />
            <rect x="9"  y="4" width="4" height="1" fill="#fff" />
          </>
        );
      case 'surprised':
        return (
          <>
            {/* 大眼睛（白框 + 黑瞳） */}
            <rect x="3"  y="3" width="4" height="3" fill="#fff" />
            <rect x="4"  y="4" width="2" height="1" fill="#000" />
            <rect x="9"  y="3" width="4" height="3" fill="#fff" />
            <rect x="10" y="4" width="2" height="1" fill="#000" />
          </>
        );
      default: {
        const eyeY = blink ? 5 : 3;
        const eyeH = blink ? 1 : 2;
        return (
          <>
            <rect x="4"  y={eyeY} width="2" height={eyeH} fill="#fff" />
            <rect x="10" y={eyeY} width="2" height={eyeH} fill="#fff" />
          </>
        );
      }
    }
  };

  const renderMouth = () => {
    switch (mood) {
      case 'sleepy':
        return <rect x="6" y="7" width="3" height="1" fill="#fff" />;
      case 'happy':
        return (
          <>
            <rect x="4"  y="6" width="1" height="1" fill="#fff" />
            <rect x="5"  y="7" width="6" height="1" fill="#fff" />
            <rect x="11" y="6" width="1" height="1" fill="#fff" />
          </>
        );
      case 'surprised':
        return (
          <>
            <rect x="5" y="6" width="6" height="1" fill="#fff" />
            <rect x="6" y="7" width="4" height="1" fill="#fff" />
          </>
        );
      default:
        return <rect x="5" y="7" width="6" height="1" fill="#fff" />;
    }
  };

  return (
    <svg viewBox="0 0 16 16" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}>
      <rect x="1"  y="0"  width="14" height="10" fill="#c0c0c0" />
      <rect x="0"  y="1"  width="1"  height="8"  fill="#c0c0c0" />
      <rect x="15" y="1"  width="1"  height="8"  fill="#c0c0c0" />
      <rect x="1"  y="0"  width="13" height="1"  fill="#fff" />
      <rect x="0"  y="1"  width="1"  height="7"  fill="#fff" />
      <rect x="14" y="1"  width="1"  height="8"  fill="#808080" />
      <rect x="1"  y="9"  width="14" height="1"  fill="#808080" />
      <rect x="2"  y="1"  width="12" height="8"  fill="#000080" />
      {renderEyes()}
      {renderMouth()}
      <rect x="6"  y="10" width="4"  height="2"  fill="#808080" />
      <rect x="3"  y="12" width="10" height="1"  fill="#fff" />
      <rect x="3"  y="13" width="10" height="1"  fill="#c0c0c0" />
      <rect x="3"  y="14" width="10" height="1"  fill="#808080" />
    </svg>
  );
}

/* ── 系統通知泡泡（帶藍色標題列） ──────────────────────────── */
function SystemBubble({ id, title, message, icon = '💬', onDismiss, duration = 5000, flip = false }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), duration - 400);
    const t2 = setTimeout(() => onDismiss(id), duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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
      <div style={{
        background: 'linear-gradient(to right, #000080, #1084d0)',
        color: 'white', padding: '2px 6px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.78rem', gap: 4,
      }}>
        <span>{icon} {title || '系統通知'}</span>
        <span style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => onDismiss(id)}>✕</span>
      </div>
      <div style={{ padding: '8px 10px', lineHeight: 1.6 }}>{message}</div>
      <div style={{ position: 'absolute', bottom: -8, ...(flip ? { left: 18, borderRight: '8px solid transparent' } : { right: 18, borderLeft: '8px solid transparent' }), width: 0, height: 0, borderTop: '8px solid #c8a000' }} />
      <div style={{ position: 'absolute', bottom: -6, ...(flip ? { left: 19, borderRight: '6px solid transparent' } : { right: 19, borderLeft: '6px solid transparent' }), width: 0, height: 0, borderTop: '6px solid #ffffc1' }} />
    </div>
  );
}

/* ── 助手自言自語泡泡（輕量，無標題列） ────────────────────── */
function SpeechBubble({ text, onDone, flip = false }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 3600);
    const t2 = setTimeout(onDone, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [text]);
  return (
    <div style={{
      width: 'min(200px, 65vw)',
      backgroundColor: '#ffffc1',
      border: '1px solid #c8a000',
      boxShadow: '2px 2px 4px rgba(0,0,0,0.25)',
      fontFamily: "'DotGothic16', 'Courier New', monospace",
      fontSize: '0.8rem',
      padding: '7px 10px', lineHeight: 1.6,
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.4s ease',
      position: 'relative',
      pointerEvents: 'none',
    }}>
      {text}
      <div style={{ position: 'absolute', bottom: -8, ...(flip ? { left: 18, borderRight: '8px solid transparent' } : { right: 18, borderLeft: '8px solid transparent' }), width: 0, height: 0, borderTop: '8px solid #c8a000' }} />
      <div style={{ position: 'absolute', bottom: -6, ...(flip ? { left: 19, borderRight: '6px solid transparent' } : { right: 19, borderLeft: '6px solid transparent' }), width: 0, height: 0, borderTop: '6px solid #ffffc1' }} />
    </div>
  );
}

/* ── 快捷選單（Win95 風格） ─────────────────────────────────── */
function QuickMenu({ items, onClose }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) onCloseRef.current(); };
    const timerId = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener('click', handle);
    };
  }, []);

  return (
    <div ref={ref} style={{
      backgroundColor: '#c0c0c0',
      border: '2px solid',
      borderTopColor: '#fff', borderLeftColor: '#fff',
      borderRightColor: '#808080', borderBottomColor: '#808080',
      boxShadow: '2px 2px 0 #000',
      fontFamily: "'DotGothic16', 'Courier New', monospace",
      fontSize: '0.88rem',
      padding: '2px 0', minWidth: 160,
      userSelect: 'none',
    }}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} style={{ margin: '2px 3px', borderTop: '1px solid #808080', borderBottom: '1px solid #fff' }} />
        ) : (
          <div
            key={i}
            style={{ padding: '6px 14px 6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            onPointerEnter={e => { e.currentTarget.style.backgroundColor = '#000080'; e.currentTarget.style.color = '#fff'; }}
            onPointerLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#000'; }}
            onClick={e => { e.stopPropagation(); item.action(); onClose(); }}
          >
            <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            {item.label}
          </div>
        )
      )}
    </div>
  );
}

/* ── 主元件 ──────────────────────────────────────────────────── */
function NotificationBalloon({
  notifications = [], onDismiss,
  assistantContext = 'desktop',
  step = 0, playerData = null,
  onGoDesktop, onOpenDiscussion, onOpenMap,
  soundOn, onToggleSound,
}) {
  const [mood,     setMood]     = useState('normal');
  const [blink,    setBlink]    = useState(false);
  const [speech,   setSpeech]   = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const prevContextRef  = useRef(null);
  const prevNotifLenRef = useRef(0);
  const idleTimerRef    = useRef(null);
  const greetedRef      = useRef(false);
  const moodTimerRef    = useRef(null);

  /* 切換 mood 並在指定毫秒後自動回 normal */
  const setMoodFor = (m, ms) => {
    clearTimeout(moodTimerRef.current);
    setMood(m);
    moodTimerRef.current = setTimeout(() => setMood('normal'), ms);
  };

  /* 重置閒置計時器 */
  const resetIdle = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    setMood(m => (m === 'sleepy' ? 'normal' : m));
    idleTimerRef.current = setTimeout(() => setMood('sleepy'), 45000);
  }, []);

  useEffect(() => {
    resetIdle();
    return () => { clearTimeout(idleTimerRef.current); clearTimeout(moodTimerRef.current); };
  }, []);

  /* 隨機眨眼 */
  useEffect(() => {
    let outerTimer;
    let innerTimer;
    const schedule = () => {
      outerTimer = setTimeout(() => {
        setBlink(true);
        innerTimer = setTimeout(() => { setBlink(false); schedule(); }, 150);
      }, 2500 + Math.random() * 2500);
    };
    schedule();
    return () => { clearTimeout(outerTimer); clearTimeout(innerTimer); };
  }, []);

  /* 登入時段問候（只觸發一次） */
  useEffect(() => {
    if (step === 1 && !greetedRef.current) {
      greetedRef.current = true;
      const t = setTimeout(() => {
        setSpeech(getTimeGreeting(playerData?.name));
        setMoodFor('happy', 3500);
        resetIdle();
      }, 900);
      return () => clearTimeout(t);
    }
  }, [step]);

  /* 情境感知對話 */
  useEffect(() => {
    if (prevContextRef.current === null) {
      prevContextRef.current = assistantContext;
      return;
    }
    if (prevContextRef.current === assistantContext) return;
    prevContextRef.current = assistantContext;

    const lines = CONTEXT_LINES[assistantContext] || [];
    if (!lines.length) return;
    const t = setTimeout(() => {
      setSpeech(lines[Math.floor(Math.random() * lines.length)]);
      setMoodFor('happy', 3500);
      resetIdle();
    }, 700);
    return () => clearTimeout(t);
  }, [assistantContext]);

  /* step 切換時關閉選單（防止登出後選單殘留蓋住畫面） */
  useEffect(() => { setShowMenu(false); }, [step]);

  /* 新通知 → surprised */
  useEffect(() => {
    const prev = prevNotifLenRef.current;
    prevNotifLenRef.current = notifications.length;
    if (notifications.length > prev) {
      setMoodFor('surprised', 2200);
      setShowMenu(false);
      resetIdle();
    }
  }, [notifications.length]);

  /* 快捷選單項目 */
  const menuItems = [
    ...(assistantContext !== 'desktop' && step === 1
      ? [{ icon: '🏠', label: '回桌面', action: () => { onGoDesktop?.(); resetIdle(); } }]
      : []),
    { icon: '💬', label: '討論區', action: () => { onOpenDiscussion?.(); resetIdle(); } },
    { icon: '🗺️', label: '行程地圖', action: () => { onOpenMap?.(); resetIdle(); } },
    { separator: true },
    {
      icon: soundOn ? '🔊' : '🔇',
      label: soundOn ? '關閉音效' : '開啟音效',
      action: () => { onToggleSound?.(); resetIdle(); },
    },
  ];

  /* 點擊角色 */
  const handleClick = () => {
    resetIdle();
    if (notifications.length) {
      onDismiss(notifications[0].id);
    } else {
      setShowMenu(v => !v);
    }
  };

  const isBouncing = mood === 'surprised' || (notifications.length > 0 && mood !== 'sleepy');
  const animation  = isBouncing
    ? 'assistant-bounce 0.35s ease infinite alternate'
    : mood === 'sleepy'
      ? 'assistant-sleepy 3s ease infinite'
      : 'assistant-idle 5s ease infinite';

  const bottomOffset = assistantContext === 'discussion' ? 95 : 30;

  return (
    <div style={{
      position: 'absolute', bottom: bottomOffset, right: 8,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      gap: 6, zIndex: 10000, pointerEvents: 'none',
    }}>
      {/* 快捷選單 */}
      {showMenu && (
        <div style={{ pointerEvents: 'auto' }}>
          <QuickMenu items={menuItems} onClose={() => setShowMenu(false)} />
        </div>
      )}

      {/* 助手自言自語（無通知時才顯示，不攔截點擊事件） */}
      {speech && !showMenu && notifications.length === 0 && (
        <div style={{ pointerEvents: 'none' }}>
          <SpeechBubble text={speech} onDone={() => setSpeech(null)} />
        </div>
      )}

      {/* 系統通知（由下往上堆疊） */}
      <div style={{
        display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-end',
        gap: 6, pointerEvents: notifications.length ? 'auto' : 'none',
      }}>
        {notifications.map(n => <SystemBubble key={n.id} {...n} onDismiss={onDismiss} />)}
      </div>

      {/* 角色本體 */}
      <div
        onClick={handleClick}
        title={notifications.length ? '點擊關閉通知' : '點擊開啟選單'}
        style={{
          width: 52, height: 52, cursor: 'pointer',
          animation, flexShrink: 0, pointerEvents: 'auto',
          filter: 'drop-shadow(1px 2px 0 rgba(0,0,0,0.4))',
        }}
      >
        <AssistantChar mood={mood} blink={blink} />
      </div>
    </div>
  );
}

export default NotificationBalloon;
