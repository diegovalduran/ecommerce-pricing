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

// Configure Firestore settings with more conservative values
const settings: Settings = {
  ignoreUndefinedProperties: true,
  // Set more conservative timeout and retry settings
  timeoutSeconds: 15, // Reduced from 30 to 15 seconds
  maxRetries: 2,      // Reduced from 3 to 2 retries
  // Explicitly disable auto-pagination and set pageSize to undefined
  autoPaginate: false,
  pageSize: undefined, // Explicitly set to undefined to prevent the warning
  // Add additional settings to prevent large result sets
  maxResults: 1000,   // Maximum number of results per query
  // Disable bundling to prevent large batch operations
  isBundling: false
};

// Export the Firestore admin instance with custom settings
export const adminDb = getFirestore(getApps()[0]);
adminDb.settings(settings);

// Log the settings for debugging
console.log('Firestore settings applied:', {
  timeoutSeconds: settings.timeoutSeconds,
  maxRetries: settings.maxRetries,
  autoPaginate: settings.autoPaginate,
  pageSize: settings.pageSize,
  maxResults: settings.maxResults,
  isBundling: settings.isBundling
});