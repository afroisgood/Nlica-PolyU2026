// src/components/AdminMembersTab.jsx
import { useState, useEffect } from 'react';
import { fetchUsers } from '../data/fetchUsers';
import { fetchCustomCodes, resetCustomCode } from '../lib/firebase';
import AdminStatusBar from './AdminStatusBar';

function AdminMembersTab({ onBack, setActiveTab, onLogout }) {
  const [membersData, setMembersData]           = useState(null);
  const [customCodes, setCustomCodes]           = useState({});
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError]         = useState('');
  const [resetting, setResetting]               = useState(null); // originalCode being reset

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    setMembersError('');
    try {
      const [data, codes] = await Promise.all([fetchUsers(), fetchCustomCodes()]);
      setMembersData(data);
      setCustomCodes(codes);
    } catch (e) {
      setMembersError(e.message);
    }
    setIsLoadingMembers(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const handleReset = async (originalCode) => {
    if (!window.confirm(`確定要重置「${originalCode}」的自訂代碼嗎？\n該成員下次登入時需重新設定。`)) return;
    setResetting(originalCode);
    try {
      await resetCustomCode(originalCode);
      setCustomCodes((prev) => {
        const next = { ...prev };
        delete next[originalCode];
        return next;
      });
    } catch {
      alert('重置失敗，請稍後再試。');
    }
    setResetting(null);
  };

  const thStyle = { padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #444', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '5px 10px', borderBottom: '1px solid #ddd', fontSize: '0.83rem' };

  const membersList = membersData
    ? Object.entries(membersData)
        .map(([code, d]) => ({ code, ...d }))
        .sort((a, b) => a.group.localeCompare(b.group, 'zh'))
    : [];

  const setCount = Object.keys(customCodes).length;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#008080', padding: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>
      <div className="win95-window" style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div className="win95-title-bar">
          <span>👥 成員名單預覽</span>
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
            {membersData && (
              <span style={{ fontSize: '0.85rem', color: '#555' }}>
                共 {membersList.length} 位成員，已設定自訂代碼：{setCount} 人
              </span>
            )}
          </div>
          {isLoadingMembers && <p>&gt; 正在載入資料...</p>}
          {membersError && <p style={{ color: 'red' }}>&gt; 錯誤：{membersError}</p>}
          {membersData && (
            <div style={{ border: '2px inset #808080', backgroundColor: 'white', overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ backgroundColor: '#000080', color: 'white' }}>
                    <th style={thStyle}>原始代碼</th><th style={thStyle}>姓名</th>
                    <th style={thStyle}>組別</th><th style={thStyle}>導師</th>
                    <th style={thStyle}>自訂代碼</th><th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {membersList.map(({ code, name, group, mentor }, i) => {
                    const custom = customCodes[code];
                    return (
                      <tr key={code} style={{ backgroundColor: i % 2 === 0 ? '#f0f4ff' : 'white' }}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#000080' }}>{code}</td>
                        <td style={tdStyle}>{name}</td>
                        <td style={tdStyle}>{group}</td>
                        <td style={tdStyle}>{mentor}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: custom ? '#006400' : '#aaa' }}>
                          {custom ?? '未設定'}
                        </td>
                        <td style={tdStyle}>
                          {custom && (
                            <button
                              className="win95-button"
                              style={{ fontSize: '0.75rem', padding: '2px 8px', margin: 0 }}
                              onClick={() => handleReset(code)}
                              disabled={resetting === code}
                            >
                              {resetting === code ? '重置中...' : '重置'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
