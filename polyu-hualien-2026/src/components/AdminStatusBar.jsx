// src/components/AdminStatusBar.jsx
import { GITHUB_OWNER, GITHUB_REPO } from '../lib/adminConfig';

function AdminStatusBar({ onLogout, onDiscussion, onMembers, onMap, onLeaderboard }) {
  const linkStyle = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.8rem', color: '#000080', textDecoration: 'underline',
  };
  return (
    <div style={{ borderTop: '2px solid #808080', padding: '3px 8px', display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.8rem', backgroundColor: '#c0c0c0', flexWrap: 'wrap' }}>
      <span style={{ flexGrow: 1 }}>已連線 GitHub：{GITHUB_OWNER}/{GITHUB_REPO}</span>
      {onMembers    && <button style={linkStyle} onClick={onMembers}>👥 成員名單</button>}
      {onDiscussion && <button style={linkStyle} onClick={onDiscussion}>💬 討論區管理</button>}
      {onMap        && <button style={linkStyle} onClick={onMap}>🗺️ 地圖管理</button>}
      {onLeaderboard && <button style={linkStyle} onClick={onLeaderboard}>🏆 排行榜</button>}
      {onLogout     && <button style={linkStyle} onClick={onLogout}>登出</button>}
    </div>
  );
}

export default AdminStatusBar;
