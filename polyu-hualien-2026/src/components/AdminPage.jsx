// src/components/AdminPage.jsx
// 後台管理頁面（網址：/admin）
// 使用 GitHub Personal Access Token 直接更新 public/content.json

import { useState, useRef } from 'react';
import { renderMarkdown } from '../lib/markdown.jsx';
import { GITHUB_OWNER, GITHUB_REPO, CONTENT_PATH, MEDIA_DIR, RAW_BASE } from '../lib/adminConfig';
import AdminStatusBar from './AdminStatusBar';
import AdminMapTab from './AdminMapTab';
import AdminLeaderboardTab from './AdminLeaderboardTab';
import AdminDiscussionTab from './AdminDiscussionTab';
import AdminMembersTab from './AdminMembersTab';
import Lightbox from './Lightbox.jsx';

// ── GitHub 媒體上傳 ────────────────────────────────────────────────
async function uploadMediaToGitHub(pat, filename, base64Content) {
  const path = `${MEDIA_DIR}/${filename}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const headers = { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };

  let sha;
  const checkRes = await fetch(apiUrl, { headers });
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  const body = { message: `Upload media: ${filename}`, content: base64Content };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || '上傳失敗');
  }
  return `${RAW_BASE}/${filename}`;
}

// ── 讀取檔案為 base64 ─────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      const bytes = new Uint8Array(buf);
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      resolve(btoa(binary));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── 在 textarea 游標處插入文字 ────────────────────────────────────
function buildInsertedValue(original, selStart, selEnd, before, selText, after) {
  return original.slice(0, selStart) + before + selText + after + original.slice(selEnd);
}

// ── 工具列按鈕 ────────────────────────────────────────────────────
function ToolbarBtn({ label, title, onMouseDown }) {
  return (
    <button
      className="win95-button"
      title={title}
      style={{ padding: '2px 8px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
      onMouseDown={onMouseDown}
    >
      {label}
    </button>
  );
}

// ── YouTube ID 提取 ────────────────────────────────────────────────
const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /music\.youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
];
function extractYouTubeId(url) {
  for (const re of YT_PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

// ── 插入面板（Toolbar Panel）────────────────────────────────────
function InsertPanel({ type, pat, onInsert, onClose }) {
  const isImage = type === 'image';
  const isAudio = type === 'audio';
  const isVideo = type === 'video';
  const isLink  = type === 'link';
  const isMedia = isAudio || isVideo;

  const [sourceMode, setSourceMode] = useState(isMedia ? 'youtube' : 'url');
  const [url, setUrl]               = useState('');
  const [ytUrl, setYtUrl]           = useState('');
  const [altText, setAltText]       = useState('');
  const [file, setFile]             = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg]   = useState('');
  const fileRef = useRef(null);

  const icon  = isImage ? '🖼️' : isAudio ? '🎵' : isVideo ? '🎬' : '🔗';
  const label = isImage ? '圖片' : isAudio ? '音樂' : isVideo ? '影片' : '連結';
  const accept = isImage ? 'image/*' : isAudio ? 'audio/*' : isVideo ? 'video/*' : '';

  const activeUrl = sourceMode === 'youtube' ? ytUrl : url;
  const ytId      = sourceMode === 'youtube' ? extractYouTubeId(ytUrl) : null;
  const ytValid   = sourceMode === 'youtube' && !!ytId;

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true); setUploadMsg('上傳中...');
    try {
      const base64 = await fileToBase64(file);
      const rawUrl = await uploadMediaToGitHub(pat, file.name, base64);
      setUrl(rawUrl); setUploadMsg('✅ 上傳成功');
    } catch (e) { setUploadMsg(`❌ ${e.message}`); }
    setIsUploading(false);
  };

  const handleConfirm = () => {
    const finalUrl = activeUrl.trim();
    if (!finalUrl) return;
    if (isLink)       onInsert(`[${altText || '連結文字'}](${finalUrl})`);
    else if (isImage) onInsert(`![${altText || '圖片'}](${finalUrl})`);
    else if (isAudio) onInsert(`[audio:${altText || '音樂'}](${finalUrl})`);
    else if (isVideo) onInsert(`[video:${altText || '影片'}](${finalUrl})`);
    onClose();
  };

  const canConfirm = sourceMode === 'youtube' ? ytValid : !!activeUrl.trim();

  const previewSyntax = (() => {
    const u = activeUrl.trim();
    if (!u) return '';
    if (isLink)       return `[${altText || '連結文字'}](${u})`;
    if (isImage)      return `![${altText || '圖片'}](${u})`;
    if (isAudio)      return `[audio:${altText || '音樂'}](${u})`;
    if (isVideo)      return `[video:${altText || '影片'}](${u})`;
    return '';
  })();

  const tabStyle = (mode) => ({
    padding: '3px 10px', fontSize: '0.8rem', cursor: 'pointer',
    backgroundColor: sourceMode === mode ? '#000080' : '#c0c0c0',
    color: sourceMode === mode ? '#fff' : '#000',
    border: '1px solid #808080', borderBottom: 'none',
  });

  return (
    <div style={{ border: '2px solid #000080', backgroundColor: '#c0c0c0', fontSize: '0.85rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px 4px', fontWeight: 'bold', borderBottom: '1px solid #808080' }}>
        <span>{icon} 插入{label}</span>
        <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.75rem' }} onClick={onClose}>✕</button>
      </div>

      {isMedia && (
        <div style={{ display: 'flex', paddingLeft: 10, paddingTop: 6, gap: 2 }}>
          <button style={tabStyle('youtube')} onClick={() => setSourceMode('youtube')}>▶ YouTube</button>
          <button style={tabStyle('url')}     onClick={() => setSourceMode('url')}>🔗 直接網址</button>
          <button style={tabStyle('upload')}  onClick={() => setSourceMode('upload')}>⬆️ 上傳檔案</button>
        </div>
      )}

      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <label style={{ minWidth: 64 }}>{isLink ? '顯示文字' : '說明文字'}：</label>
          <input className="win95-input" style={{ flex: 1 }}
            placeholder={isLink ? '點此前往...' : isImage ? '圖片說明' : isAudio ? '音樂標題' : '影片標題'}
            value={altText} onChange={(e) => setAltText(e.target.value)} />
        </div>

        {sourceMode === 'youtube' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label style={{ minWidth: 64 }}>YouTube：</label>
              <input className="win95-input" style={{ flex: 1 }}
                placeholder="https://www.youtube.com/watch?v=... 或 https://youtu.be/..."
                value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} />
            </div>
            {ytUrl && (
              ytId
                ? <span style={{ fontSize: '0.78rem', color: 'green', paddingLeft: 70 }}>✅ 已辨識 YouTube ID：{ytId}</span>
                : <span style={{ fontSize: '0.78rem', color: 'red', paddingLeft: 70 }}>⚠️ 無法辨識 YouTube 連結，請確認格式</span>
            )}
          </div>
        )}

        {sourceMode === 'url' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ minWidth: 64 }}>網址：</label>
            <input className="win95-input" style={{ flex: 1 }}
              placeholder={isLink ? 'https://maps.app.goo.gl/...' : `https://... (.${isImage ? 'jpg/png' : isAudio ? 'mp3' : 'mp4'})`}
              value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        )}

        {sourceMode === 'upload' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ minWidth: 64 }}>選擇檔案：</label>
            <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }}
              onChange={(e) => { setFile(e.target.files[0] || null); setUploadMsg(''); setUrl(''); }} />
            <button className="win95-button" style={{ padding: '2px 8px', fontSize: '0.82rem' }}
              onClick={() => fileRef.current?.click()}>📂 瀏覽</button>
            {file && <span style={{ fontSize: '0.8rem', color: '#333' }}>{file.name}</span>}
            {file && !url && (
              <button className="win95-button" style={{ padding: '2px 8px', fontSize: '0.82rem' }}
                onClick={handleUpload} disabled={isUploading}>
                {isUploading ? '上傳中...' : '⬆️ 上傳到 GitHub'}
              </button>
            )}
            {uploadMsg && <span style={{ fontSize: '0.8rem', color: uploadMsg.startsWith('✅') ? 'green' : 'red' }}>{uploadMsg}</span>}
          </div>
        )}

        {isLink && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ minWidth: 64 }}>網址：</label>
            <input className="win95-input" style={{ flex: 1 }}
              placeholder="https://maps.app.goo.gl/..."
              value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        )}

        {isImage && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ minWidth: 64 }}>或上傳：</label>
            <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }}
              onChange={(e) => { setFile(e.target.files[0] || null); setUploadMsg(''); setUrl(''); }} />
            <button className="win95-button" style={{ padding: '2px 8px', fontSize: '0.82rem' }}
              onClick={() => fileRef.current?.click()}>📂 瀏覽</button>
            {file && <span style={{ fontSize: '0.8rem', color: '#333' }}>{file.name}</span>}
            {file && !url && (
              <button className="win95-button" style={{ padding: '2px 8px', fontSize: '0.82rem' }}
                onClick={handleUpload} disabled={isUploading}>
                {isUploading ? '上傳中...' : '⬆️ 上傳到 GitHub'}
              </button>
            )}
            {uploadMsg && <span style={{ fontSize: '0.8rem', color: uploadMsg.startsWith('✅') ? 'green' : 'red' }}>{uploadMsg}</span>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button className="win95-button" onClick={handleConfirm} disabled={!canConfirm}>✅ 插入文件</button>
          <button className="win95-button" onClick={onClose}>取消</button>
        </div>

        {previewSyntax && (
          <div style={{ padding: '4px 8px', backgroundColor: '#fff', border: '1px inset #808080', fontSize: '0.78rem', fontFamily: 'monospace', color: '#555', wordBreak: 'break-all' }}>
            {previewSyntax}
          </div>
        )}

        {isImage && activeUrl.trim() && (
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 3 }}>縮圖預覽：</div>
            <img src={activeUrl.trim()} alt="preview"
              style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', border: '1px solid #808080', display: 'block', background: '#fff' }}
              onError={e => { e.target.style.display = 'none'; }}
              onLoad={e => { e.target.style.display = 'block'; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────────
function AdminPage() {
  const [pat, setPat]                         = useState(sessionStorage.getItem('admin_pat') || '');
  const [isAuthed, setIsAuthed]               = useState(false);
  const [activeTab, setActiveTab]             = useState('content');
  const [folders, setFolders]                 = useState([]);
  const [selectedFolderIdx, setSelectedFolderIdx] = useState(0);
  const [selectedDocIdx, setSelectedDocIdx]   = useState(0);
  const [statusMsg, setStatusMsg]             = useState('');
  const [isSaving, setIsSaving]               = useState(false);
  const [toolbarPanel, setToolbarPanel]       = useState(null);
  const [showPreview, setShowPreview]         = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState(null);
  const [dragItem, setDragItem]               = useState(null);
  const [dragOver, setDragOver]               = useState(null);
  const textareaRef = useRef(null);
  const savedSel    = useRef({ start: 0, end: 0, text: '' });

  const onLogout = () => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); };

  const loadContent = async (token) => {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) throw new Error('驗證失敗，請確認 PAT 是否正確。');
    const data = await res.json();
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
    setIsSaving(true); setStatusMsg('儲存中...');
    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
      const headers = { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };

      const checkRes = await fetch(apiUrl, { headers });
      if (!checkRes.ok) throw new Error('無法取得檔案資訊，請確認 PAT 仍有效。');
      const checkData = await checkRes.json();

      const newContent = JSON.stringify({ folders }, null, 2);
      const bytes = new TextEncoder().encode(newContent);
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      const encoded = btoa(binary);

      const res = await fetch(apiUrl, {
        method: 'PUT', headers,
        body: JSON.stringify({ message: 'Update content via admin panel', content: encoded, sha: checkData.sha }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      setStatusMsg('✅ 儲存成功！網頁內容已更新。');
    } catch (e) {
      setStatusMsg(`❌ 錯誤：${e.message}`);
    }
    setIsSaving(false);
  };

  const updateDocField = (folderIdx, docIdx, field, value) => {
    setFolders((prev) => prev.map((f, fi) =>
      fi !== folderIdx ? f : {
        ...f,
        docs: f.docs.map((d, di) => di !== docIdx ? d : { ...d, [field]: value }),
      }
    ));
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

  const captureSelection = (e, panelType) => {
    e.preventDefault();
    const el = textareaRef.current;
    if (el) {
      savedSel.current = {
        start: el.selectionStart,
        end:   el.selectionEnd,
        text:  el.value.slice(el.selectionStart, el.selectionEnd),
      };
    }
    setToolbarPanel(panelType === toolbarPanel ? null : panelType);
  };

  const handleInsert = (syntax) => {
    const { start, end } = savedSel.current;
    const el = textareaRef.current;
    if (!el) return;
    const newValue = buildInsertedValue(el.value, start, end, syntax, '', '');
    updateDocField(selectedFolderIdx, selectedDocIdx, 'content', newValue);
    setToolbarPanel(null);
    setTimeout(() => {
      el.focus();
      const pos = start + syntax.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  // ── 登入頁 ──────────────────────────────────────────────────────
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
              type="password" className="win95-input"
              value={pat} onChange={(e) => setPat(e.target.value)}
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

  // ── 子頁路由 ─────────────────────────────────────────────────────
  if (activeTab === 'map') {
    return <AdminMapTab onBack={() => setActiveTab('content')} setActiveTab={setActiveTab} onLogout={onLogout} />;
  }
  if (activeTab === 'leaderboard') {
    return <AdminLeaderboardTab onBack={() => setActiveTab('content')} setActiveTab={setActiveTab} onLogout={onLogout} />;
  }
  if (activeTab === 'discussion') {
    return <AdminDiscussionTab onBack={() => setActiveTab('content')} setActiveTab={setActiveTab} onLogout={onLogout} />;
  }
  if (activeTab === 'members') {
    return <AdminMembersTab onBack={() => setActiveTab('content')} setActiveTab={setActiveTab} onLogout={onLogout} />;
  }

  // ── 內容管理（主頁）────────────────────────────────────────────
  const currentFolder = folders[selectedFolderIdx];
  const currentDoc    = currentFolder?.docs[selectedDocIdx];

  return (
    <main style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#008080', padding: '12px', gap: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>

      {/* 左側：目錄 */}
      <div className="win95-window" style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="win95-title-bar"><span>目錄</span></div>
        <div style={{ padding: 8, overflowY: 'auto', flexGrow: 1 }}>
          {folders.map((folder, fi) => (
            <div key={folder.key} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: 4, color: '#000080' }}>
                📁 {folder.title}
              </div>
              {folder.docs.map((doc, di) => {
                const isSelected = selectedFolderIdx === fi && selectedDocIdx === di;
                const isDragging = dragItem?.fi === fi && dragItem?.di === di;
                const isOver     = dragOver?.fi === fi && dragOver?.di === di && !isDragging;
                return (
                  <div key={doc.id} className="win95-file-item" draggable
                    style={{
                      fontSize: '0.8rem', padding: '4px 8px', cursor: 'grab',
                      backgroundColor: isSelected ? '#000080' : 'transparent',
                      color: isSelected ? 'white' : 'black',
                      opacity: isDragging ? 0.35 : 1,
                      borderTop: isOver ? '2px solid #000080' : '2px solid transparent',
                      userSelect: 'none',
                    }}
                    onClick={() => { setSelectedFolderIdx(fi); setSelectedDocIdx(di); setStatusMsg(''); setToolbarPanel(null); }}
                    onDragStart={() => setDragItem({ fi, di })}
                    onDragEnter={() => setDragOver({ fi, di })}
                    onDragOver={e => e.preventDefault()}
                    onDragEnd={() => { setDragItem(null); setDragOver(null); }}
                    onDrop={e => {
                      e.preventDefault();
                      if (!dragItem || dragItem.fi !== fi || dragItem.di === di) { setDragItem(null); setDragOver(null); return; }
                      setFolders(prev => prev.map((f, idx) => {
                        if (idx !== fi) return f;
                        const docs = [...f.docs];
                        const [moved] = docs.splice(dragItem.di, 1);
                        docs.splice(di, 0, moved);
                        return { ...f, docs };
                      }));
                      if (isSelected) setSelectedDocIdx(di);
                      setDragItem(null); setDragOver(null);
                    }}
                  >
                    <span style={{ marginRight: 4, opacity: 0.4, fontSize: '0.7rem' }}>⠿</span>
                    {doc.title}
                  </div>
                );
              })}
              <div style={{ fontSize: '0.8rem', padding: '3px 8px', color: '#555', cursor: 'pointer' }}
                onClick={() => { addDoc(fi); setSelectedFolderIdx(fi); setSelectedDocIdx(folders[fi].docs.length); setToolbarPanel(null); }}>
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
                <input className="win95-input" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                  value={currentDoc.title}
                  onChange={(e) => updateDocField(selectedFolderIdx, selectedDocIdx, 'title', e.target.value)} />
              </div>

              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>內容</label>

                {/* 工具列 */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '4px 6px', backgroundColor: '#d4d0c8', border: '1px solid #808080', borderBottom: 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555', marginRight: 4 }}>插入：</span>
                  <ToolbarBtn label="🔗 連結" title="插入超連結（選取文字後點擊）" onMouseDown={(e) => captureSelection(e, 'link')} />
                  <ToolbarBtn label="🖼️ 圖片" title="插入圖片（支援上傳或 URL）" onMouseDown={(e) => captureSelection(e, 'image')} />
                  <ToolbarBtn label="🎵 音樂" title="插入音樂播放器" onMouseDown={(e) => captureSelection(e, 'audio')} />
                  <ToolbarBtn label="🎬 影片" title="插入影片播放器" onMouseDown={(e) => captureSelection(e, 'video')} />
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button className="win95-button"
                      style={{ padding: '2px 8px', fontSize: '0.82rem', backgroundColor: showPreview ? '#000080' : undefined, color: showPreview ? '#fff' : undefined }}
                      onMouseDown={e => { e.preventDefault(); setShowPreview(v => !v); }}
                      title="切換即時預覽">
                      {showPreview ? '✏️ 編輯' : '👁 預覽'}
                    </button>
                  </div>
                </div>

                {toolbarPanel && (
                  <InsertPanel type={toolbarPanel} pat={pat} onInsert={handleInsert} onClose={() => setToolbarPanel(null)} />
                )}

                <div style={{ flexGrow: 1, display: 'flex', gap: showPreview ? 8 : 0, minHeight: 280 }}>
                  <textarea ref={textareaRef}
                    style={{
                      flex: showPreview ? '1 1 50%' : '1 1 100%',
                      boxSizing: 'border-box',
                      fontFamily: "'DotGothic16', 'Courier New', monospace",
                      fontSize: '0.95rem', padding: 10,
                      border: '2px inset #808080', resize: 'none', lineHeight: 1.8,
                    }}
                    value={currentDoc.content || ''}
                    onChange={(e) => updateDocField(selectedFolderIdx, selectedDocIdx, 'content', e.target.value)}
                  />

                  {showPreview && (
                    <div style={{ flex: '1 1 50%', border: '2px inset #808080', backgroundColor: 'white', padding: 10, overflowY: 'auto', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: '0.72rem', color: '#aaa', marginBottom: 6, borderBottom: '1px dashed #ddd', paddingBottom: 4 }}>
                        👁 即時預覽
                      </div>
                      <div className="md-content" style={{ fontSize: '0.9rem' }}>
                        {renderMarkdown(currentDoc.content || '', (src, alt) => setPreviewLightbox({ src, alt }))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.72rem', color: '#666', padding: '3px 4px', backgroundColor: '#d4d0c8', borderTop: '1px solid #808080' }}>
                  <strong>提示：</strong>
                  {' '}[連結文字](url)　![圖片說明](url)　[audio:標題](url)　[video:標題](url)　# 標題　**粗體**　--- 分隔線　- [ ] 打勾項目
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="win95-button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? '儲存中...' : '💾 儲存到 GitHub'}
                </button>
                <button className="win95-button" style={{ color: 'red' }} onClick={() => deleteDoc(selectedFolderIdx, selectedDocIdx)}>
                  🗑 刪除此文件
                </button>
                {statusMsg && <span style={{ fontWeight: 'bold', color: statusMsg.startsWith('✅') ? 'green' : 'red' }}>{statusMsg}</span>}
              </div>
            </>
          ) : (
            <p>&gt; 請從左側選擇一份文件進行編輯。</p>
          )}
        </div>

        <AdminStatusBar
          onLogout={onLogout}
          onDiscussion={() => setActiveTab('discussion')}
          onMembers={() => setActiveTab('members')}
          onMap={() => setActiveTab('map')}
          onLeaderboard={() => setActiveTab('leaderboard')}
        />
      </div>

      {previewLightbox && (
        <Lightbox src={previewLightbox.src} alt={previewLightbox.alt} onClose={() => setPreviewLightbox(null)} />
      )}
    </main>
  );
}

export default AdminPage;
