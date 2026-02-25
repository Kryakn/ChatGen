import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase config - hardcoded for production deployment
// Firebase config - directly embedded for production
const firebaseConfig = {
  apiKey: "AIzaSyDjxi_WZ8BXZqo6meuT4miL5M33GORw3jE",
  authDomain: "chatgen-38a7f.firebaseapp.com",
  projectId: "chatgen-38a7f",
  storageBucket: "chatgen-38a7f.firebasestorage.app",
  messagingSenderId: "152767825787",
  appId: "1:152767825787:web:8eab8f9a6a8cc95f5d5fde"
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