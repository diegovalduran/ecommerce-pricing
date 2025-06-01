import { NextResponse } from 'next/server'
import { adminDb, listCollectionsAsync, getAllDocumentsAsync } from '@/lib/firebase/admin-config'

// Helper function to get collection details with pagination and timeout
async function getCollectionDetails(name: string) {
  try {
    const collectionRef = adminDb.collection(name);
    let totalProducts = 0;
    let lastUpdated = Date.now();

    // Use async iterator to get documents
    const iterator = getAllDocumentsAsync(collectionRef);
    let count = 0;
    let lastDoc = null;

    for await (const doc of iterator) {
      count++;
      const data = doc.data();
      if (data.scrapedAt) {
        const timestamp = new Date(data.scrapedAt).getTime();
        if (timestamp > lastUpdated) {
          lastUpdated = timestamp;
        }
      }
      lastDoc = doc;
    }

    totalProducts = count;

    return {
      name,
      totalProducts,
      lastUpdated
    }
  } catch (error) {
    console.error(`Error fetching details for ${name}:`, error)
    return {
      name,
      totalProducts: 0,
      lastUpdated: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(request: Request) {
  try {
    // Get URL parameters for pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;

    // Get collections using async iterator
    const collections: string[] = [];
    const iterator = listCollectionsAsync(pageSize);
    let currentPage = 1;
    let currentSkip = 0;

    for await (const collection of iterator) {
      // Skip system collections
      if (["products", "Dashboard Inputs", "recent-scrapes", "batchJobs"].includes(collection.id)) {
        continue;
      }

      // Handle pagination
      if (currentPage === page) {
        if (currentSkip < skip) {
          currentSkip++;
          continue;
        }
        if (collections.length < pageSize) {
          collections.push(collection.id);
        }
      } else if (currentSkip + collections.length >= pageSize) {
        currentPage++;
        currentSkip = 0;
      }
    }

    // Get total count for pagination
    const allCollections: string[] = [];
    const countIterator = listCollectionsAsync();
    for await (const collection of countIterator) {
      if (!["products", "Dashboard Inputs", "recent-scrapes", "batchJobs"].includes(collection.id)) {
        allCollections.push(collection.id);
      }
    }

    const totalCollections = allCollections.length;
    const totalPages = Math.ceil(totalCollections / pageSize);

    // Process collections in smaller batches to prevent timeouts
    const BATCH_SIZE = 3; // Process 3 collections at a time
    const collectionDetails = [];
    
    for (let i = 0; i < collections.length; i += BATCH_SIZE) {
      const batch = collections.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(name => getCollectionDetails(name));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        collectionDetails.push(...batchResults);
      } catch (error) {
        console.error(`Error processing batch ${i/BATCH_SIZE + 1}:`, error);
        continue;
      }
      
      // Add a small delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < collections.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Set cache headers with longer duration
    const response = NextResponse.json({
      collections,
      details: collectionDetails,
      pagination: {
        currentPage: page,
        totalPages,
        totalCollections,
        pageSize,
        hasMore: page < totalPages
      }
    });

    // Cache for 10 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');

    return response;
  } catch (error) {
    console.error('Error in collections API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch collections',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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

    // Get all documents in the collection using async iterator
    const collectionRef = adminDb.collection(collectionName);
    const iterator = getAllDocumentsAsync(collectionRef);
    const deletePromises = [];

    for await (const doc of iterator) {
      deletePromises.push(doc.ref.delete());
    }
    
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