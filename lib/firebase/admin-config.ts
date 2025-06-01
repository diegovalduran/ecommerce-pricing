import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Settings } from 'firebase-admin/firestore';
import { CallOptions } from 'google-gax';

// Initialize Firebase Admin
const apps = getApps();

if (!apps.length) {
  // Add debug logging
  console.log('Admin Config:', {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.substring(0, 10) + '...',  // Log partial email for security
    hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY
  });

  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

// Configure Firestore with minimal settings
const settings: Settings = {
  ignoreUndefinedProperties: true,
  // Use GAX client settings to override internal defaults
  gaxOptions: {
    autoPaginate: false,
    maxResults: 1000,
    pageSize: 1000,  // Add explicit pageSize
    isBundling: false,
    timeout: 15000, // 15 seconds
    retry: {
      retryCodes: [4, 8, 13, 14], // Resource exhausted, deadline exceeded, etc.
      backoffSettings: {
        initialRetryDelayMillis: 100,
        retryDelayMultiplier: 1.3,
        maxRetryDelayMillis: 15000,
        initialRpcTimeoutMillis: 15000,
        rpcTimeoutMultiplier: 1,
        maxRpcTimeoutMillis: 15000,
        totalTimeoutMillis: 15000
      }
    }
  } as CallOptions
};

// Initialize Firestore with settings and export
export const adminDb = (() => {
  const db = getFirestore(getApps()[0]);
  db.settings(settings);
  console.log('Firestore settings applied:', settings);
  return db;
})();