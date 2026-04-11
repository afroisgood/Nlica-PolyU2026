// src/components/StatusBar.jsx
import { useState, useEffect } from 'react';

function StatusBar({ path, nickname, playerData, onLogout }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setTime(`${h}:${m}`);
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="win95-statusbar">
      <div className="statusbar-path">{path}</div>
      <div className="statusbar-right">
        {nickname && playerData && (
          <div className="statusbar-cell">
            {nickname}｜{playerData.group}
          </div>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              fontFamily: 'inherit',
              fontSize: '0.78rem',
              padding: '0 8px',
              height: '20px',
              cursor: 'pointer',
              borderTop: '2px solid var(--win95-light)',
              borderLeft: '2px solid var(--win95-light)',
              borderRight: '2px solid var(--win95-dark)',
              borderBottom: '2px solid var(--win95-dark)',
              backgroundColor: 'var(--win95-window)',
            }}
          >
            登出
          </button>
        )}
        <div className="statusbar-cell statusbar-time">{time}</div>
      </div>
    </div>
  );
}

export default StatusBar;
