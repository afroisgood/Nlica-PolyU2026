// src/components/Desktop.jsx
function Desktop({ folders, onOpenFolder }) {
  return (
    <div className="win95-desktop">
      {folders.map((folder) => (
        <div key={folder.key} className="win95-icon" onClick={() => onOpenFolder(folder.key)}>
          <div className={`pixel-icon ${folder.icon}`}></div>
          <span className="win95-icon-text">{folder.title}</span>
        </div>
      ))}
    </div>
  );
}

export default Desktop;
