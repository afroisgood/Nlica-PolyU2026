# CLAUDE.md

本檔案為 Claude Code (claude.ai/code) 提供此專案的開發指引。

## 常用指令

```bash
npm run dev       # 啟動 Vite 開發伺服器（支援 HMR）
npm run build     # 打包至 dist/ 資料夾
npm run preview   # 在本地預覽正式版本
npm run lint      # 執行 ESLint 檢查
```

本專案未設定測試套件。

## 架構概覽

這是一個以 **Windows 95 復古桌面為主題的 React 單頁應用程式**，用於 2026 年香港理工大學（PolyU）學生花蓮旅遊活動，模擬復古作業系統的資料夾、文件與視窗操作體驗。

### 導航模型

本專案**不使用 Router**，所有導航由 `App.jsx` 中的狀態驅動：
- `isBooting`（boolean）：控制開機動畫是否顯示
- `step`（number）：`0` = 登入頁，`1` = 桌面
- `currentFolderKey` / `currentDoc`：目前開啟的資料夾或文件
- `isGuest`（boolean）：訪客模式時隱藏「各組學習服務安排」資料夾
- 布林旗標（`showDiscussion`、`showMap`、`showSnake`）控制各 Modal 視窗的顯示
- 例外：`/admin` 路徑透過 `window.location.pathname` 判斷，並以 lazy import 載入 `AdminPage`

### 資料來源

應用程式啟動時會合併三個獨立的後端資料：

| 來源 | 提供內容 | 方式 |
|---|---|---|
| Google Sheets CSV | 成員名單（姓名、組別、導師、地點等） | `src/data/fetchUsers.js` 抓取 2 張 CSV 試算表並在啟動時合併 |
| Firebase Realtime DB | 討論留言、排行榜、地圖標記 | `src/lib/firebase.js`；各元件使用 `onValue` 監聽即時更新 |
| `public/content.json` | 桌面顯示的資料夾與文件樹狀結構 | 啟動時抓取；可透過管理員面板編輯 |

若 Google Sheets 抓取失敗，`src/data/users.json` 作為備用靜態資料。

### 主要元件

**核心畫面**
- **`App.jsx`** — 持有所有全域狀態；決定渲染哪個頂層畫面；包含 `GROUP_TASK_FOLDER` 常數（依登入者動態產生各組任務內容，不放 content.json）
- **`BootScreen.jsx`** — 開機動畫，模擬 DOS 進度條
- **`LoginScreen.jsx`** — 憑證輸入或訪客模式進入
- **`Desktop.jsx`** — Win95 桌面，讀取 `content.json` 的資料夾結構並顯示圖示
- **`FolderView.jsx`** — 資料夾內容列表
- **`DocumentView.jsx`** — 文件閱讀視窗；含閱讀進度條（3px 細線，隨捲動更新）與目錄面板（文件含 2 個以上 `#`/`##` 標題時顯示「目錄」按鈕）

**Modal / 浮層（lazy 載入）**
- **`MapWindow.jsx`** — Leaflet 互動地圖（`import('./components/MapWindow')`）
- **`SnakeGame.jsx`** — 貪食蛇小遊戲，支援 Firebase 排行榜（`import('./components/SnakeGame')`）
- **`AdminPage.jsx`** — 後台管理面板，拆分為 `AdminDiscussionTab`、`AdminLeaderboardTab`、`AdminMapTab`、`AdminMembersTab`（`import('./components/AdminPage')`）

**UI 元件**
- **`DiscussionBoard.jsx`** — 即時討論區，依日期分頻道，支援 Emoji 反應
- **`StatusBar.jsx`** — 底部狀態列，顯示路徑、暱稱、時鐘
- **`NotificationBalloon.jsx`** — Win95 風格右下角 toast 通知，5 秒自動消失
- **`ContextMenu.jsx`** — 右鍵（桌機）/ 長按 500ms（觸控）選單
- **`Lightbox.jsx`** — 圖片全螢幕浮層
- **`VinylPlayer.jsx`** — 黑膠唱盤 UI，內嵌 YouTube iframe 播放音訊
- **`ErrorBoundary.jsx`** — 全域錯誤捕捉 fallback

**工具函式**
- **`src/lib/markdown.jsx`** — 自製 Markdown 渲染器（無第三方解析套件）；`#`/`##`/`###` 標題會產生 `id="md-h-{行號}"` 錨點供 DocumentView 目錄跳轉使用
- **`src/lib/sounds.js`** — Win95 音效輔助函式
- **`src/lib/firebase.js`** — Firebase 初始化與 DB 參照
- **`src/lib/adminConfig.js`** — 管理員提交內容變更時使用的 GitHub 儲存庫常數

### 樣式

全域復古 Win95 風格由 `App.css` 與 `index.css` 定義，無 CSS 框架，純 CSS class 命名仿照 Win95 UI 慣例（如 `.win95-window`、`.win95-title-bar`、`.win95-button`）。像素圖示以 SVG data URI 定義在 `App.css` 的 `.pixel-icon` 系列 class 中，使用 `image-rendering: pixelated`。

`App.css` 主要區段：Win95 基礎元件 → 桌面圖示 → Markdown 渲染 → Checkbox → 討論區 → 黑膠播放器 → Lightbox → 文件進度條與目錄（`.doc-progress-track`、`.doc-toc`）→ RWD（`@media max-width: 600px`）

### 內容管理

管理員透過 `/admin` 面板編輯 `public/content.json` 與媒體檔案，面板會透過 GitHub Contents API 直接提交變更至 GitHub，使用儲存在管理員工作階段（sessionStorage）中的 Personal Access Token。

### 部署

部署於 Vercel。`vercel.json` 將所有路徑重寫至 `index.html` 以支援 SPA 導航。
