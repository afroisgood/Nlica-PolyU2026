// src/components/FolderView.jsx
function FolderView({ folder, onOpenDoc, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <strong style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.2rem)', wordBreak: 'break-all', minWidth: 0 }}>目前位置：C:\{folder.title}\</strong>
        <button className="win95-button" style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '4px 10px', marginTop: 0, fontSize: '0.9rem' }} onClick={onBack}>
          ← 返回桌面
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
