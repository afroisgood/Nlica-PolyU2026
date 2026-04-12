// src/components/DiscussionBoard.jsx
import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { db } from '../lib/firebase';
import { groupThemeColors } from '../data/systemData';

const DISCUSSION_DAYS = [
  { key: '2026-05-18', label: '5/18 相見歡' },
  { key: '2026-05-19', label: '5/19 豐田探索' },
  { key: '2026-05-20', label: '5/20 服務學習 Day1' },
  { key: '2026-05-21', label: '5/21 服務學習 Day2' },
  { key: '2026-05-22', label: '5/22 光復鄉' },
  { key: '2026-05-24', label: '5/24 在地共創' },
];

const EMOJI_LIST = [
  '😊','😂','🥰','😎','🤔','😭','🥹','😅','🤣','😆',
  '👍','👎','❤️','🔥','✨','🎉','🙏','💪','👏','🫶',
  '🌸','🌿','🏔️','🌊','🦋','🐄','🌾','☀️','🌙','⭐',
  '📸','🎵','💡','🗺️','🧭','✅','⚠️','💬','🔔','🎯',
];

const IMG_URL_RE = /^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/** 渲染留言內容（支援圖片語法 + 純圖片 URL） */
function MsgContent({ text, onImgClick }) {
  if (!text) return null;
  return (
    <>
      {text.split('\n').map((line, i) => {
        const mdImg = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (mdImg) return (
          <img key={i} src={mdImg[2]} alt={mdImg[1]} className="disc-msg-img"
            onClick={() => onImgClick?.(mdImg[2], mdImg[1])}
            onError={e => { e.target.style.display='none'; }} />
        );
        if (IMG_URL_RE.test(line.trim())) return (
          <img key={i} src={line.trim()} alt="圖片" className="disc-msg-img"
            onClick={() => onImgClick?.(line.trim(), '')}
            onError={e => { e.target.style.display='none'; }} />
        );
        return line
          ? <span key={i} style={{ display:'block', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{line}</span>
          : <br key={i} />;
      })}
    </>
  );
}

/** 圖片放大 lightbox */
function MsgLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div style={{ position:'relative', background:'#c0c0c0', border:'2px solid #000080', maxWidth:'90vw' }}
        onClick={e => e.stopPropagation()}>
        <div className="win95-title-bar" style={{ cursor:'default' }}>
          <span>🖼️ {alt || '圖片'}</span>
          <div className="win95-title-buttons"><div className="win95-btn" onClick={onClose}>X</div></div>
        </div>
        <div style={{ padding:8, background:'#000' }}>
          <img src={src} alt={alt}
            style={{ maxWidth:'80vw', maxHeight:'75vh', display:'block', objectFit:'contain' }} />
        </div>
      </div>
    </div>
  );
}

function DiscussionBoard({ playerData, isGuest, onBack }) {
  const todayKey   = getTodayKey();
  const defaultDay = DISCUSSION_DAYS.find(d => d.key === todayKey)?.key || DISCUSSION_DAYS[0].key;
  const [selectedDay, setSelectedDay]     = useState(defaultDay);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState('');
  const [sending, setSending]             = useState(false);
  const [showEmoji, setShowEmoji]         = useState(false);
  const [showImgInput, setShowImgInput]   = useState(false);
  const [imgUrl, setImgUrl]               = useState('');
  const [lightbox, setLightbox]           = useState(null);
  const bottomRef = useRef(null);
  const textRef   = useRef(null);

  useEffect(() => {
    const msgRef = ref(db, `discussions/${selectedDay}`);
    const unsub = onValue(msgRef, snapshot => {
      const data = snapshot.val();
      if (!data) { setMessages([]); return; }
      setMessages(
        Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => (a.timestamp||0) - (b.timestamp||0))
      );
    });
    return () => unsub();
  }, [selectedDay]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await push(ref(db, `discussions/${selectedDay}`), {
      name: playerData.name, group: playerData.group,
      text: text.trim(), timestamp: serverTimestamp(),
    });
    setText(''); setSending(false); setShowEmoji(false); setShowImgInput(false);
  };

  /** 插入 emoji 到游標位置 */
  const insertEmoji = emoji => {
    const el = textRef.current;
    if (!el) { setText(t => t + emoji); setShowEmoji(false); return; }
    const s = el.selectionStart, e2 = el.selectionEnd;
    const newText = text.slice(0, s) + emoji + text.slice(e2);
    setText(newText);
    setShowEmoji(false);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + emoji.length, s + emoji.length); }, 0);
  };

  /** 插入圖片語法 */
  const insertImage = () => {
    if (!imgUrl.trim()) return;
    setText(t => t + (t && !t.endsWith('\n') ? '\n' : '') + `![圖片](${imgUrl.trim()})\n`);
    setImgUrl(''); setShowImgInput(false);
  };

  const selectedLabel = DISCUSSION_DAYS.find(d => d.key === selectedDay)?.label || selectedDay;

  return (
    <div style={{ display:'flex', flexDirection:'column', flexGrow:1, minHeight:0, overflow:'hidden' }}>

      {/* 頂部 toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <button className="win95-button" style={{ margin:0, flexShrink:0 }} onClick={onBack}>← 返回</button>
        <span style={{ fontWeight:'bold', fontSize:'1rem', flexShrink:0 }}>💬 討論區</span>
        <select className="win95-input"
          style={{ marginLeft:'auto', marginTop:0, fontSize:'0.9rem', padding:'2px 6px', cursor:'pointer', minWidth:0 }}
          value={selectedDay} onChange={e => setSelectedDay(e.target.value)}>
          {DISCUSSION_DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </div>

      {/* 留言列表 */}
      <div style={{ flexGrow:1, overflowY:'auto', border:'2px inset #808080', backgroundColor:'white',
        padding:'8px 10px', display:'flex', flexDirection:'column', gap:8, minHeight:0 }}>
        {messages.length === 0 && (
          <p style={{ color:'#888', fontSize:'0.9rem', margin:'auto', textAlign:'center' }}>
            &gt; 還沒有留言，成為第一個留言的人吧！
          </p>
        )}
        {messages.map(msg => {
          const color = groupThemeColors[msg.group] ?? '#000080';
          return (
            <div key={msg.id} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              <div style={{ width:6, flexShrink:0, alignSelf:'stretch', backgroundColor:color, borderRadius:2 }} />
              <div style={{ flexGrow:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom:2 }}>
                  <span style={{ fontWeight:'bold', fontSize:'0.9rem', color }}>{msg.name}</span>
                  <span style={{ fontSize:'0.75rem', color:'#666' }}>{msg.group?.split('｜')[1] || ''}</span>
                  <span style={{ fontSize:'0.75rem', color:'#aaa', marginLeft:'auto' }}>{formatTime(msg.timestamp)}</span>
                </div>
                <div style={{ fontSize:'0.95rem', lineHeight:1.6 }}>
                  <MsgContent text={msg.text} onImgClick={(src, alt) => setLightbox({ src, alt })} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 輸入區 */}
      <div style={{ marginTop:8 }}>
        {isGuest ? (
          <p style={{ margin:0, color:'#888', fontSize:'0.85rem', textAlign:'center' }}>
            &gt; 訪客模式無法留言，請使用憑證登入後參與討論。
          </p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>

            {/* 圖片 URL 輸入面板 */}
            {showImgInput && (
              <div style={{ display:'flex', gap:6, alignItems:'center', padding:'4px 6px',
                background:'#e8e8e8', border:'1px solid #808080' }}>
                <span style={{ fontSize:'0.8rem', flexShrink:0 }}>🖼️ 圖片網址：</span>
                <input className="win95-input" style={{ flex:1, fontSize:'0.85rem' }}
                  placeholder="https://..." value={imgUrl}
                  onChange={e => setImgUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && insertImage()} />
                <button className="win95-button" style={{ padding:'2px 8px', fontSize:'0.8rem' }}
                  onClick={insertImage} disabled={!imgUrl.trim()}>插入</button>
                <button className="win95-button" style={{ padding:'2px 6px', fontSize:'0.8rem' }}
                  onClick={() => setShowImgInput(false)}>✕</button>
              </div>
            )}

            {/* Emoji 選擇器 */}
            {showEmoji && (
              <div className="disc-emoji-picker">
                {EMOJI_LIST.map(e => (
                  <button key={e} className="disc-emoji-btn" onClick={() => insertEmoji(e)}>{e}</button>
                ))}
              </div>
            )}

            {/* 輸入列 */}
            <div style={{ display:'flex', gap:6 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:3, justifyContent:'flex-end' }}>
                <button className="win95-button"
                  style={{ padding:'3px 8px', fontSize:'1rem',
                    background: showEmoji ? '#000080' : undefined,
                    color: showEmoji ? '#fff' : undefined }}
                  title="插入 Emoji" onClick={() => { setShowEmoji(v => !v); setShowImgInput(false); }}>
                  😊
                </button>
                <button className="win95-button"
                  style={{ padding:'3px 8px', fontSize:'0.9rem',
                    background: showImgInput ? '#000080' : undefined,
                    color: showImgInput ? '#fff' : undefined }}
                  title="插入圖片" onClick={() => { setShowImgInput(v => !v); setShowEmoji(false); }}>
                  🖼️
                </button>
              </div>

              <textarea ref={textRef} className="win95-input"
                style={{ flexGrow:1, resize:'none', fontFamily:'inherit',
                  fontSize:'0.95rem', padding:'6px 8px', lineHeight:1.5, height:60 }}
                placeholder={`在「${selectedLabel}」留言… (Ctrl+Enter 送出)`}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
              />
              <button className="win95-button"
                style={{ alignSelf:'flex-end', padding:'6px 14px' }}
                onClick={handleSend} disabled={sending || !text.trim()}>
                {sending ? '...' : '送出'}
              </button>
            </div>
          </div>
        )}
      </div>

      {lightbox && <MsgLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
}

export default DiscussionBoard;
