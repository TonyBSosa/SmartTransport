import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB2RkaU2hhvtDXT_c8Pfv1tDDjJyw7L6II",
  authDomain: "transport-5fb0b.firebaseapp.com",
  projectId: "transport-5fb0b",
  storageBucket: "transport-5fb0b.firebasestorage.app",
  messagingSenderId: "64170850379",
  appId: "1:64170850379:web:634b9b8f6232dbc057f5ce",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
