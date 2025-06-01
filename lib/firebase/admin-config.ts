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
    pageSize: 1000,
    isBundling: false,
    timeout: 30000, // 30 seconds
    retry: {
      retryCodes: [4, 8, 13, 14], // Resource exhausted, deadline exceeded, etc.
      backoffSettings: {
        initialRetryDelayMillis: 100,
        retryDelayMultiplier: 1.3,
        maxRetryDelayMillis: 30000,
        initialRpcTimeoutMillis: 30000,
        rpcTimeoutMultiplier: 1,
        maxRpcTimeoutMillis: 30000,
        totalTimeoutMillis: 30000
      }
    }
  } as CallOptions,
  // Add explicit call settings to override defaults
  callSettings: {
    autoPaginate: false,
    pageSize: 1000,
    maxResults: 1000,
    timeout: 30000,
    retry: {
      retryCodes: [4, 8, 13, 14],
      backoffSettings: {
        initialRetryDelayMillis: 100,
        retryDelayMultiplier: 1.3,
        maxRetryDelayMillis: 30000,
        initialRpcTimeoutMillis: 30000,
        rpcTimeoutMultiplier: 1,
        maxRpcTimeoutMillis: 30000,
        totalTimeoutMillis: 30000
      }
    }
  },
  // Add explicit listCollections settings
  listCollectionsSettings: {
    autoPaginate: false,
    pageSize: 100,
    maxResults: 100,
    timeout: 30000
  }
};

// Initialize Firestore with settings and export
export const adminDb = (() => {
  const db = getFirestore(getApps()[0]);
  
  // Apply settings and log them
  db.settings(settings);
  console.log('Firestore settings applied:', JSON.stringify(settings, null, 2));
  
  // Override listCollections to ensure pagination
  const originalListCollections = db.listCollections.bind(db);
  db.listCollections = async function() {
    const collections = await originalListCollections();
    // Force pagination by limiting to 100 collections at a time
    return collections.slice(0, 100);
  };
  
  return db;
})();