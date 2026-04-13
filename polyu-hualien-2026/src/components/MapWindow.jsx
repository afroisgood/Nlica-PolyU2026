// src/components/MapWindow.jsx
// 互動地圖視窗：從 Firebase 讀取地點，使用 Google Maps JavaScript API 顯示

import { useState, useEffect, useRef } from 'react';
import { ref as dbRef, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DAY_COLORS = {
  1: '#cc0000',
  2: '#0044cc',
  3: '#007700',
  4: '#cc6600',
  5: '#7700bb',
  6: '#00888a',
  7: '#884400',
};

const HUALIEN_CENTER = { lat: 23.75, lng: 121.52 };

function MapWindow({ onClose }) {
  const mapDivRef  = useRef(null);
  const googleMap  = useRef(null);
  const markers    = useRef([]);
  const [locations, setLocations]   = useState([]);
  const [selectedDay, setSelectedDay] = useState(0); // 0 = 全覽
  const [popup, setPopup]           = useState(null);
  const [mapLoaded, setMapLoaded]   = useState(false);

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

  // ── 載入 Google Maps JS API ───────────────────────────────────
  useEffect(() => {
    if (!API_KEY) return;
    if (window.google?.maps) { setMapLoaded(true); return; }
    if (document.getElementById('gmaps-script')) {
      // 已在載入中，等待 callback
      window.__gmapsOnLoad = window.__gmapsOnLoad || [];
      window.__gmapsOnLoad.push(() => setMapLoaded(true));
      return;
    }
    window.__gmapsCallback = () => {
      setMapLoaded(true);
      (window.__gmapsOnLoad || []).forEach((fn) => fn());
    };
    const script = document.createElement('script');
    script.id  = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=__gmapsCallback`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // ── 初始化地圖 ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapDivRef.current || googleMap.current) return;
    googleMap.current = new window.google.maps.Map(mapDivRef.current, {
      center: HUALIEN_CENTER,
      zoom: 10,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_BOTTOM },
    });
  }, [mapLoaded]);

  // ── 更新標記 ──────────────────────────────────────────────────
  useEffect(() => {
    if (!googleMap.current || !mapLoaded) return;

    // 清除舊標記
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];

    const filtered = selectedDay === 0
      ? locations
      : locations.filter((l) => l.day === selectedDay);

    filtered.forEach((loc, idx) => {
      if (!loc.lat || !loc.lng) return;
      const color = DAY_COLORS[loc.day] || '#cc0000';
      const marker = new window.google.maps.Marker({
        position: { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) },
        map: googleMap.current,
        title: loc.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 13,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        label: {
          text: String(idx + 1),
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold',
        },
        zIndex: idx,
      });
      marker.addListener('click', () => {
        setPopup(loc);
        googleMap.current.panTo({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) });
      });
      markers.current.push(marker);
    });

    // 自動調整視野（篩選特定日時）
    if (selectedDay !== 0 && filtered.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      filtered.forEach((l) => {
        if (l.lat && l.lng) bounds.extend({ lat: parseFloat(l.lat), lng: parseFloat(l.lng) });
      });
      googleMap.current.fitBounds(bounds, 60);
    } else if (selectedDay === 0 && locations.length === 0) {
      googleMap.current.setCenter(HUALIEN_CENTER);
      googleMap.current.setZoom(10);
    }
  }, [locations, selectedDay, mapLoaded]);

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
          borderBottom: '1px solid #808080', backgroundColor: '#d4d0c8', flexWrap: 'wrap',
          alignItems: 'center',
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
        <div style={{ position: 'relative', height: 380, backgroundColor: '#c8d8c8', flexShrink: 0 }}>
          {/* 未設定 API Key */}
          {!API_KEY && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#555' }}>
              <div style={{ fontSize: '2.5rem' }}>🗺️</div>
              <div style={{ fontWeight: 'bold' }}>尚未設定 Google Maps API Key</div>
              <div style={{ fontSize: '0.8rem', color: '#888', textAlign: 'center', maxWidth: 300 }}>
                請在專案根目錄的 <code>.env</code> 檔案中加入：<br />
                <code style={{ backgroundColor: '#eee', padding: '2px 6px', fontFamily: 'monospace' }}>VITE_GOOGLE_MAPS_API_KEY=你的金鑰</code>
              </div>
            </div>
          )}

          {/* 載入中 */}
          {API_KEY && !mapLoaded && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', gap: 8 }}>
              <span>🗺️</span> 地圖載入中...
            </div>
          )}

          {/* Google Maps 容器 */}
          <div
            ref={mapDivRef}
            style={{ width: '100%', height: '100%', visibility: mapLoaded ? 'visible' : 'hidden' }}
          />

          {/* 地點彈出資訊卡 */}
          {popup && (
            <div
              style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', width: 280, zIndex: 10 }}
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
                if (googleMap.current && loc.lat && loc.lng) {
                  googleMap.current.panTo({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) });
                  googleMap.current.setZoom(14);
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
                <span style={{ color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
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
