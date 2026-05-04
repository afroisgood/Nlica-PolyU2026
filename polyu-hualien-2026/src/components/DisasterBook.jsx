// src/components/DisasterBook.jsx
import { useState, useEffect, useRef } from 'react';
import { playClick } from '../lib/sounds';

const TOTAL_PAGES = 22;
const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return `/media/disaster-book/page-${n}.jpg`;
});

function DisasterBook({ onClose }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current]);

  const goNext = () => setCurrent((c) => Math.min(c + 1, TOTAL_PAGES - 1));
  const goPrev = () => setCurrent((c) => Math.max(c - 1, 0));

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? goNext() : goPrev(); }
    touchStartX.current = null;
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9000,
      }}
      onClick={onClose}
    >
      <div
        className="win95-window"
        style={{ width: 'min(480px, 96vw)', display: 'flex', flexDirection: 'column', maxHeight: '96vh' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 標題列 */}
        <div className="win95-title-bar">
          <span>防災手冊.exe — 第 {current + 1} 頁 / 共 {TOTAL_PAGES} 頁</span>
          <div className="win95-title-buttons">
            <div className="win95-btn" onClick={() => { playClick(); onClose(); }}>X</div>
          </div>
        </div>

        {/* 圖片區 */}
        <div style={{ flex: 1, overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <img
            src={pages[current]}
            alt={`第 ${current + 1} 頁`}
            style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block' }}
            draggable={false}
          />
        </div>

        {/* 控制列 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderTop: '2px solid var(--win95-mid)', gap: '8px' }}>
          <button
            className="win95-button"
            onClick={() => { playClick(); goPrev(); }}
            disabled={current === 0}
            style={{ minWidth: '72px' }}
          >
            ◀ 上一頁
          </button>

          {/* 頁碼跳轉 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            {Array.from({ length: TOTAL_PAGES }, (_, i) => (
              <span
                key={i}
                onClick={() => { playClick(); setCurrent(i); }}
                style={{
                  cursor: 'pointer',
                  fontWeight: i === current ? 'bold' : 'normal',
                  textDecoration: i === current ? 'underline' : 'none',
                  color: i === current ? 'var(--win95-title)' : 'inherit',
                  fontSize: '0.75rem',
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>

          <button
            className="win95-button"
            onClick={() => { playClick(); goNext(); }}
            disabled={current === TOTAL_PAGES - 1}
            style={{ minWidth: '72px' }}
          >
            下一頁 ▶
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisasterBook;
