import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase config - hardcoded for production deployment
// Firebase config - directly embedded for production
const firebaseConfig = {
  apiKey: "AIzaSyCZ4k4gT1d4v1hC4k4gT1d4v1hC4k4gT1d4",
  authDomain: "chatgen-38a7f.firebaseapp.com",
  projectId: "chatgen-38a7f",
  storageBucket: "chatgen-38a7f.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

// Check if all required config is present
const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error('Missing Firebase config keys:', missingKeys);
  console.error('Please check your environment variables');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence for better UX
setPersistence(auth, browserLocalPersistence).catch(console.error);
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence enabled in first tab only');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence');
  }
});