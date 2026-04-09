// src/components/FolderView.jsx
function FolderView({ folder, onOpenDoc, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: '1.2rem' }}>目前位置：C:\{folder.title}\</strong>
        <button className="win95-btn" style={{ width: 'auto', padding: '4px 12px' }} onClick={onBack}>
          🔙 返回桌面
        </button>
      </div>
      <div className="win95-file-list">
        {folder.docs.map((doc) => (
          <div key={doc.id} className="win95-file-item" onClick={() => onOpenDoc(doc)}>
            {doc.title}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FolderView;
