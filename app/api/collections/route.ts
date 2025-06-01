import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

export async function GET() {
  try {
    // Get all collections
    const collections = await adminDb.listCollections()
    const collectionNames = collections.map(col => col.id)
      .filter(name => name !== "products" && name !== "Dashboard Inputs" && name !== "recent-scrapes")

    // Get counts for all collections in parallel
    const collectionDetails = await Promise.all(
      collectionNames.map(async (name) => {
        try {
          const snapshot = await adminDb.collection(name).count().get()
          const totalProducts = snapshot.data().count

          // Get the most recent document
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
      })
    )

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