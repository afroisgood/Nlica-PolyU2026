// src/components/AdminPage.jsx
// 後台管理頁面（網址：/admin）
// 使用 GitHub Personal Access Token 直接更新 public/content.json

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, remove, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { fetchUsers } from '../data/fetchUsers';
import { renderMarkdown } from '../lib/markdown.jsx';
import Lightbox from './Lightbox.jsx';

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

        {/* 語法提示 */}
        {previewSyntax && (
          <div style={{ padding: '4px 8px', backgroundColor: '#fff', border: '1px inset #808080', fontSize: '0.78rem', fontFamily: 'monospace', color: '#555', wordBreak: 'break-all' }}>
            {previewSyntax}
          </div>
        )}

        {/* 圖片縮圖預覽 */}
        {isImage && activeUrl.trim() && (
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 3 }}>縮圖預覽：</div>
            <img
              src={activeUrl.trim()}
              alt="preview"
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

// ── 地圖管理分頁 ──────────────────────────────────────────────────
const PALETTE_ADMIN = ['#cc0000','#0044cc','#007700','#cc6600','#7700bb','#00888a','#884400','#555555'];
const EMPTY_LOC = { name: '', lat: '', lng: '', categoryId: '', description: '' };
const EMPTY_CAT = { label: '', order: 1, color: '#cc0000' };

function MapTab({ onBack }) {
  const [categories, setCategories] = useState([]);
  const [locations,  setLocations]  = useState([]);
  const [locForm,  setLocForm]  = useState(null);
  const [catForm,  setCatForm]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  // 讀取分類
  useEffect(() => {
    const catRef = ref(db, 'mapCategories');
    return onValue(catRef, (snap) => {
      const data = snap.val();
      if (!data) { setCategories([]); return; }
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(list);
    });
  }, []);

  // 讀取地點
  useEffect(() => {
    const locRef = ref(db, 'mapLocations');
    return onValue(locRef, (snap) => {
      const data = snap.val();
      if (!data) { setLocations([]); return; }
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setLocations(list);
    });
  }, []);

  // 儲存分類
  const handleSaveCat = async () => {
    if (!catForm.label.trim()) { setMsg('❌ 請填入分類名稱。'); return; }
    setSaving(true); setMsg('');
    try {
      const payload = { label: catForm.label.trim(), order: parseInt(catForm.order, 10) || 1, color: catForm.color || '#cc0000' };
      if (catForm.id) {
        await set(ref(db, `mapCategories/${catForm.id}`), payload);
      } else {
        await push(ref(db, 'mapCategories'), payload);
      }
      setMsg('✅ 分類已儲存');
      setCatForm(null);
    } catch (e) { setMsg(`❌ ${e.message}`); }
    setSaving(false);
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('確定刪除此分類？（地點不會被刪除，但會失去分類標籤）')) return;
    await remove(ref(db, `mapCategories/${id}`));
  };

  // 儲存地點
  const handleSaveLoc = async () => {
    if (!locForm.name.trim() || !locForm.lat || !locForm.lng) {
      setMsg('❌ 請填入名稱、緯度、經度。'); return;
    }
    setSaving(true); setMsg('');
    try {
      const payload = {
        name: locForm.name.trim(),
        lat: parseFloat(locForm.lat),
        lng: parseFloat(locForm.lng),
        categoryId: locForm.categoryId || '',
        description: locForm.description.trim(),
      };
      if (locForm.id) {
        await set(ref(db, `mapLocations/${locForm.id}`), payload);
      } else {
        await push(ref(db, 'mapLocations'), payload);
      }
      setMsg('✅ 地點已儲存');
      setLocForm(null);
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

          {/* ── 分類管理 ── */}
          <div style={{ border: '2px solid #808080', backgroundColor: '#d4d0c8' }}>
            <div style={{ backgroundColor: '#000080', color: '#fff', padding: '4px 10px', fontWeight: 'bold', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>分類標籤管理</span>
              <button className="win95-button" style={{ fontSize: '0.78rem', padding: '1px 8px', color: '#000' }}
                onClick={() => { setCatForm({ ...EMPTY_CAT, order: categories.length + 1 }); setMsg(''); }}>
                ＋ 新增分類
              </button>
            </div>

            {/* 分類表單 */}
            {catForm && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #808080', display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px 8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem' }}>標籤名稱：</label>
                <input className="win95-input" value={catForm.label}
                  onChange={(e) => setCatForm({ ...catForm, label: e.target.value })}
                  placeholder="例：Day 1 — 5/18 相見歡" />
                <label style={{ fontSize: '0.85rem' }}>順序：</label>
                <input className="win95-input" type="number" min={1} style={{ width: 60 }}
                  value={catForm.order}
                  onChange={(e) => setCatForm({ ...catForm, order: e.target.value })} />
                <label style={{ fontSize: '0.85rem' }}>顏色：</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={catForm.color || '#cc0000'}
                    onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                    style={{ width: 40, height: 28, padding: 2, border: '2px inset #808080', cursor: 'pointer' }} />
                  <span style={{
                    padding: '2px 10px', borderRadius: 2, fontSize: '0.82rem', fontWeight: 'bold',
                    backgroundColor: catForm.color || '#cc0000', color: '#fff',
                  }}>{catForm.label || '預覽'}</span>
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="win95-button" onClick={handleSaveCat} disabled={saving}>{saving ? '...' : '💾 儲存'}</button>
                  <button className="win95-button" onClick={() => { setCatForm(null); setMsg(''); }}>取消</button>
                  {msg && <span style={{ color: msg.startsWith('✅') ? 'green' : 'red', fontSize: '0.82rem' }}>{msg}</span>}
                </div>
              </div>
            )}

            {/* 分類列表 */}
            <div style={{ padding: '6px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.length === 0 && <span style={{ fontSize: '0.82rem', color: '#666' }}>尚無分類，請先新增。</span>}
              {categories.map((cat) => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 2, fontSize: '0.82rem', fontWeight: 'bold',
                    backgroundColor: cat.color || '#999', color: '#fff',
                  }}>{cat.label}</span>
                  <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.72rem' }}
                    onClick={() => { setCatForm({ ...cat }); setMsg(''); }}>✏️</button>
                  <button className="win95-button" style={{ padding: '1px 6px', fontSize: '0.72rem', color: 'red' }}
                    onClick={() => handleDeleteCat(cat.id)}>🗑</button>
                </div>
              ))}
            </div>
          </div>

          {/* ── 地點管理 ── */}
          <div style={{ border: '2px solid #808080', backgroundColor: '#d4d0c8' }}>
            <div style={{ backgroundColor: '#000080', color: '#fff', padding: '4px 10px', fontWeight: 'bold', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>地點管理（共 {locations.length} 個）</span>
              <button className="win95-button" style={{ fontSize: '0.78rem', padding: '1px 8px', color: '#000' }}
                onClick={() => { setLocForm({ ...EMPTY_LOC }); setMsg(''); }}>
                ＋ 新增地點
              </button>
            </div>

            {/* 地點表單 */}
            {locForm && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #808080', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px 8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem' }}>名稱：</label>
                <input className="win95-input" value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="例：花蓮車站" />

                <label style={{ fontSize: '0.85rem' }}>分類：</label>
                <select className="win95-input" value={locForm.categoryId}
                  onChange={(e) => setLocForm({ ...locForm, categoryId: e.target.value })}
                  style={{ fontSize: '0.85rem' }}>
                  <option value="">（未分類）</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>

                <label style={{ fontSize: '0.85rem' }}>緯度：</label>
                <input className="win95-input" value={locForm.lat}
                  onChange={(e) => setLocForm({ ...locForm, lat: e.target.value })}
                  placeholder="在 Google Maps 右鍵點擊可取得" />

                <label style={{ fontSize: '0.85rem' }}>經度：</label>
                <input className="win95-input" value={locForm.lng}
                  onChange={(e) => setLocForm({ ...locForm, lng: e.target.value })} placeholder="例：121.6014" />

                <label style={{ fontSize: '0.85rem' }}>說明：</label>
                <input className="win95-input" value={locForm.description}
                  onChange={(e) => setLocForm({ ...locForm, description: e.target.value })} placeholder="（選填）" />

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

            {/* 地點列表 */}
            <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto', backgroundColor: 'white' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ backgroundColor: '#000080', color: 'white' }}>
                    <th style={thS}>分類</th>
                    <th style={thS}>名稱</th>
                    <th style={thS}>緯度</th>
                    <th style={thS}>經度</th>
                    <th style={thS}>說明</th>
                    <th style={thS}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.length === 0 && (
                    <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: '#888' }}>尚無地點資料</td></tr>
                  )}
                  {locations.map((loc, i) => {
                    const cat = categories.find((c) => c.id === loc.categoryId);
                    const color = cat?.color || '#999';
                    return (
                      <tr key={loc.id} style={{ backgroundColor: i % 2 === 0 ? '#f0f4ff' : 'white' }}>
                        <td style={tdS}>
                          {cat
                            ? <span style={{ backgroundColor: color, color: '#fff', padding: '1px 6px', borderRadius: 2, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{cat.label}</span>
                            : <span style={{ color: '#aaa', fontSize: '0.78rem' }}>未分類</span>
                          }
                        </td>
                        <td style={{ ...tdS, fontWeight: 'bold' }}>{loc.name}</td>
                        <td style={{ ...tdS, fontFamily: 'monospace' }}>{parseFloat(loc.lat).toFixed(5)}</td>
                        <td style={{ ...tdS, fontFamily: 'monospace' }}>{parseFloat(loc.lng).toFixed(5)}</td>
                        <td style={{ ...tdS, color: '#555', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.description || '—'}</td>
                        <td style={tdS}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="win95-button" style={{ padding: '1px 8px', fontSize: '0.78rem' }}
                              onClick={() => { setLocForm({ ...loc }); setMsg(''); }}>✏️</button>
                            <button className="win95-button" style={{ padding: '1px 8px', fontSize: '0.78rem', color: 'red' }}
                              onClick={() => handleDeleteLoc(loc.id)}>🗑</button>
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

        <StatusBarMini onLogout={null} onBack={onBack} onDiscussion={null} onMembers={null} onMap={null} />
      </div>
    </main>
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
  const [checkedMsgs, setCheckedMsgs] = useState(new Set());

  // 工具列狀態
  const [toolbarPanel, setToolbarPanel] = useState(null); // null | 'link' | 'image' | 'audio' | 'video'
  const [showPreview, setShowPreview]   = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState(null);
  const [dragItem, setDragItem]         = useState(null); // { fi, di }
  const [dragOver, setDragOver]         = useState(null); // { fi, di }
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

  const handleDeleteChecked = async () => {
    if (checkedMsgs.size === 0) return;
    if (!window.confirm(`確定刪除選取的 ${checkedMsgs.size} 則留言？`)) return;
    await Promise.all([...checkedMsgs].map((id) => remove(ref(db, `discussions/${selectedDay}/${id}`))));
    setCheckedMsgs(new Set());
  };

  const toggleCheck = (id) => {
    setCheckedMsgs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCheckAll = () => {
    if (checkedMsgs.size === discussionMsgs.length) {
      setCheckedMsgs(new Set());
    } else {
      setCheckedMsgs(new Set(discussionMsgs.map((m) => m.id)));
    }
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
          <StatusBarMini onLogout={() => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); }} onDiscussion={() => setActiveTab('discussion')} onMembers={() => setActiveTab('members')} onMap={() => setActiveTab('map')} onLeaderboard={() => setActiveTab('leaderboard')} />
        </div>
      </main>
    );
  }

  // ── 地圖管理 ────────────────────────────────────────────────────
  if (activeTab === 'map') {
    return <MapTab onBack={() => setActiveTab('content')} />;
  }

  // ── 排行榜管理 ──────────────────────────────────────────────────
  if (activeTab === 'leaderboard') {
    return <LeaderboardTab onBack={() => setActiveTab('content')} setActiveTab={setActiveTab} />;
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
            {/* 工具列 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="win95-button" onClick={() => setActiveTab('content')}>← 返回內容管理</button>
              <select
                className="win95-input"
                value={selectedDay}
                onChange={(e) => { setSelectedDay(e.target.value); setCheckedMsgs(new Set()); }}
                style={{ fontSize: '0.9rem', padding: '2px 6px' }}
              >
                {DISCUSSION_DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>{discussionMsgs.length} 則留言</span>
              {checkedMsgs.size > 0 && (
                <button
                  className="win95-button"
                  style={{ color: 'red', fontWeight: 'bold', marginLeft: 'auto' }}
                  onClick={handleDeleteChecked}
                >
                  🗑 刪除選取（{checkedMsgs.size}）
                </button>
              )}
            </div>

            {/* 全選列 */}
            {discussionMsgs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px', fontSize: '0.82rem', color: '#555' }}>
                <input
                  type="checkbox"
                  checked={checkedMsgs.size === discussionMsgs.length && discussionMsgs.length > 0}
                  onChange={toggleCheckAll}
                  style={{ cursor: 'pointer' }}
                />
                <span>全選 / 取消全選</span>
              </div>
            )}

            {/* 留言列表 */}
            <div style={{ border: '2px inset #808080', backgroundColor: 'white', padding: 8, minHeight: 300, maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {discussionMsgs.length === 0 && <p style={{ color: '#888', margin: 'auto' }}>此日尚無留言</p>}
              {discussionMsgs.map((msg) => {
                const checked = checkedMsgs.has(msg.id);
                return (
                  <div
                    key={msg.id}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', border: `1px solid ${checked ? '#0044cc' : '#ddd'}`, backgroundColor: checked ? '#e8eeff' : '#f9f9f9', cursor: 'pointer' }}
                    onClick={() => toggleCheck(msg.id)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCheck(msg.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginTop: 3, flexShrink: 0, cursor: 'pointer' }}
                    />
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
                      onClick={(e) => { e.stopPropagation(); handleDeleteMsg(msg.id); }}
                    >🗑</button>
                  </div>
                );
              })}
            </div>
          </div>
          <StatusBarMini onLogout={() => { setIsAuthed(false); sessionStorage.removeItem('admin_pat'); }} onDiscussion={() => setActiveTab('discussion')} onMembers={() => setActiveTab('members')} onMap={() => setActiveTab('map')} onLeaderboard={() => setActiveTab('leaderboard')} />
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
              {folder.docs.map((doc, di) => {
                const isSelected = selectedFolderIdx === fi && selectedDocIdx === di;
                const isDragging = dragItem?.fi === fi && dragItem?.di === di;
                const isOver     = dragOver?.fi === fi && dragOver?.di === di && !isDragging;
                return (
                  <div
                    key={doc.id}
                    className="win95-file-item"
                    draggable
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
                      // 維持選取狀態跟隨被移動的文件
                      if (isSelected) setSelectedDocIdx(di);
                      setDragItem(null); setDragOver(null);
                    }}
                  >
                    <span style={{ marginRight: 4, opacity: 0.4, fontSize: '0.7rem' }}>⠿</span>
                    {doc.title}
                  </div>
                );
              })}
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
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button
                      className="win95-button"
                      style={{ padding: '2px 8px', fontSize: '0.82rem', backgroundColor: showPreview ? '#000080' : undefined, color: showPreview ? '#fff' : undefined }}
                      onMouseDown={e => { e.preventDefault(); setShowPreview(v => !v); }}
                      title="切換即時預覽">
                      {showPreview ? '✏️ 編輯' : '👁 預覽'}
                    </button>
                  </div>
                </div>

                {/* 插入面板 */}
                {toolbarPanel && (
                  <InsertPanel type={toolbarPanel} pat={pat} onInsert={handleInsert} onClose={() => setToolbarPanel(null)} />
                )}

                {/* 編輯 + 預覽 分割區 */}
                <div style={{ flexGrow: 1, display: 'flex', gap: showPreview ? 8 : 0, minHeight: 280 }}>
                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    style={{
                      flex: showPreview ? '1 1 50%' : '1 1 100%',
                      boxSizing: 'border-box',
                      fontFamily: "'DotGothic16', 'Courier New', monospace",
                      fontSize: '0.95rem', padding: 10,
                      border: '2px inset #808080', resize: 'none',
                      lineHeight: 1.8,
                    }}
                    value={currentDoc.content || ''}
                    onChange={(e) => updateDocField(selectedFolderIdx, selectedDocIdx, 'content', e.target.value)}
                  />

                  {/* 即時預覽面板 */}
                  {showPreview && (
                    <div style={{
                      flex: '1 1 50%', border: '2px inset #808080', backgroundColor: 'white',
                      padding: 10, overflowY: 'auto', boxSizing: 'border-box',
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#aaa', marginBottom: 6, borderBottom: '1px dashed #ddd', paddingBottom: 4 }}>
                        👁 即時預覽
                      </div>
                      <div className="md-content" style={{ fontSize: '0.9rem' }}>
                        {renderMarkdown(currentDoc.content || '', (src, alt) => setPreviewLightbox({ src, alt }))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Markdown 語法提示 */}
                <div style={{ fontSize: '0.72rem', color: '#666', padding: '3px 4px', backgroundColor: '#d4d0c8', borderTop: '1px solid #808080' }}>
                  <strong>提示：</strong>
                  {' '}[連結文字](url)　![圖片說明](url)　[audio:標題](url)　[video:標題](url)　# 標題　**粗體**　--- 分隔線　- [ ] 打勾項目
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
          onMap={() => setActiveTab('map')}
        />
      </div>

      {/* 預覽區 Lightbox */}
      {previewLightbox && (
        <Lightbox src={previewLightbox.src} alt={previewLightbox.alt} onClose={() => setPreviewLightbox(null)} />
      )}
    </main>
  );
}

// ── 排行榜管理分頁 ────────────────────────────────────────────────
function LeaderboardTab({ onBack, setActiveTab }) {
  const [scores, setScores] = useState([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const r = ref(db, 'snakeScores');
    return onValue(r, (snap) => {
      const data = snap.val();
      if (!data) { setScores([]); return; }
      const list = Object.entries(data)
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.score - a.score);
      setScores(list);
    });
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
              <button
                className="win95-button"
                style={{ marginLeft: 'auto', color: 'red' }}
                disabled={deleting}
                onClick={handleDeleteAll}
              >
                🗑 清除全部
              </button>
            )}
          </div>

          <div style={{ border: '2px solid #808080', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
              <thead style={{ backgroundColor: '#d4d0c8' }}>
                <tr>
                  <th style={thS}>名次</th>
                  <th style={thS}>姓名</th>
                  <th style={thS}>組別</th>
                  <th style={thS}>最高分</th>
                  <th style={thS}>更新時間</th>
                  <th style={thS}></th>
                </tr>
              </thead>
              <tbody>
                {scores.length === 0 && (
                  <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: '#888' }}>尚無紀錄</td></tr>
                )}
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
                      <button
                        className="win95-button"
                        style={{ padding: '1px 6px', fontSize: '0.75rem', color: 'red' }}
                        disabled={deleting}
                        onClick={() => handleDelete(s.key, s.name)}
                      >🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <StatusBarMini
          onLogout={null}
          onDiscussion={() => setActiveTab('discussion')}
          onMembers={() => setActiveTab('members')}
          onMap={() => setActiveTab('map')}
          onLeaderboard={null}
        />
      </div>
    </main>
  );
}

function StatusBarMini({ onLogout, onDiscussion, onMembers, onMap, onLeaderboard }) {
  const linkStyle = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', color: '#000080', textDecoration: 'underline' };
  return (
    <div style={{ borderTop: '2px solid #808080', padding: '3px 8px', display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.8rem', backgroundColor: '#c0c0c0', flexWrap: 'wrap' }}>
      <span style={{ flexGrow: 1 }}>已連線 GitHub：{GITHUB_OWNER}/{GITHUB_REPO}</span>
      {onMembers && <button style={linkStyle} onClick={onMembers}>👥 成員名單</button>}
      {onDiscussion && <button style={linkStyle} onClick={onDiscussion}>💬 討論區管理</button>}
      {onMap && <button style={linkStyle} onClick={onMap}>🗺️ 地圖管理</button>}
      {onLeaderboard && <button style={linkStyle} onClick={onLeaderboard}>🏆 排行榜</button>}
      {onLogout && <button style={linkStyle} onClick={onLogout}>登出</button>}
    </div>
  );
}

export default AdminPage;
