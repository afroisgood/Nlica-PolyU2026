// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { fetchUsers } from './data/fetchUsers';
import { welcomeMessages, groupThemeColors } from './data/systemData';
import LoginScreen from './components/LoginScreen';
import Desktop from './components/Desktop';
import FolderView from './components/FolderView';
import DocumentView from './components/DocumentView';
import BootScreen from './components/BootScreen';
import StatusBar from './components/StatusBar';
import AdminPage from './components/AdminPage';
import DiscussionBoard from './components/DiscussionBoard';
import MapWindow from './components/MapWindow';
import NotificationBalloon from './components/NotificationBalloon';
import ContextMenu from './components/ContextMenu';
import { playBoot, playClick, playError, playNotification, toggleSound, isSoundEnabled } from './lib/sounds';
import './App.css';

// 偵測觸控裝置
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);

// 固定的各組任務資料夾（內容依登入者動態產生，不放 content.json）
const GROUP_TASK_FOLDER = {
  key: 'group_tasks',
  title: '各組學習服務安排',
  icon: 'icon-target',
  docs: [
    { id: 'doc11', title: '⚔️ [機密] 我的專屬陣營任務.txt', content: null },
    { id: 'doc12', title: '🎒 行前裝備檢查表.txt', content: null },
  ],
};

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [usersDatabase, setUsersDatabase] = useState(null);
  const [contentFolders, setContentFolders] = useState([]);
  const [fetchError, setFetchError] = useState('');
  const [step, setStep] = useState(0);
  const [isGuest, setIsGuest] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [greeting, setGreeting] = useState('');
  const [currentFolderKey, setCurrentFolderKey] = useState(null);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAbout, setShowAbout] = useState(false);
  const [menuPos, setMenuPos] = useState(null); // { x, y }
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const notifIdRef = useRef(0);
  const longPressTimer = useRef(null);
  const longPressPos = useRef({ x: 0, y: 0 });

  const addNotification = (notif) => {
    const id = ++notifIdRef.current;
    setNotifications((prev) => [...prev, { id, ...notif }]);
    playNotification();
  };
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // 若網址是 /admin，直接顯示後台
  const isAdmin = window.location.pathname === '/admin';

  // 訪客模式：不顯示「各組學習服務安排」
  const visibleFolders = isGuest ? contentFolders : [
    ...contentFolders,
    {
      ...GROUP_TASK_FOLDER,
      docs: GROUP_TASK_FOLDER.docs.map((doc) => {
        if (doc.id === 'doc11' && playerData) {
          return {
            ...doc,
            content: `[ 陣營身分 ] ${playerData.group}\n[ 服務地點 ] ${playerData.location}\n[ 帶領導師 ] ${playerData.mentor}\n[ 組別人數 ] ${playerData.groupSize}\n\n[ 主線任務指派 ]\n${playerData.mainQuest}\n\n[ 行前裝備提示 ]\n${playerData.gear}`,
          };
        }
        if (doc.id === 'doc12' && playerData) {
          return { ...doc, content: playerData.gear };
        }
        return doc;
      }),
    },
  ];

  const currentFolder = currentFolderKey
    ? visibleFolders.find((f) => f.key === currentFolderKey)
    : null;

  const statusPath = (() => {
    if (step < 1) return 'C:\\';
    if (showDiscussion) return 'C:\\討論區\\';
    if (!currentFolder) return 'C:\\';
    if (!currentDoc) return `C:\\${currentFolder.title}\\`;
    return `C:\\${currentFolder.title}\\${currentDoc.title}`;
  })();

  const handleLogout = () => {
    setStep(0);
    setPlayerData(null);
    setAccessCode('');
    setIsGuest(false);
    setGreeting('');
    setCurrentFolderKey(null);
    setCurrentDoc(null);
    setShowDiscussion(false);
  };

  const handleGuestEnter = () => {
    playClick();
    const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    setGreeting(randomMsg);
    setIsGuest(true);
    setStep(1);
    const hint = isTouchDevice() ? '長按畫面可查看更多功能 →' : '右鍵點擊任意處可查看更多功能 →';
    setTimeout(() => addNotification({ title: '歡迎使用', message: hint, icon: '💡' }), 1200);
  };

  const handleVerifyCode = () => {
    if (!accessCode) { setErrorMsg('錯誤：請輸入憑證代碼。'); return; }
    const data = usersDatabase[accessCode];
    if (data) {
      playClick();
      const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      setGreeting(randomMsg);
      setPlayerData(data);
      setErrorMsg('');
      setStep(1);
      const hint = isTouchDevice() ? '長按畫面可查看更多功能 →' : '右鍵點擊任意處可查看更多功能 →';
      setTimeout(() => addNotification({ title: '系統通知', message: `${data.name}，你的陣營任務已解鎖！`, icon: '🎯' }), 1200);
      setTimeout(() => addNotification({ title: '提示', message: hint, icon: '💡' }), 2400);
    } else {
      playError();
      setErrorMsg('錯誤：查無此憑證代碼，請重新輸入。');
    }
  };

  const handleRefresh = async () => {
    try {
      const [users, folders] = await Promise.all([
        fetchUsers(),
        fetch('/content.json').then((r) => r.json()).then((d) => d.folders),
      ]);
      setUsersDatabase(users);
      setContentFolders(folders);
      addNotification({ title: '系統', message: '資料已重新整理完成。', icon: '🔄' });
    } catch {
      addNotification({ title: '錯誤', message: '重新整理失敗，請稍後再試。', icon: '⚠️' });
    }
  };

  useEffect(() => {
    if (isBooting) return;
    Promise.all([
      fetchUsers(),
      fetch('/content.json').then((r) => r.json()).then((d) => d.folders),
    ])
      .then(([users, folders]) => {
        setUsersDatabase(users);
        setContentFolders(folders);
      })
      .catch((err) => setFetchError(err.message));
  }, [isBooting]);

  // ── 右鍵 / 長按選單 ────────────────────────────────────────────
  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  const contextMenuItems = [
    { icon: soundOn ? '🔊' : '🔇', label: `音效：${soundOn ? '開' : '關'}`, action: handleToggleSound },
    { separator: true },
    { icon: 'ℹ️', label: '關於此系統', action: () => setShowAbout(true) },
  ];

  // 桌面：右鍵
  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  // 行動：長按 500ms
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    longPressPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      navigator.vibrate?.(40);
      setMenuPos({ ...longPressPos.current });
    }, 500);
  };
  const handleTouchMove = () => clearTimeout(longPressTimer.current);
  const handleTouchEnd  = () => clearTimeout(longPressTimer.current);

  if (isAdmin) return <AdminPage />;

  if (isBooting) return <BootScreen onComplete={() => { setIsBooting(false); playBoot(); }} />;

  if (!usersDatabase && !fetchError) {
    return (
      <main className="win95-container">
        <div className="win95-window">
          <div className="win95-title-bar"><span>PolyU_Hualien_Tour.exe</span></div>
          <div className="win95-content"><p>&gt; 正在載入資料...</p></div>
        </div>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="win95-container">
        <div className="win95-window">
          <div className="win95-title-bar"><span>PolyU_Hualien_Tour.exe</span></div>
          <div className="win95-content">
            <p style={{ color: 'red' }}>&gt; 錯誤：{fetchError}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="win95-container">
      <div
        className="win95-window"
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setMenuPos(null)}
      >

        <div
          className="win95-title-bar"
          style={playerData ? { backgroundColor: groupThemeColors[playerData.group] ?? '#000080' } : {}}
        >
          <span>PolyU_Hualien_Tour.exe{playerData ? ` — ${playerData.factionTitle}` : ''}</span>
          <div className="win95-title-buttons">
            <div className="win95-btn">_</div>
            <div className="win95-btn">□</div>
            <div className="win95-btn">X</div>
          </div>
        </div>

        <div className="win95-content">
          {step === 0 && (
            <LoginScreen
              accessCode={accessCode}
              onAccessCodeChange={setAccessCode}
              onVerify={handleVerifyCode}
              onGuestEnter={handleGuestEnter}
              errorMsg={errorMsg}
            />
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid var(--win95-mid)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                <div style={{ width: '64px', height: '64px', minWidth: '64px', backgroundColor: 'white', border: '2px inset var(--win95-mid)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {playerData?.avatarUrl
                    ? <img src={playerData.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
                    : <div className="pixel-icon icon-robot-head" style={{ top: '6px' }}></div>
                  }
                </div>
                <div style={{ minWidth: 0, flexGrow: 1 }}>
                  <h2 style={{ marginTop: 0, marginBottom: '6px', fontSize: 'clamp(1.1rem, 4vw, 1.6rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isGuest ? '嗨，訪客！' : `嗨，${playerData?.name || accessCode}！`}
                  </h2>
                  <p style={{ margin: 0, color: 'var(--win95-title)', fontWeight: 'bold', fontSize: 'clamp(0.85rem, 3vw, 1.1rem)' }}>&gt; {greeting}</p>
                </div>
                <button
                  className="win95-button"
                  onClick={handleLogout}
                  style={{ alignSelf: 'flex-start', flexShrink: 0 }}
                >
                  登出
                </button>
              </div>

              {!showDiscussion && currentFolder === null && (
                <Desktop
                  folders={visibleFolders}
                  onOpenFolder={setCurrentFolderKey}
                  onOpenDiscussion={() => setShowDiscussion(true)}
                  onOpenMap={() => setShowMap(true)}
                  onLogout={handleLogout}
                  onAbout={() => setShowAbout(true)}
                />
              )}
              {!showDiscussion && currentFolder !== null && currentDoc === null && (
                <FolderView folder={currentFolder} onOpenDoc={setCurrentDoc} onBack={() => setCurrentFolderKey(null)} />
              )}
              {!showDiscussion && currentFolder !== null && currentDoc !== null && (
                <DocumentView doc={currentDoc} onBack={() => setCurrentDoc(null)} />
              )}
              {showDiscussion && (
                <DiscussionBoard playerData={playerData} isGuest={isGuest} onBack={() => setShowDiscussion(false)} />
              )}
            </div>
          )}
        </div>

        <StatusBar path={statusPath} nickname={playerData?.name || accessCode} playerData={playerData} />
      </div>

      {/* 通知氣球 */}
      <NotificationBalloon notifications={notifications} onDismiss={removeNotification} />

      {/* 互動地圖 */}
      {showMap && <MapWindow onClose={() => setShowMap(false)} />}

      {/* 全域右鍵 / 長按選單 */}
      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          items={contextMenuItems}
          onClose={() => setMenuPos(null)}
        />
      )}

      {/* 關於此系統 dialog */}
      {showAbout && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
        }}
          onClick={() => setShowAbout(false)}
        >
          <div className="win95-window" style={{ width: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="win95-title-bar">
              <span>關於此系統</span>
              <div className="win95-title-buttons">
                <div className="win95-btn" onClick={() => setShowAbout(false)}>X</div>
              </div>
            </div>
            <div className="win95-content" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div className="pixel-icon icon-robot-head" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px' }}>PolyU_Hualien_Tour.exe</h3>
              <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>版本 2026.05.18</p>
              <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#555' }}>
                PolyU × 牛犁協會<br />花蓮豐田社區學習計畫
              </p>
              <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid #c0c0c0' }} />
              <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>
                Built with React + Vite + Firebase
              </p>
              <button
                className="win95-button"
                style={{ marginTop: 18 }}
                onClick={() => { playClick(); setShowAbout(false); }}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
