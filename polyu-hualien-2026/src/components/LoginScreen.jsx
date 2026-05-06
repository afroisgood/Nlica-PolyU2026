// src/components/LoginScreen.jsx
function LoginScreen({ accessCode, onAccessCodeChange, onVerify, onGuestEnter, errorMsg, isVerifying }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onVerify();
  };

  return (
    <div>
      <h2>系統登入</h2>
      <p>&gt; 系統啟動中...</p>
      <p>&gt; 請輸入您的專屬登入憑證：</p>
      <input
        type="text"
        className="win95-input"
        value={accessCode}
        onChange={(e) => onAccessCodeChange(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        placeholder="例如: POLYU-ART-01"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck="false"
        disabled={isVerifying}
      />
      <br />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
        <button className="win95-button" style={{ margin: 0 }} onClick={onVerify} disabled={isVerifying}>
          {isVerifying ? '驗證中...' : '驗證憑證'}
        </button>
        <button className="win95-button" style={{ margin: 0, color: '#555' }} onClick={onGuestEnter} disabled={isVerifying}>
          忽略驗證直接進入
        </button>
      </div>
      {errorMsg && <p style={{ color: 'red', marginTop: '15px', fontWeight: 'bold' }}>{errorMsg}</p>}
    </div>
  );
}

export default LoginScreen;
