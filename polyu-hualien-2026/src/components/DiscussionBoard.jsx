// src/components/DiscussionBoard.jsx
import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { db } from '../lib/firebase';
import { groupThemeColors } from '../data/systemData';

// 活動討論日（key 對應 Firebase 路徑，label 顯示用）
const DISCUSSION_DAYS = [
  { key: '2026-05-18', label: '5/18 相見歡' },
  { key: '2026-05-19', label: '5/19 豐田探索' },
  { key: '2026-05-20', label: '5/20 服務學習 Day1' },
  { key: '2026-05-21', label: '5/21 服務學習 Day2' },
  { key: '2026-05-22', label: '5/22 光復鄉' },
  { key: '2026-05-24', label: '5/24 在地共創' },
];

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function DiscussionBoard({ playerData, isGuest, onBack }) {
  const todayKey = getTodayKey();
  const defaultDay = DISCUSSION_DAYS.find((d) => d.key === todayKey)?.key || DISCUSSION_DAYS[0].key;
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const msgRef = ref(db, `discussions/${selectedDay}`);
    const unsub = onValue(msgRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setMessages([]); return; }
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(list);
    });
    return () => unsub();
  }, [selectedDay]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await push(ref(db, `discussions/${selectedDay}`), {
      name: playerData.name,
      group: playerData.group,
      text: text.trim(),
      timestamp: serverTimestamp(),
    });
    setText('');
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedLabel = DISCUSSION_DAYS.find((d) => d.key === selectedDay)?.label || selectedDay;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 頂部 toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button className="win95-button" onClick={onBack}>← 返回</button>
        <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>💬 討論區</span>
        <select
          className="win95-input"
          style={{ marginLeft: 'auto', fontSize: '0.9rem', padding: '2px 6px', cursor: 'pointer' }}
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          {DISCUSSION_DAYS.map((d) => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* 留言列表 */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        border: '2px inset #808080',
        backgroundColor: 'white',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 0,
      }}>
        {messages.length === 0 && (
          <p style={{ color: '#888', fontSize: '0.9rem', margin: 'auto', textAlign: 'center' }}>
            &gt; 還沒有留言，成為第一個留言的人吧！
          </p>
        )}
        {messages.map((msg) => {
          const color = groupThemeColors[msg.group] ?? '#000080';
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 6,
                flexShrink: 0,
                alignSelf: 'stretch',
                backgroundColor: color,
                borderRadius: 2,
              }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color }}>{msg.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>{msg.group?.split('｜')[1] || ''}</span>
                  <span style={{ fontSize: '0.75rem', color: '#aaa', marginLeft: 'auto' }}>{formatTime(msg.timestamp)}</span>
                </div>
                <div style={{ fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 輸入區 */}
      <div style={{ marginTop: 8 }}>
        {isGuest ? (
          <p style={{ margin: 0, color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
            &gt; 訪客模式無法留言，請使用憑證登入後參與討論。
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              className="win95-input"
              style={{
                flexGrow: 1,
                resize: 'none',
                fontFamily: "inherit",
                fontSize: '0.95rem',
                padding: '6px 8px',
                lineHeight: 1.5,
                height: 60,
              }}
              placeholder={`在「${selectedLabel}」留言（Enter 送出，Shift+Enter 換行）`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="win95-button"
              style={{ alignSelf: 'flex-end', padding: '6px 14px' }}
              onClick={handleSend}
              disabled={sending || !text.trim()}
            >
              {sending ? '...' : '送出'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscussionBoard;
