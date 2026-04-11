// src/components/DocumentView.jsx
function DocumentView({ doc, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <strong style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.2rem)', wordBreak: 'break-all', minWidth: 0 }}>閱讀檔案：{doc.title}</strong>
        <button className="win95-button" style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '4px 10px', marginTop: 0, fontSize: '0.9rem' }} onClick={onBack}>
          ← 返回上一層
        </button>
      </div>
      <div className="win95-document">
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{doc.content}</p>
      </div>
    </div>
  );
}

export default DocumentView;
