import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Settings } from 'firebase-admin/firestore';

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

// Configure Firestore settings
const settings: Settings = {
  ignoreUndefinedProperties: true,
  timeoutSeconds: 15,
  maxRetries: 2,
  // Only set autoPaginate to false, remove all other pagination-related settings
  autoPaginate: false
};

// Export the Firestore admin instance with custom settings
export const adminDb = getFirestore(getApps()[0]);
adminDb.settings(settings);

// Log the settings for debugging
console.log('Firestore settings applied:', settings);