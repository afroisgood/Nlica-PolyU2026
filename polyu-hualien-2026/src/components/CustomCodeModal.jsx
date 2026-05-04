// src/components/CustomCodeModal.jsx
import { useState } from 'react';
import { setCustomCode, fetchCustomCodes } from '../lib/firebase';

const RE_VALID = /^[A-Z0-9]+$/;

function CustomCodeModal({ originalCode, usersDatabase, existingCustomCodes, onSuccess }) {
  const [input, setInput]       = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving]     = useState(false);

  const handleChange = (e) => {
    setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    setErrorMsg('');
  };

  const validate = (code) => {
    if (code.length < 8) return '代碼長度至少需要 8 個字元。';
    if (!RE_VALID.test(code)) return '只允許輸入英文字母與數字。';
    if (usersDatabase[code]) return '此代碼與現有原始代碼衝突，請換一個。';
    if (Object.values(existingCustomCodes).includes(code)) return '此代碼已被其他成員使用，請換一個。';
    return null;
  };

  const handleSubmit = async () => {
    const code = input.trim();
    const err = validate(code);
    if (err) { setErrorMsg(err); return; }

    setSaving(true);
    try {
      // 提交前即時重新抓取最新自訂代碼，防止兩人同時設定相同代碼
      const latestCodes = await fetchCustomCodes();
      if (Object.values(latestCodes).includes(code)) {
        setErrorMsg('此代碼剛剛已被其他成員搶先使用，請換一個。');
        setSaving(false);
        return;
      }
      await setCustomCode(originalCode, code);
      onSuccess(code);
    } catch {
      setErrorMsg('儲存失敗，請稍後再試。');
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div className="win95-window" style={{ width: 360, maxWidth: '92vw' }}>
        <div className="win95-title-bar">
          <span>🔑 設定專屬登入代碼</span>
        </div>
        <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            歡迎！這是你<strong>第一次登入</strong>。<br />
            請設定一組專屬登入代碼，日後即可用此代碼登入。
          </p>
          <ul style={{ margin: '0 0 0 16px', padding: 0, fontSize: '0.85rem', color: '#444', lineHeight: 1.8 }}>
            <li>只能使用英文字母與數字（大小寫不分）</li>
            <li>至少 8 個字元</li>
            <li>設定後不可自行修改，如需重置請聯絡管理員</li>
          </ul>
          <input
            className="win95-input"
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="例如：PETER2026"
            maxLength={32}
            autoFocus
            disabled={saving}
          />
          {errorMsg && (
            <p style={{ margin: 0, color: 'red', fontWeight: 'bold', fontSize: '0.88rem' }}>
              ⚠ {errorMsg}
            </p>
          )}
          <button
            className="win95-button"
            style={{ alignSelf: 'flex-start' }}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? '儲存中...' : '確認設定'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomCodeModal;
