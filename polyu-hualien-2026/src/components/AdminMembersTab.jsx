// src/components/AdminMembersTab.jsx
import { useState, useEffect } from 'react';
import { fetchUsers } from '../data/fetchUsers';
import AdminStatusBar from './AdminStatusBar';

function AdminMembersTab({ onBack, setActiveTab, onLogout }) {
  const [membersData, setMembersData]           = useState(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError]         = useState('');

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    setMembersError('');
    try {
      const data = await fetchUsers();
      setMembersData(data);
    } catch (e) {
      setMembersError(e.message);
    }
    setIsLoadingMembers(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const thStyle = { padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #444', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '5px 10px', borderBottom: '1px solid #ddd', fontSize: '0.83rem' };

  const membersList = membersData
    ? Object.entries(membersData)
        .map(([code, d]) => ({ code, ...d }))
        .sort((a, b) => a.group.localeCompare(b.group, 'zh'))
    : [];

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#008080', padding: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>
      <div className="win95-window" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div className="win95-title-bar">
          <span>👥 成員名單預覽（唯讀）</span>
          <div className="win95-title-buttons">
            <div className="win95-btn">_</div><div className="win95-btn">□</div><div className="win95-btn">X</div>
          </div>
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="win95-button" onClick={onBack}>← 返回內容管理</button>
            <button className="win95-button" onClick={loadMembers} disabled={isLoadingMembers}>
              {isLoadingMembers ? '載入中...' : '🔄 重新整理'}
            </button>
            {membersData && <span style={{ fontSize: '0.85rem', color: '#555' }}>共 {membersList.length} 位成員</span>}
          </div>
          {isLoadingMembers && <p>&gt; 正在從 Google Sheets 載入資料...</p>}
          {membersError && <p style={{ color: 'red' }}>&gt; 錯誤：{membersError}</p>}
          {membersData && (
            <div style={{ border: '2px inset #808080', backgroundColor: 'white', overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ backgroundColor: '#000080', color: 'white' }}>
                    <th style={thStyle}>憑證代碼</th><th style={thStyle}>姓名</th>
                    <th style={thStyle}>組別</th><th style={thStyle}>組別頭銜</th>
                    <th style={thStyle}>導師</th><th style={thStyle}>地點</th>
                  </tr>
                </thead>
                <tbody>
                  {membersList.map(({ code, name, group, factionTitle, mentor, location }, i) => (
                    <tr key={code} style={{ backgroundColor: i % 2 === 0 ? '#f0f4ff' : 'white' }}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#000080' }}>{code}</td>
                      <td style={tdStyle}>{name}</td>
                      <td style={tdStyle}>{group}</td>
                      <td style={tdStyle}>{factionTitle}</td>
                      <td style={tdStyle}>{mentor}</td>
                      <td style={tdStyle}>{location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <AdminStatusBar onLogout={onLogout} onDiscussion={() => setActiveTab('discussion')} onMembers={null} onMap={() => setActiveTab('map')} onLeaderboard={() => setActiveTab('leaderboard')} />
      </div>
    </main>
  );
}

export default AdminMembersTab;
