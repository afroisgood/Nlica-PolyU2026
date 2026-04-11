// src/components/AdminPage.jsx
// 後台管理頁面（網址：/admin）
// 使用 GitHub Personal Access Token 直接更新 public/content.json

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import { fetchUsers } from '../data/fetchUsers';

const GITHUB_OWNER = 'afroisgood';
const GITHUB_REPO = 'Nlica-PolyU2026';
const CONTENT_PATH = 'polyu-hualien-2026/public/content.json';
const MEDIA_DIR = 'polyu-hualien-2026/public/media';
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/polyu-hualien-2026/public/media`;

const DISCUSSION_DAYS = [
  { key: '2026-05-18', label: '5/18 相見歡' },
  { key: '2026-05-19', label: '5/19 豐田探索' },
  { key: '2026-05-20', label: '5/20 服務學習 Day1' },
  { key: '2026-05-21', label: '5/21 服務學習 Day2' },
  { key: '2026-05-22', label: '5/22 光復鄉' },
  { key: '2026-05-24', label: '5/24 在地共創' },
];

// ── GitHub 媒體上傳 ────────────────────────────────────────────────
async function uploadMediaToGitHub(pat, filename, base64Content) {
  const path = `${MEDIA_DIR}/${filename}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const headers = { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };

  // 確認是否已存在（取得 SHA）
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
      // ArrayBuffer → base64 (避免 btoa 的 unicode 問題)
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

// ── YouTube ID 提取（與 markdown.jsx 共用邏輯） ───────────────────
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
  const isMedia = isAudio || isVideo; // 支援 YouTube 的類型

  // 來源模式：'url'（直接貼網址）| 'youtube'（YouTube 連結）| 'upload'（上傳檔案）
  const [sourceMode, setSourceMode] = useState(isMedia ? 'youtube' : 'url');

  const [url, setUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef(null);

  const icon  = isImage ? '🖼️' : isAudio ? '🎵' : isVideo ? '🎬' : '🔗';
  const label = isImage ? '圖片' : isAudio ? '音樂' : isVideo ? '影片' : '連結';
  const accept = isImage ? 'image/*' : isAudio ? 'audio/*' : isVideo ? 'video/*' : '';

  // 目前實際使用的 URL（依模式決定）
  const activeUrl = sourceMode === 'youtube' ? ytUrl : url;
  const ytId = sourceMode === 'youtube' ? extractYouTubeId(ytUrl) : null;
  const ytValid = sourceMode === 'youtube' && !!ytId;

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadMsg('上傳中...');
    try {
      const base64 = await fileToBase64(file);
      const rawUrl = await uploadMediaToGitHub(pat, file.name, base64);
      setUrl(rawUrl);
      setUploadMsg('✅ 上傳成功');
    } catch (e) {
      setUploadMsg(`❌ ${e.message}`);
    }
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

  // 預覽語法
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
      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px 4px', fontWeight: 'bold', borderBottom: '1px solid #808080' }}>
        <span>{icon} 插入{label}</span>
        <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.75rem' }} onClick={onClose}>✕</button>
      </div>

      {/* 來源切換 Tab（媒體才顯示） */}
      {isMedia && (
        <div style={{ display: 'flex', paddingLeft: 10, paddingTop: 6, gap: 2 }}>
          <button style={tabStyle('youtube')} onClick={() => setSourceMode('youtube')}>▶ YouTube</button>
          <button style={tabStyle('url')}     onClick={() => setSourceMode('url')}>🔗 直接網址</button>
          <button style={tabStyle('upload')}  onClick={() => setSourceMode('upload')}>⬆️ 上傳檔案</button>
        </div>
      )}

      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* 說明文字 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <label style={{ minWidth: 64 }}>{isLink ? '顯示文字' : '說明文字'}：</label>
          <input
            className="win95-input" style={{ flex: 1 }}
            placeholder={isLink ? '點此前往...' : isImage ? '圖片說明' : isAudio ? '音樂標題' : '影片標題'}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
          />
        </div>

        {/* YouTube 模式 */}
        {sourceMode === 'youtube' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label style={{ minWidth: 64 }}>YouTube：</label>
              <input
                className="win95-input" style={{ flex: 1 }}
                placeholder="https://www.youtube.com/watch?v=... 或 https://youtu.be/..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
              />
            </div>
            {ytUrl && (
              ytId
                ? <span style={{ fontSize: '0.78rem', color: 'green', paddingLeft: 70 }}>✅ 已辨識 YouTube ID：{ytId}</span>
                : <span style={{ fontSize: '0.78rem', color: 'red', paddingLeft: 70 }}>⚠️ 無法辨識 YouTube 連結，請確認格式</span>
            )}
          </div>
        )}

        {/* 直接網址模式 */}
        {sourceMode === 'url' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ minWidth: 64 }}>網址：</label>
            <input
              className="win95-input" style={{ flex: 1 }}
              placeholder={isLink ? 'https://maps.app.goo.gl/...' : `https://... (.${isImage ? 'jpg/png' : isAudio ? 'mp3' : 'mp4'})`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        )}

        {/* 上傳模式 */}
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

        {/* 連結模式（isLink）只有直接網址 */}
        {isLink && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ minWidth: 64 }}>網址：</label>
            <input
              className="win95-input" style={{ flex: 1 }}
              placeholder="https://maps.app.goo.gl/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        )}

        {/* 圖片只有直接網址 + 上傳 */}
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

        {/* 確認按鈕 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button className="win95-button" onClick={handleConfirm} disabled={!canConfirm}>✅ 插入文件</button>
          <button className="win95-button" onClick={onClose}>取消</button>
        </div>

        {/* 預覽語法 */}
        {previewSyntax && (
          <div style={{ padding: '4px 8px', backgroundColor: '#fff', border: '1px inset #808080', fontSize: '0.78rem', fontFamily: 'monospace', color: '#555', wordBreak: 'break-all' }}>
            {previewSyntax}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────────
function AdminPage() {
  const [pat, setPat] = useState(sessionStorage.getItem('admin_pat') || '');
  const [isAuthed, setIsAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [membersData, setMembersData] = useState(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [folders, setFolders] = useState([]);
  const [fileSha, setFileSha] = useState('');
  const [selectedFolderIdx, setSelectedFolderIdx] = useState(0);
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DISCUSSION_DAYS[0].key);
  const [discussionMsgs, setDiscussionMsgs] = useState([]);

  // 工具列狀態
  const [toolbarPanel, setToolbarPanel] = useState(null); // null | 'link' | 'image' | 'audio' | 'video'
  const textareaRef = useRef(null);
  const savedSel = useRef({ start: 0, end: 0, text: '' });

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

  useEffect(() => {
    if (activeTab === 'members' && !membersData && !isLoadingMembers) {
      loadMembers();
    }
  }, [activeTab]);

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
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
      const headers = { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };

      // 1. 重新抓最新 SHA（避免過期 SHA 造成 409 衝突）
      const checkRes = await fetch(apiUrl, { headers });
      if (!checkRes.ok) throw new Error('無法取得檔案資訊，請確認 PAT 仍有效。');
      const checkData = await checkRes.json();
      const latestSha = checkData.sha;

      // 2. 用 TextEncoder 做可靠的 UTF-8 → base64 轉換
      const newContent = JSON.stringify({ folders }, null, 2);
      const bytes = new TextEncoder().encode(newContent);
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      const encoded = btoa(binary);

      // 3. 推送更新
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ message: 'Update content via admin panel', content: encoded, sha: latestSha }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setFileSha(data.content.sha);
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

  // ── 工具列邏輯 ──────────────────────────────────────────────────
  /** 在 mousedown 時儲存選取範圍（不 blur textarea） */
  const captureSelection = (e, panelType) => {
    e.preventDefault(); // 不 blur textarea
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

  /** 插入 Markdown 語法到游標位置 */
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

  const currentFolder = folders[selectedFolderIdx];
  const currentDoc = currentFolder?.docs[selectedDocIdx];

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

  const thStyle = { padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #444', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '5px 10px', borderBottom: '1px solid #ddd', fontSize: '0.83rem' };

  // ── 成員名單 ────────────────────────────────────────────────────
  if (activeTab === 'members') {
    const membersList = membersData
      ? Object.entries(membersData)
          .map(([code, d]) => ({ code, ...d }))
          .sort((a, b) => a.group.localeCompare(b.group, 'zh'))
      : [];
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#008080', padding: '12px', fontFamily: "'DotGothic16', 'Courier New', monospace" }}>
        <div className="win95-window" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
          <div className="win95-title-bar">
            <span>成員名單預覽（唯讀）</span>
            <div className="win95-title-buttons">
              <div className="win95-btn">_</div><div className="win95-btn">□</div><div className="win95-btn">X</div>
            </div>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="win95-button" onClick={() => setActiveTab('content')}>← 返回內容管理</button>
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
                        <td style={tdStyle}>{name}</td><td style={tdStyle}>{group}</td>
                        <td style={tdStyle}>{factionTitle}</td><td style={tdStyle}>{mentor}</td>
                        <td style={tdStyle}>{location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <StatusBarMini onLogout={() => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); }} onDiscussion={() => setActiveTab('discussion')} onMembers={() => setActiveTab('members')} />
        </div>
      </main>
    );
  }

  // ── 討論區管理 ──────────────────────────────────────────────────
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
                  <button className="win95-button" style={{ color: 'red', flexShrink: 0, fontSize: '0.8rem', padding: '2px 8px' }} onClick={() => handleDeleteMsg(msg.id)}>🗑</button>
                </div>
              ))}
            </div>
          </div>
          <StatusBarMini onLogout={() => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); }} onDiscussion={() => setActiveTab('discussion')} onMembers={() => setActiveTab('members')} />
        </div>
      </main>
    );
  }

  // ── 內容管理（主頁）────────────────────────────────────────────
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
                    fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer',
                    backgroundColor: selectedFolderIdx === fi && selectedDocIdx === di ? '#000080' : 'transparent',
                    color: selectedFolderIdx === fi && selectedDocIdx === di ? 'white' : 'black',
                  }}
                  onClick={() => { setSelectedFolderIdx(fi); setSelectedDocIdx(di); setStatusMsg(''); setToolbarPanel(null); }}
                >
                  {doc.title}
                </div>
              ))}
              <div
                style={{ fontSize: '0.8rem', padding: '3px 8px', color: '#555', cursor: 'pointer' }}
                onClick={() => { addDoc(fi); setSelectedFolderIdx(fi); setSelectedDocIdx(folders[fi].docs.length); setToolbarPanel(null); }}
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
              {/* 標題欄 */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>檔案標題</label>
                <input
                  className="win95-input"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                  value={currentDoc.title}
                  onChange={(e) => updateDocField(selectedFolderIdx, selectedDocIdx, 'title', e.target.value)}
                />
              </div>

              {/* 編輯區（工具列 + textarea） */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>內容</label>

                {/* 工具列 */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '4px 6px', backgroundColor: '#d4d0c8', border: '1px solid #808080', borderBottom: 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555', marginRight: 4 }}>插入：</span>
                  <ToolbarBtn label="🔗 連結" title="插入超連結（選取文字後點擊）" onMouseDown={(e) => captureSelection(e, 'link')} />
                  <ToolbarBtn label="🖼️ 圖片" title="插入圖片（支援上傳或 URL）" onMouseDown={(e) => captureSelection(e, 'image')} />
                  <ToolbarBtn label="🎵 音樂" title="插入音樂播放器" onMouseDown={(e) => captureSelection(e, 'audio')} />
                  <ToolbarBtn label="🎬 影片" title="插入影片播放器" onMouseDown={(e) => captureSelection(e, 'video')} />
                  <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#777' }}>
                    支援 Markdown：<code style={{ fontSize: '0.72rem', backgroundColor: '#fff', padding: '0 3px' }}># 標題</code>
                    {' '}<code style={{ fontSize: '0.72rem', backgroundColor: '#fff', padding: '0 3px' }}>**粗體**</code>
                  </span>
                </div>

                {/* 插入面板 */}
                {toolbarPanel && (
                  <InsertPanel
                    type={toolbarPanel}
                    pat={pat}
                    onInsert={handleInsert}
                    onClose={() => setToolbarPanel(null)}
                  />
                )}

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  style={{
                    flexGrow: 1, width: '100%', boxSizing: 'border-box',
                    fontFamily: "'DotGothic16', 'Courier New', monospace",
                    fontSize: '0.95rem', padding: 10,
                    border: '2px inset #808080', resize: 'none',
                    lineHeight: 1.8, minHeight: 280,
                  }}
                  value={currentDoc.content || ''}
                  onChange={(e) => updateDocField(selectedFolderIdx, selectedDocIdx, 'content', e.target.value)}
                />

                {/* Markdown 語法提示 */}
                <div style={{ fontSize: '0.72rem', color: '#666', padding: '3px 4px', backgroundColor: '#d4d0c8', borderTop: '1px solid #808080' }}>
                  <strong>提示：</strong>
                  {' '}[連結文字](url)　![圖片說明](url)　[audio:標題](url)　[video:標題](url)　# 大標　## 次標　**粗體**　--- 分隔線
                </div>
              </div>

              {/* 操作按鈕列 */}
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

        <StatusBarMini
          onLogout={() => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); }}
          onDiscussion={() => setActiveTab('discussion')}
          onMembers={() => setActiveTab('members')}
        />
      </div>
    </main>
  );
}

function StatusBarMini({ onLogout, onDiscussion, onMembers }) {
  const linkStyle = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', color: '#000080', textDecoration: 'underline' };
  return (
    <div style={{ borderTop: '2px solid #808080', padding: '3px 8px', display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.8rem', backgroundColor: '#c0c0c0' }}>
      <span style={{ flexGrow: 1 }}>已連線 GitHub：{GITHUB_OWNER}/{GITHUB_REPO}</span>
      {onMembers && <button style={linkStyle} onClick={onMembers}>👥 成員名單</button>}
      {onDiscussion && <button style={linkStyle} onClick={onDiscussion}>💬 討論區管理</button>}
      <button style={linkStyle} onClick={onLogout}>登出</button>
    </div>
  );
}

export default AdminPage;
