// src/components/BootScreen.jsx
import { useState, useEffect } from 'react';

const bootLines = [
  'PolyU × Nlica Hualien Tour System 2026',
  'BIOS Version 26.05.18',
  'Checking memory... OK',
  'Loading community modules...',
];

function BootScreen({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);

  // 逐行顯示開機文字
  useEffect(() => {
    if (visibleLines < bootLines.length) {
      const t = setTimeout(() => setVisibleLines(v => v + 1), 350);
      return () => clearTimeout(t);
    }
  }, [visibleLines]);

  // 文字顯示完後開始跑進度條
  useEffect(() => {
    if (visibleLines < bootLines.length) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        return prev + 2;
      });
    }, 35);
    return () => clearInterval(interval);
  }, [visibleLines, onComplete]);

  return (
    <div className="boot-screen">
      <div className="boot-content">
        {bootLines.slice(0, visibleLines).map((line, i) => (
          <p key={i} className="boot-line">{line}</p>
        ))}
        {visibleLines >= bootLines.length && (
          <div className="boot-progress-wrap">
            <div className="boot-progress-track">
              <div className="boot-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="boot-percent">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default BootScreen;
