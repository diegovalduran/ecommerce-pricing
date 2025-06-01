import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

const PAGE_SIZE = 20; // Default page size for paginated requests

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usePagination = searchParams.get('paginate') !== 'false'; // Default to true
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(Number(searchParams.get('pageSize')) || PAGE_SIZE, 50); // Cap at 50

    // Get all collections
    const allCollections = await adminDb.listCollections();
    
    // Filter out system collections
    const filteredCollections = allCollections
      .map(col => col.id)
      .filter(name => !["products", "Dashboard Inputs", "recent-scrapes"].includes(name));

    // Get the collections to process based on pagination setting
    const collectionNames = usePagination 
      ? filteredCollections.slice((page - 1) * pageSize, page * pageSize)
      : filteredCollections;

    // Get counts for collections in parallel with a smaller batch size
    const BATCH_SIZE = usePagination ? 5 : 10; // Larger batch size for non-paginated requests
    const collectionDetails = [];
    
    for (let i = 0; i < collectionNames.length; i += BATCH_SIZE) {
      const batch = collectionNames.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (name) => {
        try {
          // Use a more efficient count query
          const snapshot = await adminDb.collection(name)
            .limit(1000) // Limit the count to prevent timeouts
            .count()
            .get();

          const totalProducts = snapshot.data().count;

          // Get the most recent document with a limit
          const lastDoc = await adminDb.collection(name)
            .orderBy('scrapedAt', 'desc')
            .limit(1)
            .get();

          const lastUpdated = lastDoc.empty ? Date.now() : 
            new Date(lastDoc.docs[0].data().scrapedAt).getTime();

          return {
            name,
            totalProducts,
            lastUpdated
          };
        } catch (error) {
          console.error(`Error fetching details for ${name}:`, error);
          return {
            name,
            totalProducts: 0,
            lastUpdated: Date.now()
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      collectionDetails.push(...batchResults);
    }

    // Set cache headers with a shorter duration
    const response = NextResponse.json({
      collections: collectionNames,
      details: collectionDetails,
      ...(usePagination && {
        pagination: {
          currentPage: page,
          pageSize,
          totalCollections: filteredCollections.length,
          totalPages: Math.ceil(filteredCollections.length / pageSize),
          hasMore: page * pageSize < filteredCollections.length
        }
      })
    });

    // Cache for 1 minute
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return response;
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections', details: error instanceof Error ? error.message : 'Unknown error' },
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