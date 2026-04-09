// src/data/fetchUsers.js
// 從 Google Sheets 公開 CSV 讀取組員資料，轉換成與 users.json 相同的結構

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfw6pbDCrfneeWprwR2TdLYll7OXvDhE96zy1k-v1JWb7JNePJYsbS4nAa5WP0wVOZFEZFsJN60nR/pub?output=csv';

// 簡易 CSV 解析（支援引號內含逗號的欄位）
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });
      rows.push(row);
    }
  }
  return rows;
}

// 回傳 { [accessCode]: { group, factionTitle, ... } } 格式
export async function fetchUsers() {
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) throw new Error('無法讀取名單，請稍後再試。');
  const text = await res.text();
  const rows = parseCSV(text);
  const db = {};
  for (const row of rows) {
    if (row.accessCode) {
      db[row.accessCode] = {
        name: row.name || '',
        group: row.group,
        factionTitle: row.factionTitle,
        mentor: row.mentor,
        location: row.location,
        mainQuest: row.mainQuest,
        gear: row.gear,
        groupSize: row.groupSize,
        avatarUrl: row.avatarUrl || '',
      };
    }
  }
  return db;
}
