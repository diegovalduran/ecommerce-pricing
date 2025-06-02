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
  batchSize: number = 100  // Reduced from 65535 to a more reasonable default
) {
  // Create a query that will be used for pagination
  const baseQuery = collectionRef.orderBy('__name__');
  let lastDoc = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  while (true) {
    try {
      // Create a new query for each batch
      let query = baseQuery.limit(batchSize);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      // Get the next batch of documents
      const snapshot = await query.get();
      
      // If no documents were returned, we're done
      if (snapshot.empty) {
        break;
      }

      // Yield each document in the batch
      for (const doc of snapshot.docs) {
        yield doc;
      }

      // Update the last document for the next iteration
      lastDoc = snapshot.docs[snapshot.docs.length - 1];

      // If we got fewer documents than the batch size, we're done
      if (snapshot.docs.length < batchSize) {
        break;
      }

      // Reset retry count on successful request
      retryCount = 0;

    } catch (error) {
      // Handle quota exceeded errors
      if (error instanceof Error && 
          (error.message.includes('RESOURCE_EXHAUSTED') || 
           error.message.includes('quota exceeded'))) {
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Quota exceeded, retrying in ${RETRY_DELAY}ms (attempt ${retryCount}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
          continue;
        }
      }
      
      // If we've exhausted retries or it's a different error, throw it
      throw error;
    }
  }
}