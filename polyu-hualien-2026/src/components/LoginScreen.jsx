// src/components/LoginScreen.jsx
function LoginScreen({ accessCode, onAccessCodeChange, onVerify, errorMsg }) {
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
      />
      <br />
      <button className="win95-button" onClick={onVerify}>驗證憑證</button>
      {errorMsg && <p style={{ color: 'red', marginTop: '15px', fontWeight: 'bold' }}>{errorMsg}</p>}
    </div>
  );
}

export default LoginScreen;
