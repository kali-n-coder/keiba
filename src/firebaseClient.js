import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { firebaseConfig, hasFirebaseConfig } from './firebaseConfig.js';

export const firebaseReady = hasFirebaseConfig();
export const app = firebaseReady ? initializeApp(firebaseConfig) : null;
export const db = firebaseReady ? getFirestore(app) : null;

export {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
};
