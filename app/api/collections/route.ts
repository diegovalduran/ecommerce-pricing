import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

// Cache for collection counts and last updated times
const collectionCache = new Map<string, { totalProducts: number; lastUpdated: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET(request: Request) {
  try {
    // Get all collections
    const collections = await adminDb.listCollections()
    const collectionNames = collections.map(col => col.id)
      .filter(name => name !== "products" && name !== "Dashboard Inputs" && name !== "recent-scrapes")

    // Get counts for all collections in parallel
    const collectionDetails = await Promise.all(
      collectionNames.map(async (name) => {
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
          
          // Get the count first (single operation)
          const snapshot = await adminDb.collection(name).count().get()
          const totalProducts = snapshot.data().count

          // Get the most recent document
          const lastDoc = await adminDb.collection(name)
            .orderBy('scrapedAt', 'desc')
            .limit(1)
            .get()

          const lastUpdated = lastDoc.empty ? now : 
            new Date(lastDoc.docs[0].data().scrapedAt).getTime()

          // Update cache
          collectionCache.set(name, {
            totalProducts,
            lastUpdated
          });

          return {
            name,
            totalProducts,
            lastUpdated
          }
        } catch (error) {
          console.error(`Error fetching details for ${name}:`, error)
          // If we hit quota, return cached data even if expired
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
          }
        }
      })
    )

    // Set cache headers
    const response = NextResponse.json({
      collections: collectionNames,
      details: collectionDetails,
      cacheInfo: {
        cachedCollections: collectionCache.size,
        cacheTTL: CACHE_TTL
      }
    })

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

    return response
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
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