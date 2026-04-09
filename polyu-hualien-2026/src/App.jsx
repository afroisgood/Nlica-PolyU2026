// src/App.jsx
import { useState, useEffect } from 'react';
import { fetchUsers } from './data/fetchUsers';
import { welcomeMessages, systemFolders, groupThemeColors } from './data/systemData';
import LoginScreen from './components/LoginScreen';
import Desktop from './components/Desktop';
import FolderView from './components/FolderView';
import DocumentView from './components/DocumentView';
import BootScreen from './components/BootScreen';
import StatusBar from './components/StatusBar';
import './App.css';

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [usersDatabase, setUsersDatabase] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [step, setStep] = useState(0);
  const [accessCode, setAccessCode] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [greeting, setGreeting] = useState('');
  const [currentFolderKey, setCurrentFolderKey] = useState(null);
  const [currentDoc, setCurrentDoc] = useState(null);

  // 將 doc11 的動態內容注入 playerData
  const folders = systemFolders.map((folder) => ({
    ...folder,
    docs: folder.docs.map((doc) => {
      if (doc.id === 'doc11' && playerData) {
        return {
          ...doc,
          content: `[ 陣營身分 ] ${playerData.group}\n[ 服務地點 ] ${playerData.location}\n[ 帶領導師 ] ${playerData.mentor}\n[ 組別人數 ] ${playerData.groupSize}\n\n[ 主線任務指派 ]\n${playerData.mainQuest}\n\n[ 行前裝備提示 ]\n${playerData.gear}`,
        };
      }
      return doc;
    }),
  }));

  const currentFolder = currentFolderKey
    ? folders.find((f) => f.key === currentFolderKey)
    : null;

  const statusPath = (() => {
    if (step < 1) return 'C:\\';
    if (!currentFolder) return 'C:\\';
    if (!currentDoc) return `C:\\${currentFolder.title}\\`;
    return `C:\\${currentFolder.title}\\${currentDoc.title}`;
  })();

  const handleVerifyCode = () => {
    if (!accessCode) {
      setErrorMsg('錯誤：請輸入憑證代碼。');
      return;
    }
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

  // 開機動畫結束後，從 Google Sheets 載入名單
  useEffect(() => {
    if (isBooting) return;
    fetchUsers()
      .then(setUsersDatabase)
      .catch((err) => setFetchError(err.message));
  }, [isBooting]);

  if (isBooting) {
    return <BootScreen onComplete={() => setIsBooting(false)} />;
  }

  if (!usersDatabase && !fetchError) {
    return (
      <main className="win95-container">
        <div className="win95-window">
          <div className="win95-title-bar">
            <span>PolyU_Hualien_Tour.exe</span>
          </div>
          <div className="win95-content">
            <p>&gt; 正在載入名單資料...</p>
          </div>
        </div>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="win95-container">
        <div className="win95-window">
          <div className="win95-title-bar">
            <span>PolyU_Hualien_Tour.exe</span>
          </div>
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

        {/* 標題列 */}
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
              errorMsg={errorMsg}
            />
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

              {/* 玩家資訊列 */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', backgroundColor: 'var(--win95-window)', borderBottom: '2px solid var(--win95-mid)', paddingBottom: '15px' }}>
                <div style={{ width: '80px', height: '80px', backgroundColor: 'white', border: '2px inset var(--win95-mid)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {playerData.avatarUrl
                    ? <img src={playerData.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
                    : <div className="pixel-icon icon-robot-head" style={{ top: '6px' }}></div>
                  }
                </div>
                <div>
                  <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.6rem' }}>嗨，{playerData.name || accessCode}！</h2>
                  <p style={{ margin: 0, color: 'var(--win95-title)', fontWeight: 'bold', fontSize: '1.1rem' }}>&gt; {greeting}</p>
                </div>
              </div>

              {/* 桌面 / 資料夾 / 文件 */}
              {currentFolder === null && (
                <Desktop folders={folders} onOpenFolder={setCurrentFolderKey} />
              )}

              {currentFolder !== null && currentDoc === null && (
                <FolderView
                  folder={currentFolder}
                  onOpenDoc={setCurrentDoc}
                  onBack={() => setCurrentFolderKey(null)}
                />
              )}

              {currentFolder !== null && currentDoc !== null && (
                <DocumentView
                  doc={currentDoc}
                  onBack={() => setCurrentDoc(null)}
                />
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
