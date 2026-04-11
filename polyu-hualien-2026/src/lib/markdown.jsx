// src/lib/markdown.jsx
// 輕量 Markdown 渲染器（React）
// 支援：# 標題、**粗體**、[連結](url)、![圖片](url)、[audio:標題](url)、[video:標題](url)、--- 分隔線

import React from 'react';

const INLINE_RE = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

/** 解析單行內的 inline 元素，回傳 React children 陣列 */
function parseInline(text, onImageClick, keyPrefix) {
  const parts = [];
  let lastIndex = 0;
  let key = 0;
  let match;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    // 前置純文字
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[0].startsWith('!')) {
      // 圖片：![alt](url)
      const alt = match[1];
      const url = match[2];
      parts.push(
        <img
          key={`${keyPrefix}-img-${key++}`}
          src={url}
          alt={alt}
          title={alt}
          className="md-inline-img"
          onClick={() => onImageClick?.(url, alt)}
        />
      );
    } else if (match[3] !== undefined) {
      // 連結 / 媒體：[text](url)
      const linkText = match[3];
      const url = match[4];

      if (linkText.toLowerCase().startsWith('audio:')) {
        const label = linkText.slice(6).trim() || '音訊';
        parts.push(
          <div key={`${keyPrefix}-audio-${key++}`} className="md-media-block">
            <span className="md-media-label">🎵 {label}</span>
            <audio controls src={url} style={{ display: 'block', width: '100%', marginTop: 4 }} />
          </div>
        );
      } else if (linkText.toLowerCase().startsWith('video:')) {
        const label = linkText.slice(6).trim() || '影片';
        parts.push(
          <div key={`${keyPrefix}-video-${key++}`} className="md-media-block">
            <span className="md-media-label">🎬 {label}</span>
            <video controls src={url} style={{ display: 'block', maxWidth: '100%', marginTop: 4 }} />
          </div>
        );
      } else {
        parts.push(
          <a
            key={`${keyPrefix}-link-${key++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="md-link"
          >
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

  // 結尾純文字
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * 將 Markdown 字串渲染為 React 元素陣列
 * @param {string} content
 * @param {(src:string, alt:string) => void} onImageClick - 點擊圖片時的 callback
 */
export function renderMarkdown(content, onImageClick) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];

  lines.forEach((line, i) => {
    const key = `line-${i}`;

    // 標題
    if (line.startsWith('### ')) {
      elements.push(<h5 key={key} className="md-h3">{line.slice(4)}</h5>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h4 key={key} className="md-h2">{line.slice(3)}</h4>);
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(<h3 key={key} className="md-h1">{line.slice(2)}</h3>);
      return;
    }

    // 分隔線
    if (line.trim() === '---') {
      elements.push(<hr key={key} className="md-hr" />);
      return;
    }

    // 純圖片行：整行只有 ![alt](url)
    const soloImg = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (soloImg) {
      elements.push(
        <div key={key} className="md-img-block">
          <img
            src={soloImg[2]}
            alt={soloImg[1]}
            title={soloImg[1]}
            className="md-block-img"
            onClick={() => onImageClick?.(soloImg[2], soloImg[1])}
          />
          {soloImg[1] && <span className="md-img-caption">{soloImg[1]}</span>}
        </div>
      );
      return;
    }

    // 空行
    if (line.trim() === '') {
      elements.push(<div key={key} className="md-blank" />);
      return;
    }

    // 一般段落行（含 inline 解析）
    const inline = parseInline(line, onImageClick, key);
    elements.push(
      <div key={key} className="md-line">
        {inline}
      </div>
    );
  });

  return elements;
}
