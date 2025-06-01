import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

// Helper function to get collection details with pagination and timeout
async function getCollectionDetails(name: string) {
  try {
    // Set a timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 60000); // 60 second timeout
    });

    // Get count with pagination
    const countPromise = adminDb.collection(name)
      .limit(1000)
      .count()
      .get();

    // Race between the operation and timeout
    const snapshot = await Promise.race([countPromise, timeoutPromise]) as any;
    const totalProducts = snapshot.data().count;

    // Get the most recent document with pagination
    const lastDocPromise = adminDb.collection(name)
      .orderBy('scrapedAt', 'desc')
      .limit(1)
      .get();

    const lastDoc = await Promise.race([lastDocPromise, timeoutPromise]) as any;
    const lastUpdated = lastDoc.empty ? Date.now() : 
      new Date(lastDoc.docs[0].data().scrapedAt).getTime();

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
      lastUpdated: Date.now()
    }
  }
}

export async function GET() {
  try {
    // Get all collections with pagination
    const collections = await adminDb.listCollections()
    const collectionNames = collections.map(col => col.id)
      .filter(name => name !== "products" && name !== "Dashboard Inputs" && name !== "recent-scrapes")

    // Process collections in smaller batches to prevent timeouts
    const BATCH_SIZE = 3 // Reduced from 5 to 3
    const collectionDetails = []
    
    for (let i = 0; i < collectionNames.length; i += BATCH_SIZE) {
      const batch = collectionNames.slice(i, i + BATCH_SIZE)
      
      // Add timeout for each batch
      const batchPromise = Promise.all(
        batch.map(name => getCollectionDetails(name))
      );
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Batch operation timed out')), 60000); // 60 second timeout per batch
      });

      try {
        const batchResults = await Promise.race([batchPromise, timeoutPromise]) as any[];
        collectionDetails.push(...batchResults);
      } catch (error) {
        console.error(`Error processing batch ${i/BATCH_SIZE + 1}:`, error);
        // Continue with next batch even if this one failed
        continue;
      }
      
      // Add a small delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < collectionNames.length) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Keep 200ms delay between batches
      }
    }

    // Set cache headers with longer duration
    const response = NextResponse.json({
      collections: collectionNames,
      details: collectionDetails
    })

    // Cache for 10 minutes (increased from 5)
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')

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