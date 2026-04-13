// src/components/MapWindow.jsx
// 互動地圖視窗：使用 Leaflet + OpenStreetMap（免費，無需 API Key）

import { useState, useEffect, useRef } from 'react';
import { ref as dbRef, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DAY_COLORS = {
  1: '#cc0000',
  2: '#0044cc',
  3: '#007700',
  4: '#cc6600',
  5: '#7700bb',
  6: '#00888a',
  7: '#884400',
};

const HUALIEN_CENTER = [23.75, 121.52];

function MapWindow({ onClose }) {
  const mapDivRef = useRef(null);
  const leafletMap = useRef(null);
  const markerLayer = useRef(null);
  const [locations, setLocations]     = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [popup, setPopup]             = useState(null);

  // ── 從 Firebase 讀取地點 ──────────────────────────────────────
  useEffect(() => {
    const locRef = dbRef(db, 'mapLocations');
    return onValue(locRef, (snap) => {
      const data = snap.val();
      if (!data) { setLocations([]); return; }
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.day || 0) - (b.day || 0) || (a.order || 0) - (b.order || 0));
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

    const filtered = selectedDay === 0
      ? locations
      : locations.filter((l) => l.day === selectedDay);

    const latLngs = [];

    filtered.forEach((loc, idx) => {
      if (!loc.lat || !loc.lng) return;
      const lat = parseFloat(loc.lat);
      const lng = parseFloat(loc.lng);
      const color = DAY_COLORS[loc.day] || '#cc0000';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${color};
          width:28px;height:28px;border-radius:50%;
          border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:11px;font-weight:bold;
          font-family:monospace;
        ">${idx + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on('click', () => setPopup(loc));
      markerLayer.current.addLayer(marker);
      latLngs.push([lat, lng]);
    });

    // 自動調整視野
    if (selectedDay !== 0 && latLngs.length > 1 && leafletMap.current) {
      leafletMap.current.fitBounds(latLngs, { padding: [40, 40] });
    } else if (selectedDay !== 0 && latLngs.length === 1 && leafletMap.current) {
      leafletMap.current.setView(latLngs[0], 14);
    }
  }, [locations, selectedDay]);

  const maxDay  = locations.length ? Math.max(...locations.map((l) => l.day || 0)) : 0;
  const days    = Array.from({ length: maxDay }, (_, i) => i + 1);
  const visible = selectedDay === 0 ? locations : locations.filter((l) => l.day === selectedDay);

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

        {/* 日期篩選列 */}
        <div style={{
          display: 'flex', gap: 4, padding: '6px 8px',
          borderBottom: '1px solid #808080', backgroundColor: '#d4d0c8',
          flexWrap: 'wrap', alignItems: 'center',
        }}>
          <button
            className="win95-button"
            style={{
              fontSize: '0.8rem', padding: '2px 10px',
              backgroundColor: selectedDay === 0 ? '#000080' : undefined,
              color: selectedDay === 0 ? '#fff' : undefined,
            }}
            onClick={() => { setSelectedDay(0); setPopup(null); }}
          >全覽</button>
          {days.map((d) => (
            <button
              key={d}
              className="win95-button"
              style={{
                fontSize: '0.8rem', padding: '2px 10px',
                backgroundColor: selectedDay === d ? (DAY_COLORS[d] || '#000080') : undefined,
                color: selectedDay === d ? '#fff' : undefined,
              }}
              onClick={() => { setSelectedDay(d); setPopup(null); }}
            >Day {d}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#555' }}>
            共 {visible.length} 個地點
          </span>
        </div>

        {/* 地圖區域 */}
        <div style={{ position: 'relative', height: 380, flexShrink: 0 }}>
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

          {/* 地點彈出資訊卡 */}
          {popup && (
            <div
              style={{
                position: 'absolute', bottom: 12, left: '50%',
                transform: 'translateX(-50%)', width: 280, zIndex: 1000,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="win95-window" style={{ margin: 0 }}>
                <div
                  className="win95-title-bar"
                  style={{ backgroundColor: DAY_COLORS[popup.day] || '#000080' }}
                >
                  <span>Day {popup.day} — {popup.name}</span>
                  <div className="win95-title-buttons">
                    <div className="win95-btn" onClick={() => setPopup(null)}>X</div>
                  </div>
                </div>
                <div style={{ padding: '8px 12px', fontSize: '0.85rem', backgroundColor: 'white' }}>
                  {popup.description
                    ? <p style={{ margin: 0 }}>{popup.description}</p>
                    : <p style={{ margin: 0, color: '#888' }}>(尚無說明)</p>
                  }
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#555' }}>
                    📍 {parseFloat(popup.lat).toFixed(5)}, {parseFloat(popup.lng).toFixed(5)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 地點清單 */}
        <div style={{ maxHeight: 160, overflowY: 'auto', borderTop: '2px solid #808080' }}>
          {visible.length === 0 && (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', color: '#888' }}>
              {locations.length === 0
                ? '尚無地點，請在後台「地圖管理」新增。'
                : '此日無地點資料。'}
            </div>
          )}
          {visible.map((loc, idx) => (
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
                backgroundColor: DAY_COLORS[loc.day] || '#cc0000', color: '#fff',
              }}>{idx + 1}</span>
              <span style={{ color: '#555', fontSize: '0.75rem', minWidth: 42 }}>Day {loc.day}</span>
              <span style={{ fontWeight: 'bold', flexShrink: 0 }}>{loc.name}</span>
              {loc.description && (
                <span style={{
                  color: '#888', overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', fontSize: '0.78rem',
                }}>
                  {loc.description}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MapWindow;
