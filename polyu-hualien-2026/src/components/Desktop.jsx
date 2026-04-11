// src/components/Desktop.jsx
import { useState } from 'react';
import ContextMenu from './ContextMenu';
import { playFolderOpen, playClick } from '../lib/sounds';

function Desktop({ folders, onOpenFolder, onOpenDiscussion, onLogout, onRefresh, onAbout }) {
  const [menu, setMenu] = useState(null); // { x, y }

  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const menuItems = [
    { icon: '🔄', label: '重新整理',    action: () => onRefresh?.() },
    { separator: true },
    { icon: 'ℹ️',  label: '關於此系統', action: () => onAbout?.() },
    { separator: true },
    { icon: '🔒', label: '登出',        action: () => onLogout?.() },
  ];

  return (
    <div
      className="win95-desktop"
      onContextMenu={handleContextMenu}
      onClick={() => setMenu(null)}
    >
      {folders.map((folder) => (
        <div
          key={folder.key}
          className="win95-icon"
          onClick={(e) => {
            e.stopPropagation();
            playFolderOpen();
            onOpenFolder(folder.key);
          }}
        >
          <div className={`pixel-icon ${folder.icon}`}></div>
          <span className="win95-icon-text">{folder.title}</span>
        </div>
      ))}

      <div
        className="win95-icon"
        onClick={(e) => {
          e.stopPropagation();
          playClick();
          onOpenDiscussion();
        }}
      >
        <div className="pixel-icon icon-chat"></div>
        <span className="win95-icon-text">討論區</span>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

export default Desktop;
