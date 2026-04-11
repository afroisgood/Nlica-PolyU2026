// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

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
