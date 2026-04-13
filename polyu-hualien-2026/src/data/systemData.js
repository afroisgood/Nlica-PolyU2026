// src/data/systemData.js
// 資料夾與文件內容定義
// systemFolders 已移至 public/content.json，由 App.jsx 在執行時 fetch

// 討論區日期（唯一來源）
// DiscussionBoard 優先從 Firebase discussionDays 讀取，此為 fallback 預設值
// AdminDiscussionTab 可將此預設值一鍵匯入 Firebase 以便後台管理
export const DISCUSSION_DAYS = [
  { key: '2026-05-18', label: '5/18 相見歡' },
  { key: '2026-05-19', label: '5/19 豐田探索' },
  { key: '2026-05-20', label: '5/20 服務學習 Day1' },
  { key: '2026-05-21', label: '5/21 服務學習 Day2' },
  { key: '2026-05-22', label: '5/22 光復鄉' },
  { key: '2026-05-24', label: '5/24 在地共創' },
];

// 各組專屬顏色（依組別名稱自動對應，Google Sheets 不需填 themeColor）
export const groupThemeColors = {
  '第一組｜傳統工藝': '#5c3a1e',
  '第二組｜環境生態': '#1a5c2a',
  '第三組｜高齡長照': '#8b1a4a',
  '第四組｜備援組織': '#2a3a6b',
  '第五組｜防災韌性': '#1a4a5c',
  '第六組｜部落文化': '#4a1a6b',
  '第七組｜在地經濟': '#6b4a00',
};

export const welcomeMessages = [
  "系統連線成功！歡迎來到花蓮豐田。",
  "準備好展開這場跨領域的冒險了嗎？",
  "在地圖的角落，寫下你的專屬故事吧！",
  "牛犁公會的大門為你敞開，勇敢探索吧！",
  "Loading 地方共鳴模組... 載入完成！",
];
