// src/components/AdminPage.jsx
// 後台管理頁面（網址：/admin）
// 使用 GitHub Personal Access Token 直接更新 public/content.json

import { useState, useEffect } from 'react';

const GITHUB_OWNER = 'afroisgood';
const GITHUB_REPO = 'Nlica-PolyU2026';
const CONTENT_PATH = 'polyu-hualien-2026/public/content.json';

function AdminPage() {
  const [pat, setPat] = useState(sessionStorage.getItem('admin_pat') || '');
  const [isAuthed, setIsAuthed] = useState(false);
  const [folders, setFolders] = useState([]);
  const [fileSha, setFileSha] = useState('');
  const [selectedFolderIdx, setSelectedFolderIdx] = useState(0);
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        <StatusBarMini pat={pat} onLogout={() => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); }} />
      </div>
    </main>
  );
}

function StatusBarMini({ pat, onLogout }) {
  return (
    <div style={{ borderTop: '2px solid #808080', padding: '3px 8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', backgroundColor: '#c0c0c0' }}>
      <span>已連線 GitHub：{GITHUB_OWNER}/{GITHUB_REPO}</span>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', color: '#000080', textDecoration: 'underline' }} onClick={onLogout}>登出</button>
    </div>
  );
}

export default AdminPage;
