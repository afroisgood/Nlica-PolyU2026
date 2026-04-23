// src/components/AdminLeaderboardTab.jsx
import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import AdminStatusBar from './AdminStatusBar';

function AdminLeaderboardTab({ onBack, setActiveTab, onLogout }) {
  const [scores,   setScores]   = useState([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, 'snakeScores'), (snap) => {
      const data = snap.val();
      if (!data) { setScores([]); return; }
      setScores(
        Object.entries(data)
          .map(([key, v]) => ({ key, ...v }))
          .filter((s) => s.name && typeof s.score === 'number')
          .sort((a, b) => b.score - a.score)
      );
    });
    return unsub;
  }, []);

  const handleDelete = async (key, name) => {
    if (!window.confirm(`確定刪除「${name}」的排行紀錄？`)) return;
    setDeleting(true);
    await remove(ref(db, `snakeScores/${key}`));
    setDeleting(false);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`確定清除所有 ${scores.length} 筆排行紀錄？此動作無法復原。`)) return;
    setDeleting(true);
    await remove(ref(db, 'snakeScores'));
    setDeleting(false);
  };

  const thS = { padding: '6px 10px', textAlign: 'left', borderBottom: '2px solid #444', whiteSpace: 'nowrap', fontSize: '0.82rem' };
  const tdS = { padding: '5px 10px', borderBottom: '1px solid #ddd', fontSize: '0.82rem' };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#008080', padding: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>
      <div className="win95-window" style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div className="win95-title-bar">
          <span>🏆 貪吃蛇排行榜管理</span>
          <div className="win95-title-buttons">
            <div className="win95-btn">_</div><div className="win95-btn">□</div><div className="win95-btn">X</div>
          </div>
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="win95-button" onClick={onBack}>← 返回內容管理</button>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>共 {scores.length} 筆紀錄</span>
            {scores.length > 0 && (
              <button className="win95-button" style={{ marginLeft: 'auto', color: 'red' }} disabled={deleting} onClick={handleDeleteAll}>
                🗑 清除全部
              </button>
            )}
          </div>
          <div style={{ border: '2px solid #808080', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
              <thead style={{ backgroundColor: '#d4d0c8' }}>
                <tr>
                  <th style={thS}>名次</th><th style={thS}>姓名</th>
                  <th style={thS}>組別</th><th style={thS}>最高分</th>
                  <th style={thS}>更新時間</th><th style={thS}></th>
                </tr>
              </thead>
              <tbody>
                {scores.length === 0 && <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: '#888' }}>尚無紀錄</td></tr>}
                {scores.map((s, i) => (
                  <tr key={s.key} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f5f5f5' }}>
                    <td style={tdS}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</td>
                    <td style={{ ...tdS, fontWeight: 'bold' }}>{s.name}</td>
                    <td style={{ ...tdS, color: '#555' }}>{s.group?.split('｜')[1] || s.group || '—'}</td>
                    <td style={{ ...tdS, fontWeight: 'bold', color: '#0044cc' }}>{s.score}</td>
                    <td style={{ ...tdS, color: '#888', fontSize: '0.75rem' }}>
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={tdS}>
                      <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.75rem', color: 'red' }} disabled={deleting} onClick={() => handleDelete(s.key, s.name)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <AdminStatusBar onLogout={onLogout} onDiscussion={() => setActiveTab('discussion')} onMembers={() => setActiveTab('members')} onMap={() => setActiveTab('map')} onLeaderboard={null} />
      </div>
    </main>
  );
}

export default AdminLeaderboardTab;
