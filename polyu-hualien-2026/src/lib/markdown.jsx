// src/lib/markdown.jsx
// 輕量 Markdown 渲染器（React）
// 支援：# 標題、**粗體**、[連結](url)、![圖片](url)
//       [audio:標題](url)、[video:標題](url)、--- 分隔線
//       - [ ] / - [x] checkbox（狀態存 localStorage）
//       YouTube / YouTube Music URL 自動轉 iframe 嵌入

import { useState } from 'react';
import VinylPlayer from '../components/VinylPlayer.jsx';

// ── YouTube URL 解析 ─────────────────────────────────────────────
const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /music\.youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
];
export function extractYouTubeId(url) {
  for (const re of YT_PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** YouTube 影片 iframe 嵌入（video 專用） */
function YouTubeEmbed({ videoId, label }) {
  return (
    <div className="md-media-block md-youtube-block">
      <span className="md-media-label">🎬 {label}</span>
      <div className="md-youtube-wrapper">
        <iframe src={`https://www.youtube.com/embed/${videoId}`} title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen style={{ border: 'none', width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

// ── Checkbox 項目（狀態存 localStorage）────────────────────────────
function CheckboxItem({ storageKey, defaultChecked, label, onImageClick, keyPrefix }) {
  const [checked, setChecked] = useState(() => {
    if (!storageKey) return defaultChecked;
    const v = localStorage.getItem(storageKey);
    return v !== null ? v === 'true' : defaultChecked;
  });

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    if (storageKey) localStorage.setItem(storageKey, String(next));
  };

  return (
    <div className="md-checkbox-row" onClick={toggle} title={checked ? '點擊取消勾選' : '點擊勾選'}>
      <span className={`md-checkbox-box${checked ? ' checked' : ''}`}>
        {checked ? '✓' : ''}
      </span>
      <span className={`md-checkbox-label${checked ? ' checked' : ''}`}>
        {parseInline(label, onImageClick, keyPrefix)}
      </span>
    </div>
  );
}

// ── Inline 解析 ───────────────────────────────────────────────────
const INLINE_RE = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

function parseInline(text, onImageClick, keyPrefix) {
  const parts = [];
  let lastIndex = 0;
  let key = 0;
  let match;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    if (match[0].startsWith('!')) {
      const alt = match[1], url = match[2];
      parts.push(<img key={`${keyPrefix}-img-${key++}`} src={url} alt={alt} title={alt}
        className="md-inline-img" onClick={() => onImageClick?.(url, alt)} />);
    } else if (match[3] !== undefined) {
      const linkText = match[3], url = match[4], lowerText = linkText.toLowerCase();
      if (lowerText.startsWith('audio:')) {
        const label = linkText.slice(6).trim() || '音訊';
        const ytId = extractYouTubeId(url);
        parts.push(ytId
          ? <VinylPlayer key={`${keyPrefix}-vinyl-${key++}`} videoId={ytId} label={label} />
          : <div key={`${keyPrefix}-audio-${key++}`} className="md-media-block">
              <span className="md-media-label">🎵 {label}</span>
              <audio controls src={url} style={{ display: 'block', width: '100%', marginTop: 4 }} />
            </div>);
      } else if (lowerText.startsWith('video:')) {
        const label = linkText.slice(6).trim() || '影片';
        const ytId = extractYouTubeId(url);
        parts.push(ytId
          ? <YouTubeEmbed key={`${keyPrefix}-ytvideo-${key++}`} videoId={ytId} label={label} />
          : <div key={`${keyPrefix}-video-${key++}`} className="md-media-block">
              <span className="md-media-label">🎬 {label}</span>
              <video controls src={url} style={{ display: 'block', maxWidth: '100%', marginTop: 4 }} />
            </div>);
      } else {
        parts.push(<a key={`${keyPrefix}-link-${key++}`} href={url}
          target="_blank" rel="noopener noreferrer" className="md-link">{linkText}</a>);
      }
    } else if (match[5] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-bold-${key++}`}>{match[5]}</strong>);
    }
    lastIndex = INLINE_RE.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

// ── Checkbox 行語法 ───────────────────────────────────────────────
// 支援：- [ ] text  /  - [x] text  /  * [ ] text  /  * [x] text
const CB_RE = /^[\s]*[-*]\s\[([xX ])\]\s(.+)$/;

// ── Block 渲染 ───────────────────────────────────────────────────
/**
 * @param {string} content
 * @param {Function} onImageClick
 * @param {string|null} docId - 用於 checkbox localStorage key，傳 null 則不持久化
 */
export function renderMarkdown(content, onImageClick, docId = null) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements = [];

  lines.forEach((line, i) => {
    const key = `line-${i}`;

    if (line.startsWith('### ')) { elements.push(<h5 key={key} id={`md-h-${i}`} className="md-h3">{line.slice(4)}</h5>); return; }
    if (line.startsWith('## '))  { elements.push(<h4 key={key} id={`md-h-${i}`} className="md-h2">{line.slice(3)}</h4>); return; }
    if (line.startsWith('# '))   { elements.push(<h3 key={key} id={`md-h-${i}`} className="md-h1">{line.slice(2)}</h3>); return; }
    if (line.trim() === '---')   { elements.push(<hr key={key} className="md-hr" />); return; }

    // ── Checkbox ──
    const cbMatch = line.match(CB_RE);
    if (cbMatch) {
      const defaultChecked = cbMatch[1].toLowerCase() === 'x';
      const label = cbMatch[2];
      const storageKey = docId ? `cb_${docId}_${i}` : null;
      elements.push(
        <CheckboxItem key={key} storageKey={storageKey} defaultChecked={defaultChecked}
          label={label} onImageClick={onImageClick} keyPrefix={key} />
      );
      return;
    }

    // ── 純圖片行 ──
    const soloImg = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (soloImg) {
      elements.push(
        <div key={key} className="md-img-block">
          <img src={soloImg[2]} alt={soloImg[1]} title={soloImg[1]}
            className="md-block-img" onClick={() => onImageClick?.(soloImg[2], soloImg[1])} />
          {soloImg[1] && <span className="md-img-caption">{soloImg[1]}</span>}
        </div>
      );
      return;
    }

    if (line.trim() === '') { elements.push(<div key={key} className="md-blank" />); return; }

    elements.push(<div key={key} className="md-line">{parseInline(line, onImageClick, key)}</div>);
  });

  return elements;
}
