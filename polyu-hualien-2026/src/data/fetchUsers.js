// src/data/fetchUsers.js
// Sheet 1：成員名單（accessCode, name, group, avatarUrl）
// Sheet 2：組別資訊（group, factionTitle, mentor, location, mainQuest, gear, groupSize）
// 程式依 group 名稱自動合併兩張表

const MEMBERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfw6pbDCrfneeWprwR2TdLYll7OXvDhE96zy1k-v1JWb7JNePJYsbS4nAa5WP0wVOZFEZFsJN60nR/pub?output=csv';

const GROUPS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQXfw6pbDCrfneeWprwR2TdLYll7OXvDhE96zy1k-v1JWb7JNePJYsbS4nAa5WP0wVOZFEZFsJN60nR/pub?gid=912908446&single=true&output=csv';

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

export async function fetchUsers() {
  const [membersRes, groupsRes] = await Promise.all([
    fetch(MEMBERS_CSV_URL),
    fetch(GROUPS_CSV_URL),
  ]);
  if (!membersRes.ok || !groupsRes.ok) throw new Error('無法讀取名單，請稍後再試。');

  const [membersText, groupsText] = await Promise.all([
    membersRes.text(),
    groupsRes.text(),
  ]);

  const members = parseCSV(membersText);
  const groups = parseCSV(groupsText);

  // 以 group 名稱建立組別查詢表
  const groupMap = {};
  for (const g of groups) {
    if (g.group) groupMap[g.group] = g;
  }

  // 合併成員與組別資料
  const db = {};
  for (const member of members) {
    if (!member.accessCode) continue;
    const groupInfo = groupMap[member.group] || {};
    db[member.accessCode] = {
      name: member.name || '',
      group: member.group || '',
      avatarUrl: member.avatarUrl || '',
      factionTitle: groupInfo.factionTitle || '',
      mentor: groupInfo.mentor || '',
      location: groupInfo.location || '',
      mainQuest: groupInfo.mainQuest || '',
      gear: groupInfo.gear || '',
      groupSize: groupInfo.groupSize || '',
    };
  }
  return db;
}
