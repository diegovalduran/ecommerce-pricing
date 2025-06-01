import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Settings, CollectionReference, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Configure Firestore settings
const firestoreSettings: Settings = {
  ignoreUndefinedProperties: true,
  // Disable auto-pagination by default
  autoPaginate: false,
  // Set consistent page size
  pageSize: 100,
  // Configure timeout and retry settings
  timeout: 60000, // 60 seconds
  retry: {
    initialRetryDelayMillis: 1000,
    maxRetryDelayMillis: 60000,
    retryDelayMultiplier: 1.5,
    maxRetries: 3,
  },
};

// Initialize Firestore with settings
export const adminDb = getFirestore();
adminDb.settings(firestoreSettings);

// Helper function to list collections using async iterator
export async function* listCollectionsAsync(batchSize: number = 100) {
  let lastCollection: CollectionReference | null = null;
  
  while (true) {
    // Get all collections and handle pagination manually
    const collections = await adminDb.listCollections();
    const startIndex = lastCollection ? 
      collections.findIndex(c => c.id === lastCollection?.id) + 1 : 0;
    const batch = collections.slice(startIndex, startIndex + batchSize);
    
    if (batch.length === 0) break;
    
    for (const collection of batch) {
      yield collection;
      lastCollection = collection;
    }
    
    if (batch.length < batchSize) break;
  }
}

// Helper function to get all documents from a collection using async iterator
export async function* getAllDocumentsAsync<T = any>(
  collectionRef: CollectionReference,
  batchSize: number = 100
): AsyncGenerator<QueryDocumentSnapshot<T>> {
  let lastDoc: QueryDocumentSnapshot | null = null;
  
  while (true) {
    let query = collectionRef.limit(batchSize).orderBy('__name__');
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) break;
    
    for (const doc of snapshot.docs) {
      yield doc as QueryDocumentSnapshot<T>;
      lastDoc = doc;
    }
    
    if (snapshot.docs.length < batchSize) break;
  }
}

// Helper function to get collection names with pagination
export async function getCollectionNames(batchSize: number = 100): Promise<string[]> {
  const names: string[] = [];
  const iterator = listCollectionsAsync(batchSize);
  
  for await (const collection of iterator) {
    // Filter out system collections
    if (!["products", "Dashboard Inputs", "recent-scrapes", "batchJobs"].includes(collection.id)) {
      names.push(collection.id);
    }
  }
  
  return names;
}

// Override listCollections to use async iterator internally
const originalListCollections = adminDb.listCollections.bind(adminDb);
adminDb.listCollections = async function() {
  const collections: CollectionReference[] = [];
  const iterator = listCollectionsAsync(100);
  
  for await (const collection of iterator) {
    collections.push(collection);
  }
  
  return collections;
};

export default adminDb;