// src/lib/markdown.jsx
// 輕量 Markdown 渲染器（React）
// 支援：# 標題、**粗體**、[連結](url)、![圖片](url)
//       [audio:標題](url)、[video:標題](url)、--- 分隔線
//       YouTube / YouTube Music URL 自動轉 iframe 嵌入

import React from 'react';
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
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ border: 'none', width: '100%', height: '100%' }}
        />
      </div>
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
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[0].startsWith('!')) {
      // 圖片：![alt](url)
      const alt = match[1], url = match[2];
      parts.push(
        <img
          key={`${keyPrefix}-img-${key++}`}
          src={url} alt={alt} title={alt}
          className="md-inline-img"
          onClick={() => onImageClick?.(url, alt)}
        />
      );
    } else if (match[3] !== undefined) {
      // 連結 / 媒體：[text](url)
      const linkText = match[3];
      const url = match[4];
      const lowerText = linkText.toLowerCase();

      if (lowerText.startsWith('audio:')) {
        const label = linkText.slice(6).trim() || '音訊';
        const ytId = extractYouTubeId(url);
        parts.push(
          ytId
            // YouTube 音樂 → 黑膠播放器（隱藏影片，只播音訊）
            ? <VinylPlayer key={`${keyPrefix}-vinyl-${key++}`} videoId={ytId} label={label} />
            // 一般音訊檔 → HTML audio 元素
            : <div key={`${keyPrefix}-audio-${key++}`} className="md-media-block">
                <span className="md-media-label">🎵 {label}</span>
                <audio controls src={url} style={{ display: 'block', width: '100%', marginTop: 4 }} />
              </div>
        );
      } else if (lowerText.startsWith('video:')) {
        const label = linkText.slice(6).trim() || '影片';
        const ytId = extractYouTubeId(url);
        parts.push(
          ytId
            // YouTube 影片 → iframe 嵌入播放器
            ? <YouTubeEmbed key={`${keyPrefix}-ytvideo-${key++}`} videoId={ytId} label={label} />
            // 一般影片檔 → HTML video 元素
            : <div key={`${keyPrefix}-video-${key++}`} className="md-media-block">
                <span className="md-media-label">🎬 {label}</span>
                <video controls src={url} style={{ display: 'block', maxWidth: '100%', marginTop: 4 }} />
              </div>
        );
      } else {
        parts.push(
          <a key={`${keyPrefix}-link-${key++}`} href={url}
            target="_blank" rel="noopener noreferrer" className="md-link">
            {linkText}
          </a>
        );
      }
    } else if (match[5] !== undefined) {
      // 粗體：**text**
      parts.push(<strong key={`${keyPrefix}-bold-${key++}`}>{match[5]}</strong>);
    }

    lastIndex = INLINE_RE.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

// ── Block 渲染 ───────────────────────────────────────────────────
export function renderMarkdown(content, onImageClick) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];

  lines.forEach((line, i) => {
    const key = `line-${i}`;

    if (line.startsWith('### ')) { elements.push(<h5 key={key} className="md-h3">{line.slice(4)}</h5>); return; }
    if (line.startsWith('## '))  { elements.push(<h4 key={key} className="md-h2">{line.slice(3)}</h4>); return; }
    if (line.startsWith('# '))   { elements.push(<h3 key={key} className="md-h1">{line.slice(2)}</h3>); return; }

    if (line.trim() === '---') { elements.push(<hr key={key} className="md-hr" />); return; }

    // 純圖片行
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

    elements.push(
      <div key={key} className="md-line">
        {parseInline(line, onImageClick, key)}
      </div>
    );
  });

  return elements;
}
