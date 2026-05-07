// src/components/Desktop.jsx
import { playFolderOpen, playClick } from '../lib/sounds';

function Desktop({ folders, rootDocs = [], onOpenFolder, onOpenRootDoc, onOpenDiscussion, onOpenMap, onOpenSnake, onOpenDisasterBook, onOpenRoom, playerData }) {
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

      {rootDocs.map((doc) => (
        <div
          key={doc.id}
          className="win95-icon"
          onClick={(e) => {
            e.stopPropagation();
            playClick();
            onOpenRootDoc(doc);
          }}
        >
          <div className={`pixel-icon ${doc.icon || 'icon-scroll'}`}></div>
          <span className="win95-icon-text">{doc.title}</span>
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
          onOpenSnake();
        }}
      >
        <div className="pixel-icon icon-snake"></div>
        <span className="win95-icon-text">貪吃蛇</span>
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

      <div
        className="win95-icon"
        onClick={(e) => {
          e.stopPropagation();
          playClick();
          onOpenDisasterBook();
        }}
      >
        <div className="pixel-icon icon-book"></div>
        <span className="win95-icon-text">防災手冊</span>
      </div>

      {playerData?.room && playerData?.password && (
        <div
          className="win95-icon"
          onClick={(e) => {
            e.stopPropagation();
            playClick();
            onOpenRoom();
          }}
        >
          <div className="pixel-icon icon-door"></div>
          <span className="win95-icon-text">我的房間</span>
        </div>
      )}
    </div>
  );
}

export default Desktop;
