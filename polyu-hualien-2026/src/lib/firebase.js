// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBX0jSPJ8XqyE1Fc5qzfNk1DLpGTdU5mv4',
  authDomain: 'polyu-hualien-2026.firebaseapp.com',
  databaseURL: 'https://polyu-hualien-2026-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'polyu-hualien-2026',
  storageBucket: 'polyu-hualien-2026.firebasestorage.app',
  messagingSenderId: '128419040060',
  appId: '1:128419040060:web:1da4cccf5c39322e8dac39',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// customCodes: { [originalCode]: customCode }
export async function fetchCustomCodes() {
  const snap = await get(ref(db, 'customCodes'));
  return snap.val() || {};
}

export async function setCustomCode(originalCode, customCode) {
  await set(ref(db, `customCodes/${originalCode}`), customCode);
}

export async function resetCustomCode(originalCode) {
  await remove(ref(db, `customCodes/${originalCode}`));
}
