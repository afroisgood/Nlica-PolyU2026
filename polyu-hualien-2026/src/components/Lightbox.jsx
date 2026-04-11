// src/components/Lightbox.jsx
// 全螢幕圖片 Lightbox 浮層
import { useEffect } from 'react';

function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        {/* Win95 title bar */}
        <div className="win95-title-bar" style={{ borderBottom: '2px solid #000080' }}>
          <span>🖼️ {alt || '圖片預覽'}</span>
          <div className="win95-title-buttons">
            <div className="win95-btn" onClick={onClose} style={{ cursor: 'pointer' }}>X</div>
          </div>
        </div>
        <div style={{ padding: 8, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <img
            src={src}
            alt={alt}
            style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
          />
        </div>
        {alt && (
          <div style={{ padding: '6px 12px', backgroundColor: '#c0c0c0', fontSize: '0.85rem', borderTop: '1px solid #808080' }}>
            {alt}
          </div>
        )}
      </div>
    </div>
  );
}

export default Lightbox;
