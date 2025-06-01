import { initializeApp, getApps } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  deleteDoc 
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };

// Interface for collection data
export interface CollectionData {
  name: string;
  brand: string;
  category: string;
  targetAudience: string;
  region: string;
  totalProducts: number;
  lastUpdated: number;
}

// Function to fetch all collections
export async function fetchCollections(): Promise<CollectionData[]> {
  try {
    const response = await fetch('/api/collections')
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.collections) {
      throw new Error('No collections data received')
    }

    return data.collections
  } catch (error) {
    console.error('Error fetching collections:', error)
    throw error
  }
}

// Function to fetch collection details
export async function fetchCollectionDetails(collectionName: string) {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    return {
      totalProducts: snapshot.size,
      lastUpdated: new Date().toISOString(),
      products: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
  } catch (error) {
    console.error('Error fetching collection details:', error);
    return null;
  }
}

// Function to delete a collection
export async function deleteCollection(collectionName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Get all documents in the collection
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)
    
    // Delete all documents in the collection
    const deletePromises = snapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    )
    
    await Promise.all(deletePromises)
    
    return {
      success: true,
      message: `Successfully deleted collection ${collectionName}`
    }
  } catch (error) {
    console.error('Error deleting collection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete collection'
    }
  }
}

// Function to create or update a collection
export async function createOrUpdateCollection(
  brand: string,
  targetAudience: string,
  category: string,
  region: string,
  productData: any
) {
  try {
    // Clean and format the collection name components
    const cleanString = (str: string) => {
      return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-') // Replace special characters with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    };

    // Create collection name using the convention, all lowercase
    const collectionName = [
      cleanString(brand),
      cleanString(targetAudience),
      cleanString(category),
      cleanString(region)
    ].join('-');
    
    // Reference to the collection
    const collectionRef = collection(db, collectionName);
    
    // Create a document with the product data
    // Using the product URL as the document ID to avoid duplicates
    const docRef = doc(collectionRef, productData.url);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Update existing document
      await setDoc(docRef, {
        ...productData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return { success: true, message: 'Product updated in collection' };
    } else {
      // Create new document
      await setDoc(docRef, {
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, message: 'Product added to collection' };
    }
  } catch (error) {
    console.error('Error creating/updating collection:', error);
    return { success: false, error: 'Failed to create/update collection' };
  }
} 