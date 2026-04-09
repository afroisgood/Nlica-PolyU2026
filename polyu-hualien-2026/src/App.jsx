// src/App.jsx
import { useState } from 'react';
import usersDatabase from './data/users.json';
import { welcomeMessages, systemFolders } from './data/systemData';
import LoginScreen from './components/LoginScreen';
import NicknameScreen from './components/NicknameScreen';
import Desktop from './components/Desktop';
import FolderView from './components/FolderView';
import DocumentView from './components/DocumentView';
import './App.css';

function App() {
  const [step, setStep] = useState(0);
  const [accessCode, setAccessCode] = useState('');
  const [nickname, setNickname] = useState('');
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
          content: `[ 陣營身分 ] ${playerData.group}\n[ 帶領導師 ] ${playerData.mentor}\n\n[ 主線任務指派 ]\n${playerData.mainQuest}`,
        };
      }
      return doc;
    }),
  }));

  const currentFolder = currentFolderKey
    ? folders.find((f) => f.key === currentFolderKey)
    : null;

  const handleVerifyCode = () => {
    if (!accessCode) {
      setErrorMsg('錯誤：請輸入憑證代碼。');
      return;
    }
    const data = usersDatabase[accessCode];
    if (data) {
      setPlayerData(data);
      setErrorMsg('');
      setStep(1);
    } else {
      setErrorMsg('錯誤：查無此憑證代碼，請重新輸入。');
    }
  };

  const handleEnterGame = () => {
    if (nickname.trim() !== '') {
      const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      setGreeting(randomMsg);
      setStep(2);
    } else {
      setErrorMsg('錯誤：勇者不能沒有名字！');
    }
  };

  return (
    <main className="win95-container">
      <div className="win95-window">

        {/* 標題列 */}
        <div className="win95-title-bar">
          <span>PolyU_Hualien_Tour.exe</span>
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
            <NicknameScreen
              playerData={playerData}
              nickname={nickname}
              onNicknameChange={setNickname}
              onEnter={handleEnterGame}
              errorMsg={errorMsg}
            />
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

              {/* 玩家資訊列 */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', backgroundColor: 'var(--win95-window)', borderBottom: '2px solid var(--win95-mid)', paddingBottom: '15px' }}>
                <div style={{ width: '80px', height: '80px', backgroundColor: 'white', border: '2px inset var(--win95-mid)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div className="pixel-icon icon-robot-head" style={{ top: '6px' }}></div>
                </div>
                <div>
                  <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.6rem' }}>嗨，{nickname}！</h2>
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
      </div>
    </main>
  );
}

export default App;
