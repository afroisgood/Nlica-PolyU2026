// src/components/NicknameScreen.jsx
function NicknameScreen({ playerData, nickname, onNicknameChange, onEnter, errorMsg }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onEnter();
  };

  return (
    <div>
      <h2>角色建立</h2>
      <p>&gt; 憑證確認成功！陣營：<strong>{playerData.group}</strong></p>
      <p>&gt; 請輸入您在此次旅程的顯示暱稱：</p>
      <input
        type="text"
        className="win95-input"
        value={nickname}
        onChange={(e) => onNicknameChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="輸入暱稱..."
      />
      <br />
      <button className="win95-button" onClick={onEnter}>進入系統</button>
      {errorMsg && <p style={{ color: 'red', marginTop: '15px', fontWeight: 'bold' }}>{errorMsg}</p>}
    </div>
  );
}

export default NicknameScreen;
