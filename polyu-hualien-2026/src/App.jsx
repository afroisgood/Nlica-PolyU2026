// src/App.jsx
import { useState, useEffect } from 'react';
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
import './App.css';

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

  const handleGuestEnter = () => {
    const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    setGreeting(randomMsg);
    setIsGuest(true);
    setStep(1);
  };

  const handleVerifyCode = () => {
    if (!accessCode) { setErrorMsg('錯誤：請輸入憑證代碼。'); return; }
    const data = usersDatabase[accessCode];
    if (data) {
      const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      setGreeting(randomMsg);
      setPlayerData(data);
      setErrorMsg('');
      setStep(1);
    } else {
      setErrorMsg('錯誤：查無此憑證代碼，請重新輸入。');
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

  if (isAdmin) return <AdminPage />;

  if (isBooting) return <BootScreen onComplete={() => setIsBooting(false)} />;

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
      <div className="win95-window">

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
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ marginTop: 0, marginBottom: '6px', fontSize: 'clamp(1.1rem, 4vw, 1.6rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isGuest ? '嗨，訪客！' : `嗨，${playerData?.name || accessCode}！`}
                  </h2>
                  <p style={{ margin: 0, color: 'var(--win95-title)', fontWeight: 'bold', fontSize: 'clamp(0.85rem, 3vw, 1.1rem)' }}>&gt; {greeting}</p>
                </div>
              </div>

              {!showDiscussion && currentFolder === null && (
                <Desktop folders={visibleFolders} onOpenFolder={setCurrentFolderKey} onOpenDiscussion={() => setShowDiscussion(true)} />
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
    </main>
  );
}

export default App;
