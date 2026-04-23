// src/components/DocumentView.jsx
import { useState, useRef } from 'react';
import { renderMarkdown } from '../lib/markdown.jsx';
import Lightbox from './Lightbox.jsx';

function DocumentView({ doc, onBack }) {
  const [lightbox, setLightbox] = useState(null);
  const [scrollPct, setScrollPct] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const docRef = useRef(null);

  // 從內容擷取 #、## 標題作為目錄
  const headings = doc.content
    ? doc.content.split('\n').reduce((acc, line, i) => {
        if (line.startsWith('## '))  acc.push({ text: line.slice(3), id: `md-h-${i}`, level: 2 });
        else if (line.startsWith('# ')) acc.push({ text: line.slice(2), id: `md-h-${i}`, level: 1 });
        return acc;
      }, [])
    : [];

  const handleScroll = () => {
    const el = docRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollPct(max > 0 ? (el.scrollTop / max) * 100 : 0);
  };

  const scrollToHeading = (id) => {
    const el = docRef.current?.querySelector(`#${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowToc(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      {/* 標題列 */}
      <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <strong style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.2rem)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          閱讀檔案：{doc.title}
        </strong>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {headings.length > 1 && (
            <button
              className="win95-button"
              style={{ whiteSpace: 'nowrap', padding: '4px 10px', marginTop: 0, fontSize: '0.9rem' }}
              onClick={() => setShowToc((v) => !v)}
            >
              {showToc ? '▲ 目錄' : '▼ 目錄'}
            </button>
          )}
          <button
            className="win95-button"
            style={{ whiteSpace: 'nowrap', padding: '4px 10px', marginTop: 0, fontSize: '0.9rem' }}
            onClick={onBack}
          >
            ← 返回上一層
          </button>
        </div>
      </div>

      {/* 目錄面板 */}
      {showToc && (
        <div className="doc-toc">
          {headings.map((h) => (
            <div
              key={h.id}
              className="doc-toc-item"
              data-level={h.level}
              onClick={() => scrollToHeading(h.id)}
            >
              {h.level === 1 ? '▸' : '\u00a0\u00a0›'} {h.text}
            </div>
          ))}
        </div>
      )}

      {/* 閱讀進度條 */}
      <div className="doc-progress-track">
        <div className="doc-progress-bar" style={{ width: `${scrollPct}%` }} />
      </div>

      {/* 文件內容 */}
      <div className="win95-document" ref={docRef} onScroll={handleScroll}>
        <div className="md-content">
          {renderMarkdown(doc.content, (src, alt) => setLightbox({ src, alt }), doc.id)}
        </div>
      </div>

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
}

export default DocumentView;
