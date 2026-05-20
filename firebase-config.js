// ── NORECO I ElectService — Firebase Configuration ──────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAnalytics }  from "https://www.gstatic.com/firebasejs/10.11.0/firebase-analytics.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,              // ✅ ADD THIS
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDPPwgh3PNlRRrH4v-pF7Q1wg0j6ed0DS8",
  authDomain:        "noreco-ecms.firebaseapp.com",
  projectId:         "noreco-ecms",
  storageBucket:     "noreco-ecms.firebasestorage.app",
  messagingSenderId: "30173895987",
  appId:             "1:30173895987:web:f6fc6220ae07e42821b246",
  measurementId:     "G-HWDBBKGG1Y"
};

const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth      = getAuth(app);
const db        = getFirestore(app);
const storage   = getStorage(app);

export {
  app, analytics, auth, db, storage,

  // Auth helpers
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,

  // Firestore helpers
  collection,
  deleteDoc,
  addDoc,
  getDocs,
  getDoc,            // ✅ ADD THIS
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,

  // Storage helpers
  ref,
  uploadBytes,
  getDownloadURL
};