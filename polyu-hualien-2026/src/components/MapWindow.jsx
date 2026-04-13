// src/components/MapWindow.jsx
// 互動地圖視窗：使用 Leaflet + OpenStreetMap（免費，無需 API Key）

import { useState, useEffect, useRef } from 'react';
import { ref as dbRef, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const HUALIEN_CENTER = [23.75, 121.52];

function catColor(categories, categoryId) {
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.color || '#999999';
}

function MapWindow({ onClose }) {
  const mapDivRef   = useRef(null);
  const leafletMap  = useRef(null);
  const markerLayer = useRef(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations]   = useState([]);
  const [selectedCat, setSelectedCat] = useState(null); // null = 全覽
  const [popup, setPopup]           = useState(null);

  // ── 從 Firebase 讀取分類 ──────────────────────────────────────
  useEffect(() => {
    const catRef = dbRef(db, 'mapCategories');
    return onValue(catRef, (snap) => {
      const data = snap.val();
      if (!data) { setCategories([]); return; }
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(list);
    });
  }, []);

  // ── 從 Firebase 讀取地點 ──────────────────────────────────────
  useEffect(() => {
    const locRef = dbRef(db, 'mapLocations');
    return onValue(locRef, (snap) => {
      const data = snap.val();
      if (!data) { setLocations([]); return; }
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setLocations(list);
    });
  }, []);

  // ── 初始化 Leaflet 地圖 ───────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapDivRef.current, {
      center: HUALIEN_CENTER,
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMap.current);

    markerLayer.current = L.layerGroup().addTo(leafletMap.current);

    setTimeout(() => { leafletMap.current?.invalidateSize(); }, 50);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // ── 更新標記 ──────────────────────────────────────────────────
  useEffect(() => {
    if (!markerLayer.current) return;

    markerLayer.current.clearLayers();

    const filtered = selectedCat === null
      ? locations
      : locations.filter((l) => l.categoryId === selectedCat);

    const latLngs = [];

    filtered.forEach((loc, idx) => {
      if (!loc.lat || !loc.lng) return;
      const lat   = parseFloat(loc.lat);
      const lng   = parseFloat(loc.lng);
      const color = catColor(categories, loc.categoryId);

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${color};width:28px;height:28px;border-radius:50%;
          border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:11px;font-weight:bold;font-family:monospace;
        ">${idx + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on('click', () => setPopup(loc));
      markerLayer.current.addLayer(marker);
      latLngs.push([lat, lng]);
    });

    if (selectedCat !== null && latLngs.length > 1 && leafletMap.current) {
      leafletMap.current.fitBounds(latLngs, { padding: [40, 40] });
    } else if (selectedCat !== null && latLngs.length === 1 && leafletMap.current) {
      leafletMap.current.setView(latLngs[0], 14);
    }
  }, [locations, categories, selectedCat]);

  const visible = selectedCat === null
    ? locations
    : locations.filter((l) => l.categoryId === selectedCat);

  const popupCat   = popup ? categories.find((c) => c.id === popup.categoryId) : null;
  const popupColor = popup ? catColor(categories, popup.categoryId) : '#cc0000';

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 9999,
      }}
      onClick={() => setPopup(null)}
    >
      <div
        className="win95-window"
        style={{ width: 700, maxWidth: '96vw', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="win95-title-bar">
          <span>🗺️ 行程地圖</span>
          <div className="win95-title-buttons">
            <div className="win95-btn" onClick={onClose}>X</div>
          </div>
        </div>

        {/* 分類篩選列 */}
        <div style={{
          display: 'flex', gap: 4, padding: '6px 8px',
          borderBottom: '1px solid #808080', backgroundColor: '#d4d0c8',
          flexWrap: 'wrap', alignItems: 'center',
        }}>
          <button
            className="win95-button"
            style={{
              fontSize: '0.8rem', padding: '2px 10px',
              backgroundColor: selectedCat === null ? '#000080' : undefined,
              color: selectedCat === null ? '#fff' : undefined,
            }}
            onClick={() => { setSelectedCat(null); setPopup(null); }}
          >全覽</button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              className="win95-button"
              style={{
                fontSize: '0.8rem', padding: '2px 10px',
                backgroundColor: selectedCat === cat.id ? (cat.color || '#999') : undefined,
                color: selectedCat === cat.id ? '#fff' : undefined,
              }}
              onClick={() => { setSelectedCat(cat.id); setPopup(null); }}
            >{cat.label}</button>
          ))}

          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#555' }}>
            共 {visible.length} 個地點
          </span>
        </div>

        {/* 地圖區域 */}
        <div style={{ height: 380, flexShrink: 0 }}>
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* 地點資訊列（點擊地點後顯示） */}
        {popup && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 12px', borderTop: '2px solid #808080',
            backgroundColor: 'white', fontSize: '0.85rem', flexWrap: 'wrap',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              fontSize: '0.7rem', fontWeight: 'bold',
              backgroundColor: popupColor, color: '#fff',
            }}>●</span>
            <strong style={{ flexShrink: 0 }}>{popup.name}</strong>
            {popupCat && <span style={{ color: '#555', fontSize: '0.78rem' }}>{popupCat.label}</span>}
            {popup.description && <span style={{ color: '#666' }}>{popup.description}</span>}
            <a
              href={`https://maps.google.com/maps?daddr=${popup.lat},${popup.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="win95-button"
              style={{
                fontSize: '0.78rem', padding: '2px 8px',
                textDecoration: 'none', marginLeft: 'auto', flexShrink: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >🧭 開啟導航</a>
            <span
              style={{ cursor: 'pointer', fontWeight: 'bold', color: '#555', flexShrink: 0 }}
              onClick={() => setPopup(null)}
            >✕</span>
          </div>
        )}

        {/* 地點清單 */}
        <div style={{ maxHeight: 160, overflowY: 'auto', borderTop: '2px solid #808080' }}>
          {visible.length === 0 && (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', color: '#888' }}>
              {locations.length === 0
                ? '尚無地點，請在後台「地圖管理」新增。'
                : '此分類無地點資料。'}
            </div>
          )}
          {visible.map((loc, idx) => {
            const cat   = categories.find((c) => c.id === loc.categoryId);
            const color = catColor(categories, loc.categoryId);
            return (
              <div
                key={loc.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 10px', fontSize: '0.82rem',
                  borderBottom: '1px solid #e0e0e0', cursor: 'pointer',
                  backgroundColor: popup?.id === loc.id ? '#dde8ff' : undefined,
                }}
                onClick={() => {
                  setPopup(loc);
                  if (leafletMap.current && loc.lat && loc.lng) {
                    leafletMap.current.setView(
                      [parseFloat(loc.lat), parseFloat(loc.lng)], 14,
                      { animate: true }
                    );
                  }
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: '50%',
                  fontSize: '0.7rem', fontWeight: 'bold', flexShrink: 0,
                  backgroundColor: color, color: '#fff',
                }}>{idx + 1}</span>
                {cat && (
                  <span style={{
                    color: '#fff', fontSize: '0.7rem', padding: '1px 5px',
                    backgroundColor: color, borderRadius: 2, flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>{cat.label}</span>
                )}
                <span style={{ fontWeight: 'bold', flexShrink: 0 }}>{loc.name}</span>
                {loc.description && (
                  <span style={{
                    color: '#888', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', fontSize: '0.78rem',
                  }}>{loc.description}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MapWindow;
