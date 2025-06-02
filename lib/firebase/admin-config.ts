import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

export const adminDb = getFirestore(getApps()[0]);

// Helper function to get all documents from a collection as an async iterator
export async function* getAllDocumentsAsync(
  collectionRef: FirebaseFirestore.CollectionReference,
  batchSize: number = 100
) {
  let lastDoc = null;
  let hasMore = true;

  while (hasMore) {
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
      return;
    }

    for (const doc of snapshot.docs) {
      yield doc;
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.docs.length === batchSize;
  }
}