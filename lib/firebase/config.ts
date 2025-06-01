// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Configure Firestore with pagination settings
const db = getFirestore(app);
db.settings({
  cacheSizeBytes: 50 * 1024 * 1024, // 50 MB cache
  experimentalForceLongPolling: true, // Use long polling for better reliability
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
  // Add pagination settings
  experimentalForcePagination: true,
  experimentalMaxBatchSize: 1000
});

const storage = getStorage(app);

export { db, storage };