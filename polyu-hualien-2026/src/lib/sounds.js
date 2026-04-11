// src/lib/sounds.js
// Win95 風格音效 — 使用 Web Audio API 合成，不需外部音檔

let _ctx = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(freq, startOffset, duration, type = 'square', vol = 0.07) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  } catch (_) { /* 安靜忽略 */ }
}

/** 短促點擊聲 */
export function playClick() {
  tone(900, 0, 0.03, 'square', 0.05);
}

/** 開啟資料夾 — 上升兩音 */
export function playFolderOpen() {
  tone(523, 0,    0.07, 'square', 0.06);
  tone(784, 0.06, 0.10, 'square', 0.06);
}

/** 錯誤聲 — 下降雙音 */
export function playError() {
  tone(300, 0,    0.10, 'sawtooth', 0.08);
  tone(220, 0.09, 0.15, 'sawtooth', 0.08);
}

/** 開機音 — 近似 Win95 startup chime */
export function playBoot() {
  tone(392,  0,    0.12, 'sine', 0.07); // G4
  tone(523,  0.13, 0.12, 'sine', 0.07); // C5
  tone(659,  0.26, 0.12, 'sine', 0.07); // E5
  tone(784,  0.39, 0.12, 'sine', 0.07); // G5
  tone(1047, 0.52, 0.30, 'sine', 0.07); // C6（長音）
}

/** 通知聲 — 高低兩聲 beep */
export function playNotification() {
  tone(880,  0,    0.07, 'sine', 0.06);
  tone(1108, 0.07, 0.12, 'sine', 0.06);
}
