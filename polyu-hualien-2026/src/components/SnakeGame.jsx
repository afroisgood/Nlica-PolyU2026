// src/components/SnakeGame.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { ref as dbRef, onValue, set, get } from 'firebase/database';
import { db } from '../lib/firebase';

const COLS = 20, ROWS = 20, CELL = 14;
const SPEED_INIT = 140, SPEED_MIN = 55, SPEED_STEP = 8;

function getSpeed(eaten) {
  return Math.max(SPEED_MIN, SPEED_INIT - Math.floor(eaten / 5) * SPEED_STEP);
}

function randFood(snake) {
  let p;
  do { p = [Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)]; }
  while (snake.some(([x, y]) => x === p[0] && y === p[1]));
  return p;
}

function mkGame() {
  const snake = [[10, 10], [9, 10], [8, 10]];
  return { snake, dir: [1, 0], nextDir: [1, 0], food: randFood(snake), score: 0, eaten: 0, status: 'idle' };
}

const KEY_MAP = {
  ArrowUp: [0, -1], w: [0, -1],
  ArrowDown: [0, 1], s: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0],
};

function SnakeGame({ onClose, playerData, isGuest }) {
  const cvRef           = useRef(null);
  const gRef            = useRef(mkGame());
  const tmRef           = useRef(null);
  const restartRef      = useRef(null);
  const transitioningRef = useRef(false); // 防止快速點擊造成狀態競爭
  const [ui, setUi]     = useState({ score: 0, status: 'idle', speed: 1 });
  const [scores, setScores] = useState([]); // 排行榜資料

  // 讀取排行榜
  useEffect(() => {
    const r = dbRef(db, 'snakeScores');
    return onValue(r, (snap) => {
      const data = snap.val();
      if (!data) { setScores([]); return; }
      const list = Object.entries(data)
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.score - a.score);
      setScores(list);
    });
  }, []);

  // 儲存分數（只在登入且比現有高分時更新）
  const saveScore = useCallback(async (finalScore) => {
    if (!playerData || isGuest || finalScore <= 0) return;
    const key = playerData.name.replace(/[.#$[\]/]/g, '_');
    const r = dbRef(db, `snakeScores/${key}`);
    const snap = await get(r);
    const existing = snap.val();
    if (!existing || finalScore > existing.score) {
      await set(r, {
        name:      playerData.name,
        group:     playerData.group || '',
        score:     finalScore,
        updatedAt: Date.now(),
      });
    }
  }, [playerData, isGuest]);

  const draw = useCallback(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const { snake, food, status, score } = gRef.current;
    const W = COLS * CELL, H = ROWS * CELL;

    ctx.fillStyle = '#1a5c1a';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke(); }
    for (let i = 0; i <= ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke(); }

    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(food[0] * CELL + CELL / 2, food[1] * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach(([x, y], i) => {
      ctx.fillStyle = i === 0 ? '#ffee00' : (i % 2 === 0 ? '#44dd44' : '#33cc33');
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      if (i === 0) {
        ctx.fillStyle = '#333';
        ctx.fillRect(x * CELL + 3, y * CELL + 3, 3, 3);
        ctx.fillRect(x * CELL + 10, y * CELL + 3, 3, 3);
      }
    });

    if (status !== 'running') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      if (status === 'idle') {
        ctx.font = 'bold 14px monospace';
        ctx.fillText('點擊畫面 / Enter 開始', W / 2, H / 2);
      } else if (status === 'dead') {
        ctx.font = 'bold 20px monospace';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
        ctx.font = '14px monospace';
        ctx.fillText(`分數：${score}`, W / 2, H / 2 + 12);
      } else if (status === 'paused') {
        ctx.font = 'bold 18px monospace';
        ctx.fillText('⏸ 暫停中', W / 2, H / 2 - 8);
        ctx.font = '13px monospace';
        ctx.fillText('點擊畫面繼續', W / 2, H / 2 + 14);
      }
    }
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(tmRef.current);
    tmRef.current = null;
  }, []);

  const startTimer = useCallback((speed) => {
    clearInterval(tmRef.current);
    tmRef.current = setInterval(() => {
      const g = gRef.current;
      if (g.status !== 'running') return;
      const [dx, dy] = g.nextDir;
      const [hx, hy] = g.snake[0];
      const nx = hx + dx, ny = hy + dy;

      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || g.snake.some(([x, y]) => x === nx && y === ny)) {
        g.status = 'dead';
        clearInterval(tmRef.current);
        const finalScore = g.score;
        setUi(u => ({ ...u, status: 'dead' }));
        draw();
        saveScore(finalScore);
        return;
      }

      const ate = nx === g.food[0] && ny === g.food[1];
      g.snake = [[nx, ny], ...g.snake];
      if (!ate) g.snake.pop();
      g.dir = g.nextDir;

      if (ate) {
        g.eaten += 1;
        g.score += 10;
        g.food = randFood(g.snake);
        const newSpeed = getSpeed(g.eaten);
        const levelUp = g.eaten % 5 === 0;
        setUi({ score: g.score, status: 'running', speed: Math.floor(g.eaten / 5) + 1 });
        if (levelUp) {
          setTimeout(() => {
            if (gRef.current.status === 'running') restartRef.current?.(newSpeed);
          }, 0);
        }
      }
      draw();
    }, speed);
  }, [draw, saveScore]);

  useEffect(() => { restartRef.current = startTimer; }, [startTimer]);

  const startGame = useCallback(() => {
    stopTimer();
    gRef.current = { ...mkGame(), status: 'running' };
    setUi({ score: 0, status: 'running', speed: 1 });
    startTimer(SPEED_INIT);
    draw();
  }, [stopTimer, startTimer, draw]);

  const resumeGame = useCallback(() => {
    const g = gRef.current;
    g.status = 'running';
    setUi(u => ({ ...u, status: 'running' }));
    startTimer(getSpeed(g.eaten));
  }, [startTimer]);

  const handleCanvasClick = useCallback(() => {
    if (transitioningRef.current) return; // 轉場中忽略重複點擊
    transitioningRef.current = true;
    setTimeout(() => { transitioningRef.current = false; }, 120);

    const g = gRef.current;
    if (g.status === 'idle' || g.status === 'dead') startGame();
    else if (g.status === 'running') {
      g.status = 'paused';
      stopTimer();
      setUi(u => ({ ...u, status: 'paused' }));
      draw();
    } else if (g.status === 'paused') {
      resumeGame();
    }
  }, [startGame, stopTimer, resumeGame, draw]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const onKey = (e) => {
      const g = gRef.current;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCanvasClick();
        return;
      }
      if (g.status !== 'running') return;
      const nd = KEY_MAP[e.key];
      if (!nd) return;
      const [cx, cy] = g.dir;
      if (nd[0] === -cx && nd[1] === -cy) return;
      e.preventDefault();
      g.nextDir = nd;
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); stopTimer(); };
  }, [handleCanvasClick, stopTimer]);

  const mobileMove = (d) => {
    const g = gRef.current;
    if (g.status !== 'running') return;
    const [cx, cy] = g.dir;
    if (d[0] === -cx && d[1] === -cy) return;
    g.nextDir = d;
  };

  const btnStyle = { width: 44, height: 34, fontSize: '1.1rem', padding: 0, textAlign: 'center' };

  // 排行榜：找出目前玩家名次
  const myKey = playerData?.name?.replace(/[.#$[\]/]/g, '_');
  const myRank = myKey ? scores.findIndex(s => s.key === myKey) : -1;
  const top10  = scores.slice(0, 10);
  const showMeExtra = myRank >= 10; // 玩家不在前10，額外顯示

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      zIndex: 9999,
    }}
      onClick={onClose}
    >
      <div
        className="win95-window"
        style={{ display: 'flex', flexDirection: 'column', width: 'fit-content', maxWidth: '96vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="win95-title-bar">
          <span>🐍 貪吃蛇</span>
          <div className="win95-title-buttons">
            <div className="win95-btn" onClick={onClose}>X</div>
          </div>
        </div>

        {/* 分數列 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 10px', backgroundColor: '#d4d0c8', borderBottom: '1px solid #808080',
          fontSize: '0.85rem',
        }}>
          <span>分數：<strong>{ui.score}</strong></span>
          <span style={{ fontSize: '0.75rem', color: '#666' }}>
            {ui.status === 'running' ? `Lv.${ui.speed}　方向鍵移動` : ''}
          </span>
          <button className="win95-button" style={{ fontSize: '0.78rem', padding: '1px 10px' }} onClick={startGame}>
            ↺ 重新
          </button>
        </div>

        {/* 遊戲畫布 */}
        <canvas
          ref={cvRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          style={{ display: 'block', width: COLS * CELL, height: ROWS * CELL, cursor: 'pointer' }}
          onClick={handleCanvasClick}
        />

        {/* Game Over → 排行榜；其他狀態 → D-pad */}
        {ui.status === 'dead' ? (
          <div style={{
            backgroundColor: '#d4d0c8', borderTop: '1px solid #808080',
            padding: '8px 10px', width: COLS * CELL, boxSizing: 'border-box',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: 6, textAlign: 'center' }}>
              🏆 排行榜
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '2px inset #808080', backgroundColor: 'white' }}>
              {top10.length === 0 && (
                <div style={{ padding: '8px', textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>尚無紀錄</div>
              )}
              {top10.map((s, i) => {
                const isMe = s.key === myKey;
                return (
                  <div key={s.key} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '3px 8px', fontSize: '0.8rem',
                    backgroundColor: isMe ? '#dde8ff' : (i % 2 === 0 ? 'white' : '#f5f5f5'),
                    fontWeight: isMe ? 'bold' : 'normal',
                    borderBottom: '1px solid #eee',
                  }}>
                    <span style={{ width: 20, textAlign: 'center', flexShrink: 0, color: i < 3 ? ['#cc8800','#666','#884400'][i] : '#999' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span style={{ flexGrow: 1 }}>{s.name}</span>
                    <span style={{ color: '#666', fontSize: '0.75rem', flexShrink: 0 }}>{s.group?.split('｜')[1] || ''}</span>
                    <span style={{ fontWeight: 'bold', flexShrink: 0 }}>{s.score}</span>
                  </div>
                );
              })}
              {showMeExtra && (
                <>
                  <div style={{ padding: '2px 8px', textAlign: 'center', color: '#aaa', fontSize: '0.75rem' }}>⋯</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '3px 8px', fontSize: '0.8rem',
                    backgroundColor: '#dde8ff', fontWeight: 'bold', borderTop: '1px solid #ccc',
                  }}>
                    <span style={{ width: 20, textAlign: 'center', color: '#999' }}>{myRank + 1}.</span>
                    <span style={{ flexGrow: 1 }}>{scores[myRank].name}</span>
                    <span style={{ color: '#666', fontSize: '0.75rem' }}>{scores[myRank].group?.split('｜')[1] || ''}</span>
                    <span style={{ fontWeight: 'bold' }}>{scores[myRank].score}</span>
                  </div>
                </>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: 6, fontSize: '0.78rem', color: '#555' }}>
              點擊畫面 / Enter 重新開始
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#d4d0c8', padding: '8px 0 6px',
            borderTop: '1px solid #808080',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <button className="win95-button" style={btnStyle} onClick={() => mobileMove([0, -1])}>↑</button>
            <div style={{ display: 'flex', gap: 3 }}>
              <button className="win95-button" style={btnStyle} onClick={() => mobileMove([-1, 0])}>←</button>
              <div style={{ width: 44 }} />
              <button className="win95-button" style={btnStyle} onClick={() => mobileMove([1, 0])}>→</button>
            </div>
            <button className="win95-button" style={btnStyle} onClick={() => mobileMove([0, 1])}>↓</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SnakeGame;
