// src/components/FolderView.jsx
import { useRef } from 'react';

function FolderView({ folder, onOpenDoc, onBack }) {
  const touchStart = useRef(null);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    // 右滑返回：水平位移 > 70px、橫向為主、起點在螢幕左40%
    if (dx > 70 && Math.abs(dy) < Math.abs(dx) && touchStart.current.x < window.innerWidth * 0.4) {
      onBack();
    }
    touchStart.current = null;
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <strong style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.2rem)', wordBreak: 'break-all', minWidth: 0 }}>目前位置：C:\{folder.title}\</strong>
        <button className="win95-button" style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '4px 10px', marginTop: 0, fontSize: '0.9rem' }} onClick={onBack}>
          ← 返回桌面
        </button>
      </div>
      <div className="win95-file-list">
        {folder.docs.map((doc) => (
          <div key={doc.id} className="win95-file-item" onClick={() => onOpenDoc(doc)}>
            {doc.title}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FolderView;
