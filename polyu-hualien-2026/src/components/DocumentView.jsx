// src/components/DocumentView.jsx
function DocumentView({ doc, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: '1.2rem' }}>閱讀檔案：{doc.title}</strong>
        <button className="win95-btn" style={{ width: 'auto', padding: '4px 12px' }} onClick={onBack}>
          🔙 返回上一層
        </button>
      </div>
      <div className="win95-document">
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{doc.content}</p>
      </div>
    </div>
  );
}

export default DocumentView;
