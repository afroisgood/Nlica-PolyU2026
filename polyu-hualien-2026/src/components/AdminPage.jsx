// src/components/AdminPage.jsx
// 後台管理頁面（網址：/admin）
// 使用 GitHub Personal Access Token 直接更新 public/content.json

import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../lib/firebase';

const GITHUB_OWNER = 'afroisgood';
const GITHUB_REPO = 'Nlica-PolyU2026';
const CONTENT_PATH = 'polyu-hualien-2026/public/content.json';

const DISCUSSION_DAYS = [
  { key: '2026-05-18', label: '5/18 相見歡' },
  { key: '2026-05-19', label: '5/19 豐田探索' },
  { key: '2026-05-20', label: '5/20 服務學習 Day1' },
  { key: '2026-05-21', label: '5/21 服務學習 Day2' },
  { key: '2026-05-22', label: '5/22 光復鄉' },
  { key: '2026-05-24', label: '5/24 在地共創' },
];

function AdminPage() {
  const [pat, setPat] = useState(sessionStorage.getItem('admin_pat') || '');
  const [isAuthed, setIsAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'discussion'
  const [folders, setFolders] = useState([]);
  const [fileSha, setFileSha] = useState('');
  const [selectedFolderIdx, setSelectedFolderIdx] = useState(0);
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // 討論區管理
  const [selectedDay, setSelectedDay] = useState(DISCUSSION_DAYS[0].key);
  const [discussionMsgs, setDiscussionMsgs] = useState([]);

  const loadContent = async (token) => {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) throw new Error('驗證失敗，請確認 PAT 是否正確。');
    const data = await res.json();
    setFileSha(data.sha);
    const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
    const text = new TextDecoder('utf-8').decode(bytes);
    const content = JSON.parse(text);
    setFolders(content.folders);
    setIsAuthed(true);
    sessionStorage.setItem('admin_pat', token);
  };

  const handleLogin = async () => {
    setStatusMsg('驗證中...');
    try {
      await loadContent(pat);
      setStatusMsg('');
    } catch (e) {
      setStatusMsg(`錯誤：${e.message}`);
    }
  };

  useEffect(() => {
    if (!isAuthed) return;
    const msgRef = ref(db, `discussions/${selectedDay}`);
    const unsub = onValue(msgRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setDiscussionMsgs([]); return; }
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setDiscussionMsgs(list);
    });
    return () => unsub();
  }, [isAuthed, selectedDay]);

  const handleDeleteMsg = async (msgId) => {
    if (!window.confirm('確定刪除這則留言？')) return;
    await remove(ref(db, `discussions/${selectedDay}/${msgId}`));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg('儲存中...');
    try {
      const newContent = JSON.stringify({ folders }, null, 2);
      const encoded = btoa(unescape(encodeURIComponent(newContent)));
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`,
        {
          method: 'PUT',
          headers: { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Update content via admin panel', content: encoded, sha: fileSha }),
        }
      );
      if (!res.ok) throw new Error('儲存失敗，請重試。');
      const data = await res.json();
      setFileSha(data.content.sha);
      setStatusMsg('✅ 儲存成功！網頁內容已更新。');
    } catch (e) {
      setStatusMsg(`❌ 錯誤：${e.message}`);
    }
    setIsSaving(false);
  };

  const updateDocField = (folderIdx, docIdx, field, value) => {
    setFolders((prev) => {
      const next = prev.map((f, fi) =>
        fi !== folderIdx ? f : {
          ...f,
          docs: f.docs.map((d, di) => di !== docIdx ? d : { ...d, [field]: value }),
        }
      );
      return next;
    });
  };

  const addDoc = (folderIdx) => {
    setFolders((prev) => prev.map((f, fi) =>
      fi !== folderIdx ? f : {
        ...f,
        docs: [...f.docs, { id: `doc_${Date.now()}`, title: '📄 新文件.txt', content: '' }],
      }
    ));
  };

  const deleteDoc = (folderIdx, docIdx) => {
    if (!window.confirm('確定刪除這份文件？')) return;
    setFolders((prev) => prev.map((f, fi) =>
      fi !== folderIdx ? f : { ...f, docs: f.docs.filter((_, di) => di !== docIdx) }
    ));
  };

  const currentFolder = folders[selectedFolderIdx];
  const currentDoc = currentFolder?.docs[selectedDocIdx];

  if (!isAuthed) {
    return (
      <main className="win95-container">
        <div className="win95-window" style={{ maxWidth: 500 }}>
          <div className="win95-title-bar">
            <span>Admin_Panel.exe — 後台管理</span>
            <div className="win95-title-buttons">
              <div className="win95-btn">_</div><div className="win95-btn">□</div><div className="win95-btn">X</div>
            </div>
          </div>
          <div className="win95-content">
            <h2>後台登入</h2>
            <p>&gt; 請輸入 GitHub Personal Access Token：</p>
            <input
              type="password"
              className="win95-input"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="ghp_xxxxxxxxxxxx"
              style={{ width: '90%', maxWidth: '90%' }}
            />
            <br />
            <button className="win95-button" onClick={handleLogin}>登入後台</button>
            {statusMsg && <p style={{ marginTop: 12, color: statusMsg.startsWith('錯誤') ? 'red' : '#000080', fontWeight: 'bold' }}>{statusMsg}</p>}
          </div>
        </div>
      </main>
    );
  }

  if (activeTab === 'discussion') {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#008080', padding: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>
        <div className="win95-window" style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
          <div className="win95-title-bar">
            <span>討論區管理</span>
            <div className="win95-title-buttons">
              <div className="win95-btn">_</div><div className="win95-btn">□</div><div className="win95-btn">X</div>
            </div>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="win95-button" onClick={() => setActiveTab('content')}>← 返回內容管理</button>
              <select
                className="win95-input"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '2px 6px' }}
              >
                {DISCUSSION_DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>{discussionMsgs.length} 則留言</span>
            </div>
            <div style={{ border: '2px inset #808080', backgroundColor: 'white', padding: 8, minHeight: 300, maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {discussionMsgs.length === 0 && <p style={{ color: '#888', margin: 'auto' }}>此日尚無留言</p>}
              {discussionMsgs.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
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
                  <button
                    className="win95-button"
                    style={{ color: 'red', flexShrink: 0, fontSize: '0.8rem', padding: '2px 8px' }}
                    onClick={() => handleDeleteMsg(msg.id)}
                  >🗑</button>
                </div>
              ))}
            </div>
          </div>
          <StatusBarMini pat={pat} onLogout={() => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); }} />
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#008080', padding: '12px', gap: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>

      {/* 左側：資料夾與文件清單 */}
      <div className="win95-window" style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="win95-title-bar"><span>目錄</span></div>
        <div style={{ padding: 8, overflowY: 'auto', flexGrow: 1 }}>
          {folders.map((folder, fi) => (
            <div key={folder.key} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: 4, color: '#000080' }}>
                📁 {folder.title}
              </div>
              {folder.docs.map((doc, di) => (
                <div
                  key={doc.id}
                  className="win95-file-item"
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 8px',
                    backgroundColor: selectedFolderIdx === fi && selectedDocIdx === di ? '#000080' : 'transparent',
                    color: selectedFolderIdx === fi && selectedDocIdx === di ? 'white' : 'black',
                    cursor: 'pointer',
                  }}
                  onClick={() => { setSelectedFolderIdx(fi); setSelectedDocIdx(di); setStatusMsg(''); }}
                >
                  {doc.title}
                </div>
              ))}
              <div
                style={{ fontSize: '0.8rem', padding: '3px 8px', color: '#555', cursor: 'pointer' }}
                onClick={() => { addDoc(fi); setSelectedFolderIdx(fi); setSelectedDocIdx(folders[fi].docs.length); }}
              >
                ＋ 新增文件
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右側：編輯區 */}
      <div className="win95-window" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="win95-title-bar">
          <span>編輯：{currentDoc?.title || '—'}</span>
          <div className="win95-title-buttons">
            <div className="win95-btn">_</div><div className="win95-btn">□</div><div className="win95-btn">X</div>
          </div>
        </div>
        <div style={{ padding: 16, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentDoc ? (
            <>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>檔案標題</label>
                <input
                  className="win95-input"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                  value={currentDoc.title}
                  onChange={(e) => updateDocField(selectedFolderIdx, selectedDocIdx, 'title', e.target.value)}
                />
              </div>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>內容</label>
                <textarea
                  style={{
                    flexGrow: 1,
                    width: '100%',
                    boxSizing: 'border-box',
                    fontFamily: "'DotGothic16', 'Courier New', monospace",
                    fontSize: '1rem',
                    padding: 10,
                    border: '2px inset #808080',
                    resize: 'none',
                    lineHeight: 1.8,
                    minHeight: 300,
                  }}
                  value={currentDoc.content || ''}
                  onChange={(e) => updateDocField(selectedFolderIdx, selectedDocIdx, 'content', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="win95-button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? '儲存中...' : '💾 儲存到 GitHub'}
                </button>
                <button
                  className="win95-button"
                  style={{ color: 'red' }}
                  onClick={() => deleteDoc(selectedFolderIdx, selectedDocIdx)}
                >
                  🗑 刪除此文件
                </button>
                {statusMsg && <span style={{ fontWeight: 'bold', color: statusMsg.startsWith('✅') ? 'green' : 'red' }}>{statusMsg}</span>}
              </div>
            </>
          ) : (
            <p>&gt; 請從左側選擇一份文件進行編輯。</p>
          )}
        </div>
        <StatusBarMini pat={pat} onLogout={() => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); }} onDiscussion={() => setActiveTab('discussion')} />
      </div>
    </main>
  );
}

function StatusBarMini({ pat, onLogout, onDiscussion }) {
  return (
    <div style={{ borderTop: '2px solid #808080', padding: '3px 8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', backgroundColor: '#c0c0c0' }}>
      <span>已連線 GitHub：{GITHUB_OWNER}/{GITHUB_REPO}</span>
      {onDiscussion && <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', color: '#000080', textDecoration: 'underline' }} onClick={onDiscussion}>💬 討論區管理</button>}
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', color: '#000080', textDecoration: 'underline' }} onClick={onLogout}>登出</button>
    </div>
  );
}

export default AdminPage;
