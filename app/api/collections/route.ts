import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

// Helper function to get collection details with pagination
async function getCollectionDetails(name: string) {
  try {
    // Get count with pagination
    const snapshot = await adminDb.collection(name)
      .limit(1000) // Limit to 1000 documents for count
      .count()
      .get()
    const totalProducts = snapshot.data().count

    // Get the most recent document with pagination
    const lastDoc = await adminDb.collection(name)
      .orderBy('scrapedAt', 'desc')
      .limit(1)
      .get()

    const lastUpdated = lastDoc.empty ? Date.now() : 
      new Date(lastDoc.docs[0].data().scrapedAt).getTime()

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

    // Process collections in batches to prevent timeouts
    const BATCH_SIZE = 5
    const collectionDetails = []
    
    for (let i = 0; i < collectionNames.length; i += BATCH_SIZE) {
      const batch = collectionNames.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(name => getCollectionDetails(name))
      )
      collectionDetails.push(...batchResults)
      
      // Add a small delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < collectionNames.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Set cache headers
    const response = NextResponse.json({
      collections: collectionNames,
      details: collectionDetails
    })

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

    return response
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
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