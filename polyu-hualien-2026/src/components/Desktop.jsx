// src/components/Desktop.jsx
function Desktop({ folders, onOpenFolder, onOpenDiscussion }) {
  return (
    <div className="win95-desktop">
      {folders.map((folder) => (
        <div key={folder.key} className="win95-icon" onClick={() => onOpenFolder(folder.key)}>
          <div className={`pixel-icon ${folder.icon}`}></div>
          <span className="win95-icon-text">{folder.title}</span>
        </div>
      ))}
      <div className="win95-icon" onClick={onOpenDiscussion}>
        <div className="pixel-icon icon-chat"></div>
        <span className="win95-icon-text">討論區</span>
      </div>
    </div>
  );
}

export default Desktop;
