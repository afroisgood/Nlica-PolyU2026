// src/components/AdminDiscussionTab.jsx
import { useState, useEffect } from 'react';
import { ref, onValue, remove, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { DISCUSSION_DAYS } from '../data/systemData';
import AdminStatusBar from './AdminStatusBar';

const EMPTY_DAY = { key: '', label: '', order: 1 };

function AdminDiscussionTab({ onBack, setActiveTab, onLogout }) {
  // 討論日期管理
  const [days, setDays]         = useState(null); // null = 初次載入中
  const [dayForm, setDayForm]   = useState(null);
  const [savingDay, setSavingDay] = useState(false);
  const [dayMsg, setDayMsg]     = useState('');

  // 留言管理
  const [selectedDay, setSelectedDay]     = useState('');
  const [discussionMsgs, setDiscussionMsgs] = useState([]);
  const [checkedMsgs, setCheckedMsgs]     = useState(new Set());

  // 載入討論日期（Firebase，沒資料或無權限時 fallback 顯示 systemData 預設值）
  useEffect(() => {
    const fallback = () => {
      setDays(DISCUSSION_DAYS);
      setSelectedDay(prev => prev || DISCUSSION_DAYS[0]?.key || '');
    };
    const r = ref(db, 'discussionDays');
    return onValue(
      r,
      (snap) => {
        const data = snap.val();
        if (!data) { fallback(); return; }
        const list = Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setDays(list);
        setSelectedDay(prev => prev || list[0]?.key || '');
      },
      // 權限不足或網路錯誤時立即 fallback，不讓頁面卡住
      (err) => { console.warn('discussionDays:', err.message); fallback(); }
    );
  }, []);

  // 載入留言
  useEffect(() => {
    if (!selectedDay) return;
    const r = ref(db, `discussions/${selectedDay}`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val();
      if (!data) { setDiscussionMsgs([]); return; }
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setDiscussionMsgs(list);
    });
    return () => unsub();
  }, [selectedDay]);

  // 是否為 fallback 狀態（days 來自 systemData，尚未入庫 Firebase）
  const isFallback = Array.isArray(days) && days.length > 0 && !days[0]?.id;

  // ── 討論日期 CRUD ──────────────────────────────────────────────────
  const handleSaveDay = async () => {
    if (!dayForm.key.trim() || !dayForm.label.trim()) {
      setDayMsg('❌ 請填入日期代碼與顯示標籤。'); return;
    }
    setSavingDay(true); setDayMsg('');
    try {
      const payload = {
        key:   dayForm.key.trim(),
        label: dayForm.label.trim(),
        order: parseInt(dayForm.order, 10) || 1,
      };
      if (dayForm.id) await set(ref(db, `discussionDays/${dayForm.id}`), payload);
      else            await push(ref(db, 'discussionDays'), payload);
      setDayMsg('✅ 已儲存'); setDayForm(null);
    } catch (e) { setDayMsg(`❌ ${e.message}`); }
    setSavingDay(false);
  };

  const handleDeleteDay = async (id) => {
    if (!window.confirm('確定刪除此討論日期？（不影響已有留言）')) return;
    await remove(ref(db, `discussionDays/${id}`));
  };

  // 將 systemData 預設值一次性匯入 Firebase
  const handleInitDays = async () => {
    if (!window.confirm(`確定將預設日期（${DISCUSSION_DAYS.length} 筆）寫入 Firebase？之後可在此頁面管理。`)) return;
    setSavingDay(true);
    for (let i = 0; i < DISCUSSION_DAYS.length; i++) {
      const d = DISCUSSION_DAYS[i];
      await push(ref(db, 'discussionDays'), { key: d.key, label: d.label, order: i + 1 });
    }
    setSavingDay(false);
  };

  // ── 留言管理 ──────────────────────────────────────────────────────
  const handleDeleteMsg = async (msgId) => {
    if (!window.confirm('確定刪除這則留言？')) return;
    await remove(ref(db, `discussions/${selectedDay}/${msgId}`));
  };

  const handleDeleteChecked = async () => {
    if (checkedMsgs.size === 0) return;
    if (!window.confirm(`確定刪除選取的 ${checkedMsgs.size} 則留言？`)) return;
    await Promise.all([...checkedMsgs].map(id => remove(ref(db, `discussions/${selectedDay}/${id}`))));
    setCheckedMsgs(new Set());
  };

  const toggleCheck = (id) => {
    setCheckedMsgs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCheckAll = () => {
    if (checkedMsgs.size === discussionMsgs.length) {
      setCheckedMsgs(new Set());
    } else {
      setCheckedMsgs(new Set(discussionMsgs.map(m => m.id)));
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#008080', padding: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>
      <div className="win95-window" style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div className="win95-title-bar">
          <span>💬 討論區管理</span>
          <div className="win95-title-buttons">
            <div className="win95-btn">_</div><div className="win95-btn">□</div><div className="win95-btn">X</div>
          </div>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button className="win95-button" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← 返回內容管理</button>

          {/* ── 討論日期管理 ── */}
          <div style={{ border: '2px solid #808080', backgroundColor: '#d4d0c8' }}>
            <div style={{ backgroundColor: '#000080', color: '#fff', padding: '4px 10px', fontWeight: 'bold', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>討論日期管理</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {isFallback && (
                  <button className="win95-button" style={{ fontSize: '0.78rem', padding: '1px 8px', color: '#000' }}
                    disabled={savingDay} onClick={handleInitDays}>
                    ↑ 匯入預設
                  </button>
                )}
                <button className="win95-button" style={{ fontSize: '0.78rem', padding: '1px 8px', color: '#000' }}
                  onClick={() => { setDayForm({ ...EMPTY_DAY, order: (days?.length || 0) + 1 }); setDayMsg(''); }}>
                  ＋ 新增日期
                </button>
              </div>
            </div>

            {isFallback && (
              <div style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#885500', backgroundColor: '#fff8e6', borderBottom: '1px solid #ccc' }}>
                ⚠️ 目前顯示內建預設日期，尚未存入 Firebase。點「匯入預設」可將日期移至後台管理。
              </div>
            )}

            {dayForm && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #808080', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px 8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem' }}>日期代碼：</label>
                <input className="win95-input" value={dayForm.key}
                  onChange={e => setDayForm({ ...dayForm, key: e.target.value })}
                  placeholder="例：2026-05-18" disabled={!!dayForm.id}
                  style={dayForm.id ? { backgroundColor: '#eee' } : {}} />
                <label style={{ fontSize: '0.85rem' }}>顯示標籤：</label>
                <input className="win95-input" value={dayForm.label}
                  onChange={e => setDayForm({ ...dayForm, label: e.target.value })}
                  placeholder="例：5/18 相見歡" />
                <label style={{ fontSize: '0.85rem' }}>順序：</label>
                <input className="win95-input" type="number" min={1} style={{ width: 60 }}
                  value={dayForm.order} onChange={e => setDayForm({ ...dayForm, order: e.target.value })} />
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="win95-button" onClick={handleSaveDay} disabled={savingDay}>{savingDay ? '...' : '💾 儲存'}</button>
                  <button className="win95-button" onClick={() => { setDayForm(null); setDayMsg(''); }}>取消</button>
                  {dayMsg && <span style={{ color: dayMsg.startsWith('✅') ? 'green' : 'red', fontSize: '0.82rem' }}>{dayMsg}</span>}
                </div>
              </div>
            )}

            <div style={{ padding: '6px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {days === null && <span style={{ fontSize: '0.82rem', color: '#666' }}>載入中...</span>}
              {days?.length === 0 && <span style={{ fontSize: '0.82rem', color: '#666' }}>尚無日期，請新增。</span>}
              {days?.map(d => (
                <div key={d.id || d.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ padding: '2px 8px', border: '1px solid #888', borderRadius: 2, fontSize: '0.82rem', backgroundColor: 'white' }}>{d.label}</span>
                  {d.id && (
                    <>
                      <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.72rem' }}
                        onClick={() => { setDayForm({ ...d }); setDayMsg(''); }}>✏️</button>
                      <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.72rem', color: 'red' }}
                        onClick={() => handleDeleteDay(d.id)}>🗑</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── 留言管理 ── */}
          <div style={{ border: '2px solid #808080', backgroundColor: '#d4d0c8' }}>
            <div style={{ backgroundColor: '#000080', color: '#fff', padding: '4px 10px', fontWeight: 'bold', fontSize: '0.88rem' }}>
              留言管理
            </div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* 選日期 + 批次刪除 */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="win95-input" value={selectedDay}
                  onChange={e => { setSelectedDay(e.target.value); setCheckedMsgs(new Set()); }}
                  style={{ fontSize: '0.9rem', padding: '2px 6px' }}>
                  {(days || []).map(d => <option key={d.id || d.key} value={d.key}>{d.label}</option>)}
                </select>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>{discussionMsgs.length} 則留言</span>
                {checkedMsgs.size > 0 && (
                  <button className="win95-button" style={{ color: 'red', fontWeight: 'bold', marginLeft: 'auto' }}
                    onClick={handleDeleteChecked}>
                    🗑 刪除選取（{checkedMsgs.size}）
                  </button>
                )}
              </div>

              {/* 全選列 */}
              {discussionMsgs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px', fontSize: '0.82rem', color: '#555' }}>
                  <input type="checkbox"
                    checked={checkedMsgs.size === discussionMsgs.length && discussionMsgs.length > 0}
                    onChange={toggleCheckAll} style={{ cursor: 'pointer' }} />
                  <span>全選 / 取消全選</span>
                </div>
              )}

              {/* 留言列表 */}
              <div style={{ border: '2px inset #808080', backgroundColor: 'white', padding: 8, minHeight: 200, maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {discussionMsgs.length === 0 && <p style={{ color: '#888', margin: 'auto', fontSize: '0.85rem' }}>此日尚無留言</p>}
                {discussionMsgs.map(msg => {
                  const checked = checkedMsgs.has(msg.id);
                  return (
                    <div key={msg.id}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', border: `1px solid ${checked ? '#0044cc' : '#ddd'}`, backgroundColor: checked ? '#e8eeff' : '#f9f9f9', cursor: 'pointer' }}
                      onClick={() => toggleCheck(msg.id)}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCheck(msg.id)}
                        onClick={e => e.stopPropagation()} style={{ marginTop: 3, flexShrink: 0, cursor: 'pointer' }} />
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 2, fontSize: '0.85rem' }}>
                          <strong>{msg.name}</strong>
                          <span style={{ color: '#666' }}>{msg.group}</span>
                          <span style={{ color: '#aaa', marginLeft: 'auto' }}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
                      </div>
                      <button className="win95-button" style={{ color: 'red', flexShrink: 0, fontSize: '0.8rem', padding: '2px 8px' }}
                        onClick={e => { e.stopPropagation(); handleDeleteMsg(msg.id); }}>🗑</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <AdminStatusBar onLogout={onLogout} onDiscussion={null} onMembers={() => setActiveTab('members')} onMap={() => setActiveTab('map')} onLeaderboard={() => setActiveTab('leaderboard')} />
      </div>
    </main>
  );
}

export default AdminDiscussionTab;
