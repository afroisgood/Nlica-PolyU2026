// src/components/Desktop.jsx
import { playFolderOpen, playClick } from '../lib/sounds';

function Desktop({ folders, onOpenFolder, onOpenDiscussion, onOpenMap }) {
  return (
    <div className="win95-desktop">
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
          onOpenMap();
        }}
      >
        <div className="pixel-icon icon-pin"></div>
        <span className="win95-icon-text">行程地圖</span>
      </div>

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
    </div>
  );
}

export default Desktop;
