// src/components/AdminMapTab.jsx
import { useState, useEffect } from 'react';
import { ref, onValue, remove, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import AdminStatusBar from './AdminStatusBar';

const EMPTY_LOC = { name: '', lat: '', lng: '', categoryId: '', description: '' };
const EMPTY_CAT = { label: '', order: 1, color: '#cc0000' };

function AdminMapTab({ onBack, setActiveTab, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [locations,  setLocations]  = useState([]);
  const [locForm,    setLocForm]    = useState(null);
  const [catForm,    setCatForm]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');

  useEffect(() => {
    const unsub = onValue(ref(db, 'mapCategories'), (snap) => {
      const data = snap.val();
      if (!data) { setCategories([]); return; }
      setCategories(Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, 'mapLocations'), (snap) => {
      const data = snap.val();
      if (!data) { setLocations([]); return; }
      setLocations(Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    return unsub;
  }, []);

  const handleSaveCat = async () => {
    if (!catForm.label.trim()) { setMsg('❌ 請填入分類名稱。'); return; }
    setSaving(true); setMsg('');
    try {
      const payload = { label: catForm.label.trim(), order: parseInt(catForm.order, 10) || 1, color: catForm.color || '#cc0000' };
      if (catForm.id) await set(ref(db, `mapCategories/${catForm.id}`), payload);
      else await push(ref(db, 'mapCategories'), payload);
      setMsg('✅ 分類已儲存'); setCatForm(null);
    } catch (e) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('確定刪除此分類？（地點不會被刪除，但會失去分類標籤）')) return;
    await remove(ref(db, `mapCategories/${id}`));
  };

  const handleSaveLoc = async () => {
    if (!locForm.name.trim() || !locForm.lat || !locForm.lng) { setMsg('❌ 請填入名稱、緯度、經度。'); return; }
    setSaving(true); setMsg('');
    try {
      const payload = {
        name: locForm.name.trim(), lat: parseFloat(locForm.lat),
        lng: parseFloat(locForm.lng), categoryId: locForm.categoryId || '',
        description: locForm.description.trim(),
      };
      if (locForm.id) await set(ref(db, `mapLocations/${locForm.id}`), payload);
      else await push(ref(db, 'mapLocations'), payload);
      setMsg('✅ 地點已儲存'); setLocForm(null);
    } catch (e) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  };

  const handleDeleteLoc = async (id) => {
    if (!window.confirm('確定刪除此地點？')) return;
    await remove(ref(db, `mapLocations/${id}`));
  };

  const tdS = { padding: '5px 8px', borderBottom: '1px solid #ddd', fontSize: '0.82rem' };
  const thS = { padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #444', whiteSpace: 'nowrap' };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#008080', padding: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>
      <div className="win95-window" style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div className="win95-title-bar">
          <span>🗺️ 地圖管理</span>
          <div className="win95-title-buttons">
            <div className="win95-btn">_</div><div className="win95-btn">□</div><div className="win95-btn">X</div>
          </div>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button className="win95-button" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← 返回內容管理</button>

          {/* 分類管理 */}
          <div style={{ border: '2px solid #808080', backgroundColor: '#d4d0c8' }}>
            <div style={{ backgroundColor: '#000080', color: '#fff', padding: '4px 10px', fontWeight: 'bold', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>分類標籤管理</span>
              <button className="win95-button" style={{ fontSize: '0.78rem', padding: '1px 8px', color: '#000' }}
                onClick={() => { setCatForm({ ...EMPTY_CAT, order: categories.length + 1 }); setMsg(''); }}>
                ＋ 新增分類
              </button>
            </div>
            {catForm && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #808080', display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px 8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem' }}>標籤名稱：</label>
                <input className="win95-input" value={catForm.label} onChange={(e) => setCatForm({ ...catForm, label: e.target.value })} placeholder="例：Day 1 — 5/18 相見歡" />
                <label style={{ fontSize: '0.85rem' }}>順序：</label>
                <input className="win95-input" type="number" min={1} style={{ width: 60 }} value={catForm.order} onChange={(e) => setCatForm({ ...catForm, order: e.target.value })} />
                <label style={{ fontSize: '0.85rem' }}>顏色：</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={catForm.color || '#cc0000'} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                    style={{ width: 40, height: 28, padding: 2, border: '2px inset #808080', cursor: 'pointer' }} />
                  <span style={{ padding: '2px 10px', borderRadius: 2, fontSize: '0.82rem', fontWeight: 'bold', backgroundColor: catForm.color || '#cc0000', color: '#fff' }}>
                    {catForm.label || '預覽'}
                  </span>
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="win95-button" onClick={handleSaveCat} disabled={saving}>{saving ? '...' : '💾 儲存'}</button>
                  <button className="win95-button" onClick={() => { setCatForm(null); setMsg(''); }}>取消</button>
                  {msg && <span style={{ color: msg.startsWith('✅') ? 'green' : 'red', fontSize: '0.82rem' }}>{msg}</span>}
                </div>
              </div>
            )}
            <div style={{ padding: '6px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.length === 0 && <span style={{ fontSize: '0.82rem', color: '#666' }}>尚無分類，請先新增。</span>}
              {categories.map((cat) => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ padding: '2px 10px', borderRadius: 2, fontSize: '0.82rem', fontWeight: 'bold', backgroundColor: cat.color || '#999', color: '#fff' }}>{cat.label}</span>
                  <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.72rem' }} onClick={() => { setCatForm({ ...cat }); setMsg(''); }}>✏️</button>
                  <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.72rem', color: 'red' }} onClick={() => handleDeleteCat(cat.id)}>🗑</button>
                </div>
              ))}
            </div>
          </div>

          {/* 地點管理 */}
          <div style={{ border: '2px solid #808080', backgroundColor: '#d4d0c8' }}>
            <div style={{ backgroundColor: '#000080', color: '#fff', padding: '4px 10px', fontWeight: 'bold', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>地點管理（共 {locations.length} 個）</span>
              <button className="win95-button" style={{ fontSize: '0.78rem', padding: '1px 8px', color: '#000' }} onClick={() => { setLocForm({ ...EMPTY_LOC }); setMsg(''); }}>
                ＋ 新增地點
              </button>
            </div>
            {locForm && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #808080', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px 8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem' }}>名稱：</label>
                <input className="win95-input" value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="例：花蓮車站" />
                <label style={{ fontSize: '0.85rem' }}>分類：</label>
                <select className="win95-input" value={locForm.categoryId} onChange={(e) => setLocForm({ ...locForm, categoryId: e.target.value })} style={{ fontSize: '0.85rem' }}>
                  <option value="">（未分類）</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                </select>
                <label style={{ fontSize: '0.85rem' }}>緯度：</label>
                <input className="win95-input" value={locForm.lat} onChange={(e) => setLocForm({ ...locForm, lat: e.target.value })} placeholder="在 Google Maps 右鍵點擊可取得" />
                <label style={{ fontSize: '0.85rem' }}>經度：</label>
                <input className="win95-input" value={locForm.lng} onChange={(e) => setLocForm({ ...locForm, lng: e.target.value })} placeholder="例：121.6014" />
                <label style={{ fontSize: '0.85rem' }}>說明：</label>
                <input className="win95-input" value={locForm.description} onChange={(e) => setLocForm({ ...locForm, description: e.target.value })} placeholder="（選填）" />
                <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', color: '#555' }}>
                  💡 在 Google Maps 右鍵點擊地圖，可直接複製座標（緯度, 經度）
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="win95-button" onClick={handleSaveLoc} disabled={saving}>{saving ? '儲存中...' : '💾 儲存'}</button>
                  <button className="win95-button" onClick={() => { setLocForm(null); setMsg(''); }}>取消</button>
                  {msg && <span style={{ color: msg.startsWith('✅') ? 'green' : 'red', fontSize: '0.82rem' }}>{msg}</span>}
                </div>
              </div>
            )}
            <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto', backgroundColor: 'white' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ backgroundColor: '#000080', color: 'white' }}>
                    <th style={thS}>分類</th><th style={thS}>名稱</th>
                    <th style={thS}>緯度</th><th style={thS}>經度</th>
                    <th style={thS}>說明</th><th style={thS}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 && <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: '#888' }}>尚無地點資料</td></tr>}
                  {locations.map((loc, i) => {
                    const cat = categories.find((c) => c.id === loc.categoryId);
                    const color = cat?.color || '#999';
                    return (
                      <tr key={loc.id} style={{ backgroundColor: i % 2 === 0 ? '#f0f4ff' : 'white' }}>
                        <td style={tdS}>
                          {cat
                            ? <span style={{ backgroundColor: color, color: '#fff', padding: '1px 6px', borderRadius: 2, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{cat.label}</span>
                            : <span style={{ color: '#aaa', fontSize: '0.78rem' }}>未分類</span>}
                        </td>
                        <td style={{ ...tdS, fontWeight: 'bold' }}>{loc.name}</td>
                        <td style={{ ...tdS, fontFamily: 'monospace' }}>{parseFloat(loc.lat).toFixed(5)}</td>
                        <td style={{ ...tdS, fontFamily: 'monospace' }}>{parseFloat(loc.lng).toFixed(5)}</td>
                        <td style={{ ...tdS, color: '#555', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.description || '—'}</td>
                        <td style={tdS}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="win95-button" style={{ padding: '1px 8px', fontSize: '0.78rem' }} onClick={() => { setLocForm({ ...loc }); setMsg(''); }}>✏️</button>
                            <button className="win95-button" style={{ padding: '1px 8px', fontSize: '0.78rem', color: 'red' }} onClick={() => handleDeleteLoc(loc.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <AdminStatusBar onLogout={onLogout} onDiscussion={() => setActiveTab('discussion')} onMembers={() => setActiveTab('members')} onMap={null} onLeaderboard={() => setActiveTab('leaderboard')} />
      </div>
    </main>
  );
}

export default AdminMapTab;
