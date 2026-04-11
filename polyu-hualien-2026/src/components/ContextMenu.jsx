// src/components/ContextMenu.jsx
import { useEffect, useRef } from 'react';
import { playClick } from '../lib/sounds';

const MENU_WIDTH = 190;

function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handle = () => onClose();
    setTimeout(() => window.addEventListener('mousedown', handle), 0);
    return () => window.removeEventListener('mousedown', handle);
  }, [onClose]);

  // 防止選單超出畫面右側 / 底部
  const safeX = Math.min(x, window.innerWidth  - MENU_WIDTH - 8);
  const safeY = Math.min(y, window.innerHeight - 200);

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: safeY,
        left: safeX,
        zIndex: 9999,
        width: MENU_WIDTH,
        backgroundColor: '#c0c0c0',
        border: '2px solid',
        borderTopColor:    '#ffffff',
        borderLeftColor:   '#ffffff',
        borderRightColor:  '#808080',
        borderBottomColor: '#808080',
        boxShadow: '2px 2px 0 #000',
        fontFamily: "'DotGothic16', 'Courier New', monospace",
        fontSize: '0.88rem',
        padding: '2px 0',
        userSelect: 'none',
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div
            key={i}
            style={{
              margin: '2px 3px',
              borderTop:    '1px solid #808080',
              borderBottom: '1px solid #fff',
            }}
          />
        ) : (
          <div
            key={i}
            style={{
              padding: '4px 16px 4px 32px',
              position: 'relative',
              cursor: item.disabled ? 'default' : 'pointer',
              color:  item.disabled ? '#808080' : '#000',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = '#000080';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = item.disabled ? '#808080' : '#000';
            }}
            onClick={() => {
              if (!item.disabled) {
                playClick();
                item.action();
                onClose();
              }
            }}
          >
            {item.icon && (
              <span style={{ position: 'absolute', left: 10 }}>{item.icon}</span>
            )}
            {item.label}
          </div>
        )
      )}
    </div>
  );
}

export default ContextMenu;
