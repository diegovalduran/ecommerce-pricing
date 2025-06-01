import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

// Cache for collection counts and last updated times
const collectionCache = new Map<string, { totalProducts: number; lastUpdated: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const BATCH_SIZE = 3; // Process 3 collections at a time
const BATCH_DELAY = 2000; // 2 seconds delay between batches

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to process collections in batches
async function processBatch(collections: string[], startIndex: number) {
  const batch = collections.slice(startIndex, startIndex + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(async (name) => {
      try {
        // Check cache first
        const cached = collectionCache.get(name);
        const now = Date.now();
        if (cached && (now - cached.lastUpdated) < CACHE_TTL) {
          console.log(`Using cached data for ${name}`);
          return {
            name,
            ...cached
          };
        }

        // If not in cache or expired, fetch new data
        console.log(`Fetching fresh data for ${name}`);
        
        // Get collection reference
        const collectionRef = adminDb.collection(name);
        
        // Get a sample of documents to estimate size and last update
        const sampleQuery = await collectionRef
          .orderBy('scrapedAt', 'desc')
          .limit(1)
          .get();

        // If we have documents, use the first one's timestamp
        const lastUpdated = sampleQuery.empty ? now : 
          new Date(sampleQuery.docs[0].data().scrapedAt).getTime();

        // Estimate total products using a limit query
        // This is more efficient than count() for large collections
        const estimateQuery = await collectionRef
          .limit(1000)
          .get();
        
        const totalProducts = estimateQuery.size >= 1000 ? 
          '1000+' : // If we hit the limit, indicate it's at least 1000
          estimateQuery.size;

        // Update cache
        collectionCache.set(name, {
          totalProducts: typeof totalProducts === 'number' ? totalProducts : 1000,
          lastUpdated
        });

        return {
          name,
          totalProducts,
          lastUpdated
        };
      } catch (error) {
        console.error(`Error fetching details for ${name}:`, error);
        // If we hit quota, try to use cached data even if expired
        const cached = collectionCache.get(name);
        if (cached) {
          console.log(`Using expired cache for ${name} due to error`);
          return {
            name,
            ...cached
          };
        }
        return {
          name,
          totalProducts: 0,
          lastUpdated: Date.now()
        };
      }
    })
  );
  return results;
}

export async function GET(request: Request) {
  try {
    // Get all collections
    const collections = await adminDb.listCollections();
    const collectionNames = collections.map(col => col.id)
      .filter(name => name !== "products" && name !== "Dashboard Inputs" && name !== "recent-scrapes");

    // Process collections in batches
    const allResults = [];
    for (let i = 0; i < collectionNames.length; i += BATCH_SIZE) {
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(collectionNames.length/BATCH_SIZE)}`);
      const batchResults = await processBatch(collectionNames, i);
      allResults.push(...batchResults);
      
      // Add delay between batches if not the last batch
      if (i + BATCH_SIZE < collectionNames.length) {
        await delay(BATCH_DELAY);
      }
    }

    // Sort collections by last updated time
    const sortedCollections = allResults.sort((a, b) => b.lastUpdated - a.lastUpdated);

    return NextResponse.json({
      collections: sortedCollections,
      cacheInfo: {
        totalCached: collectionCache.size,
        ttl: CACHE_TTL
      }
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { collectionName } = await request.json();
    
    if (!collectionName) {
      return Response.json({ 
        error: 'Collection name is required',
        status: 'error'
      }, { 
        status: 400 
      });
    }

    // Get all documents in the collection
    const collectionRef = adminDb.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    // Delete all documents in the collection
    const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    return Response.json({ 
      message: `Successfully deleted collection ${collectionName}`,
      status: 'success'
    });

  } catch (error) {
    console.error('Error deleting collection:', error);
    
    return Response.json({ 
      error: 'Failed to delete collection',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { 
      status: 500 
    });
  }
}