import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log('FIREBASE apiKey existe?', !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
console.log('FIREBASE authDomain:', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || null);
console.log('FIREBASE projectId:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || null);
console.log('FIREBASE appId existe?', !!process.env.EXPO_PUBLIC_FIREBASE_APP_ID);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

console.log('Firebase app inicializada correctamente');
console.log('Firestore db inicializado correctamente');
