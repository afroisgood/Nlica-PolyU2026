// src/App.jsx
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { fetchUsers } from './data/fetchUsers';
import { welcomeMessages, groupThemeColors } from './data/systemData';
import LoginScreen from './components/LoginScreen';
import CustomCodeModal from './components/CustomCodeModal';
import Desktop from './components/Desktop';
import FolderView from './components/FolderView';
import DocumentView from './components/DocumentView';
import BootScreen from './components/BootScreen';
import StatusBar from './components/StatusBar';
import DiscussionBoard from './components/DiscussionBoard';
const AdminPage     = lazy(() => import('./components/AdminPage'));
const MapWindow     = lazy(() => import('./components/MapWindow'));
const SnakeGame     = lazy(() => import('./components/SnakeGame'));
const DisasterBook  = lazy(() => import('./components/DisasterBook'));
import NotificationBalloon from './components/NotificationBalloon';
import { playBoot, playClick, playError, playNotification, toggleSound, isSoundEnabled } from './lib/sounds';
import { fetchCustomCodes } from './lib/firebase';
import './App.css';

// 固定的各組任務資料夾（內容依登入者動態產生，不放 content.json）

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [usersDatabase, setUsersDatabase] = useState(null);
  const [contentFolders, setContentFolders] = useState([]);
  const [rootDocs, setRootDocs] = useState([]);
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
  const [showSnake, setShowSnake] = useState(false);
  const [showDisasterBook, setShowDisasterBook] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [customCodeModal, setCustomCodeModal] = useState(null); // { originalCode, data, customCodes }
  const notifIdRef = useRef(0);

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

  // 從 group 欄位取組別標籤（如「第一組｜傳統工藝」→「第一組」；「老師」→「老師」）
  const userGroupTag = isGuest || !playerData
    ? null
    : (playerData.group || '').split('｜')[0].trim();

  // visibility=[] 全部可見；有值時訪客一律不可見，登入者需符合其中一個群組
  const canSee = (visibility) => {
    if (!visibility || visibility.length === 0) return true;
    if (!userGroupTag) return false;
    return visibility.includes(userGroupTag);
  };

  const visibleFolders = contentFolders
    .filter((f) => canSee(f.visibility))
    .map((f) => ({ ...f, docs: (f.docs || []).filter((d) => canSee(d.visibility)) }));

  const visibleRootDocs = rootDocs.filter((d) => canSee(d.visibility));

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
  };

  const loginUser = (data) => {
    playClick();
    const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    setGreeting(randomMsg);
    setPlayerData(data);
    setErrorMsg('');
    setStep(1);
  };

  const handleVerifyCode = async () => {
    const code = accessCode.trim().toUpperCase();
    if (!code) { setErrorMsg('錯誤：請輸入憑證代碼。'); return; }

    setErrorMsg('');
    let customCodes;
    try {
      customCodes = await fetchCustomCodes();
    } catch {
      setErrorMsg('錯誤：無法連線驗證，請稍後再試。');
      return;
    }

    // 1. 直接比對原始代碼
    const directData = usersDatabase[code];
    if (directData) {
      if (customCodes[code]) {
        // 已設定自訂代碼，直接登入
        loginUser(directData);
      } else {
        // 第一次登入，顯示設定代碼 modal
        setCustomCodeModal({ originalCode: code, data: directData, customCodes });
      }
      return;
    }

    // 2. 比對自訂代碼（反向查找）
    const originalCode = Object.entries(customCodes).find(([, v]) => v === code)?.[0];
    if (originalCode) {
      const originalData = usersDatabase[originalCode];
      if (originalData) {
        loginUser(originalData);
        return;
      }
    }

    playError();
    setErrorMsg('錯誤：查無此憑證代碼，請重新輸入。');
  };

  const parseContent = (content) => {
    // 支援新格式 { items } 及舊格式 { folders, rootDocs }
    const items = content.items || [
      ...(content.folders || []).map((f) => ({ type: 'folder', ...f })),
      ...(content.rootDocs || []).map((d) => ({ type: 'doc', ...d })),
    ];
    return {
      folders: items.filter((i) => i.type === 'folder'),
      rootDocs: items.filter((i) => i.type === 'doc'),
    };
  };

  const handleRefresh = async () => {
    try {
      const [users, content] = await Promise.all([
        fetchUsers(),
        fetch('/content.json').then((r) => r.json()),
      ]);
      const { folders, rootDocs } = parseContent(content);
      setUsersDatabase(users);
      setContentFolders(folders);
      setRootDocs(rootDocs);
      addNotification({ title: '系統', message: '資料已重新整理完成。', icon: '🔄' });
    } catch {
      addNotification({ title: '錯誤', message: '重新整理失敗，請稍後再試。', icon: '⚠️' });
    }
  };

  useEffect(() => {
    if (isBooting) return;
    Promise.all([
      fetchUsers(),
      fetch('/content.json').then((r) => r.json()),
    ])
      .then(([users, content]) => {
        const { folders, rootDocs } = parseContent(content);
        setUsersDatabase(users);
        setContentFolders(folders);
        setRootDocs(rootDocs);
      })
      .catch((err) => setFetchError(err.message));

    // 主要資料載完後，在閒置時背景預載 AdminPage chunk，
    // 讓管理者第一次進入登入頁時不需等待網路下載
    const t = setTimeout(() => { import('./components/AdminPage'); }, 1500);
    return () => clearTimeout(t);
  }, [isBooting]);

  const assistantContext = (() => {
    if (step === 0) return 'login';
    if (showSnake) return 'snake';
    if (showDisasterBook) return 'disaster';
    if (showMap) return 'map';
    if (showDiscussion) return 'discussion';
    if (currentDoc) return 'document';
    if (currentFolderKey) return 'folder';
    return 'desktop';
  })();

  const handleGoDesktop = () => {
    setCurrentFolderKey(null);
    setCurrentDoc(null);
    setShowDiscussion(false);
    setShowMap(false);
    setShowSnake(false);
    setShowDisasterBook(false);
  };

  // ── 右鍵 / 長按選單 ────────────────────────────────────────────
  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
  };


  if (isAdmin) return <Suspense fallback={null}><AdminPage /></Suspense>;

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
              <div className="user-header" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', borderBottom: '2px solid var(--win95-mid)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                <div className="user-header-avatar" style={{ width: '64px', height: '64px', minWidth: '64px', backgroundColor: 'white', border: '2px inset var(--win95-mid)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
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

              {!showDiscussion && currentFolder === null && currentDoc === null && (
                <Desktop
                  folders={visibleFolders}
                  rootDocs={visibleRootDocs}
                  onOpenFolder={setCurrentFolderKey}
                  onOpenRootDoc={setCurrentDoc}
                  onOpenDiscussion={() => setShowDiscussion(true)}
                  onOpenMap={() => setShowMap(true)}
                  onOpenSnake={() => setShowSnake(true)}
                  onOpenDisasterBook={() => setShowDisasterBook(true)}
                  onLogout={handleLogout}
                />
              )}
              {!showDiscussion && currentFolder === null && currentDoc !== null && (
                <DocumentView doc={currentDoc} onBack={() => setCurrentDoc(null)} />
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

        {/* 小助手角色（放在視窗內，絕對定位於右下角） */}
        <NotificationBalloon
          notifications={notifications}
          onDismiss={removeNotification}
          assistantContext={assistantContext}
          step={step}
          playerData={playerData}
          onGoDesktop={handleGoDesktop}
          onOpenDiscussion={() => { handleGoDesktop(); setShowDiscussion(true); }}
          onOpenMap={() => setShowMap(true)}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
        />
      </div>

      {/* 自訂登入代碼 modal（第一次登入） */}
      {customCodeModal && (
        <CustomCodeModal
          originalCode={customCodeModal.originalCode}
          usersDatabase={usersDatabase}
          existingCustomCodes={customCodeModal.customCodes}
          onSuccess={(newCode) => {
            setCustomCodeModal(null);
            setAccessCode(newCode);
            loginUser(customCodeModal.data);
          }}
        />
      )}

      {/* 互動地圖 */}
      <Suspense fallback={null}>
        {showMap && <MapWindow onClose={() => setShowMap(false)} />}
      </Suspense>

      {/* 貪吃蛇 */}
      <Suspense fallback={null}>
        {showSnake && <SnakeGame onClose={() => setShowSnake(false)} playerData={playerData} isGuest={isGuest} />}
      </Suspense>

      {/* 防災手冊 */}
      <Suspense fallback={null}>
        {showDisasterBook && <DisasterBook onClose={() => setShowDisasterBook(false)} />}
      </Suspense>

    </main>
  );
}

export default App;
