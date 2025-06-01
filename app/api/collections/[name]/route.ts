import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const collectionName = params.name
    
    // Get all documents in the collection
    const snapshot = await adminDb.collection(collectionName).get()
    
    // Get the total count
    const totalProducts = snapshot.size
    
    // Get the most recent document's timestamp
    let lastUpdated = Date.now()
    if (totalProducts > 0) {
      const timestamps = snapshot.docs.map(doc => {
        const data = doc.data()
        return data.scrapedAt ? new Date(data.scrapedAt).getTime() : 0
      })
      lastUpdated = Math.max(...timestamps)
    }
    
    return NextResponse.json({
      name: collectionName,
      totalProducts,
      lastUpdated
    })
  } catch (error) {
    console.error('Error fetching collection details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collection details' },
      { status: 500 }
    )
  }
} 