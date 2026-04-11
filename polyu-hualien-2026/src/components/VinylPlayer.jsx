// src/components/VinylPlayer.jsx
// 黑膠唱片播放器 — 隱藏 YouTube iframe + postMessage 控制音訊
import { useRef, useState, useEffect } from 'react';

// 黑膠唱片 SVG
function VinylDisc({ label, isPlaying, onClick }) {
  const short = label.length > 11 ? label.slice(0, 10) + '…' : label;
  const grooves = Array.from({ length: 24 }, (_, i) => 39 + i * 2.4);

  return (
    <div
      className={`vinyl-disc${isPlaying ? ' vinyl-spinning' : ''}`}
      onClick={onClick}
      title={isPlaying ? '點擊暫停' : '點擊播放'}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* 唱片主體 */}
        <circle cx="100" cy="100" r="99" fill="#111" />
        <circle cx="100" cy="100" r="97" fill="none" stroke="#2c2c2c" strokeWidth="1.5" />

        {/* 溝槽 */}
        {grooves.map((r, i) => (
          <circle key={i} cx="100" cy="100" r={r} fill="none"
            stroke={i % 4 === 0 ? '#272727' : '#1d1d1d'} strokeWidth="0.7" />
        ))}

        {/* 高光反射 */}
        <ellipse cx="78" cy="72" rx="12" ry="5" fill="rgba(255,255,255,0.04)" transform="rotate(-30 78 72)" />

        {/* 中心標籤 */}
        <circle cx="100" cy="100" r="33" fill="#7a1515" />
        <circle cx="100" cy="100" r="32" fill="none" stroke="#9b2020" strokeWidth="1" />
        <circle cx="100" cy="100" r="28" fill="none" stroke="#6a1010" strokeWidth="0.5" />

        {/* 標籤文字 */}
        <text x="100" y="94" textAnchor="middle" fill="rgba(255,255,255,0.92)"
          fontSize="6.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.3">
          {short}
        </text>
        <text x="100" y="106" textAnchor="middle" fill="rgba(255,200,190,0.65)"
          fontSize="4.5" fontFamily="monospace">
          ♪  YouTube Music
        </text>

        {/* 中心孔 */}
        <circle cx="100" cy="100" r="5" fill="#060606" />
        <circle cx="100" cy="100" r="3" fill="#1a1a1a" />

        {/* 播放 overlay（暫停時才顯示） */}
        {!isPlaying && (
          <g>
            <circle cx="100" cy="100" r="22" fill="rgba(0,0,0,0.55)" />
            <polygon points="92,89 92,111 116,100" fill="rgba(255,255,255,0.88)" />
          </g>
        )}
      </svg>
    </div>
  );
}

// 唱臂 SVG
function Tonearm({ isPlaying }) {
  return (
    <svg className={`vinyl-tonearm-svg${isPlaying ? ' on-record' : ''}`}
      viewBox="0 0 80 120" width="60" height="90">
      {/* 樞紐點 */}
      <circle cx="62" cy="10" r="6" fill="#888" stroke="#aaa" strokeWidth="1" />
      <circle cx="62" cy="10" r="3" fill="#c0c0c0" />
      {/* 臂 */}
      <line x1="62" y1="10" x2="18" y2="95" stroke="#aaa" strokeWidth="3"
        strokeLinecap="round" />
      {/* 針頭 */}
      <circle cx="18" cy="95" r="4" fill="#c0c0c0" stroke="#888" strokeWidth="1" />
      <circle cx="18" cy="99" r="2" fill="#555" />
    </svg>
  );
}

// 主元件
function VinylPlayer({ videoId, label }) {
  const iframeRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const sendCmd = (func) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args: '' }),
        '*'
      );
    } catch (_) {}
  };

  // 卸載時暫停
  useEffect(() => () => sendCmd('pauseVideo'), []);

  const togglePlay = () => {
    if (isPlaying) {
      sendCmd('pauseVideo');
      setIsPlaying(false);
    } else {
      sendCmd('playVideo');
      setIsPlaying(true);
    }
  };

  return (
    <div className="vinyl-wrap">
      {/* 隱藏的 YouTube iframe（音訊來源） */}
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&autoplay=0`}
        allow="autoplay; encrypted-media"
        title={label}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '1px', height: '1px',
          opacity: 0, border: 'none', pointerEvents: 'none',
        }}
      />

      {/* 轉盤面板 */}
      <div className="vinyl-panel">
        {/* 轉盤底座 */}
        <div className="vinyl-platter">
          <VinylDisc label={label} isPlaying={isPlaying} onClick={togglePlay} />
        </div>

        {/* 唱臂 */}
        <div className="vinyl-tonearm-wrap">
          <Tonearm isPlaying={isPlaying} />
        </div>
      </div>

    </div>
  );
}

export default VinylPlayer;
