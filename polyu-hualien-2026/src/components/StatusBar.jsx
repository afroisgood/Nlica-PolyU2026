// src/components/StatusBar.jsx
import { useState, useEffect } from 'react';

function StatusBar({ path, nickname, playerData }) {
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
        <div className="statusbar-cell statusbar-time">{time}</div>
      </div>
    </div>
  );
}

export default StatusBar;
