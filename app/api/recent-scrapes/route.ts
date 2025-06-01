import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

// Get all recent scrapes
export async function GET() {
  try {
    const snapshot = await adminDb.collection('recent-scrapes')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get()

    const scrapes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({ scrapes })
  } catch (error) {
    console.error('Error fetching recent scrapes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent scrapes' },
      { status: 500 }
    )
  }
}

// Add a new scrape
export async function POST(request: Request) {
  try {
    const scrape = await request.json()
    const docRef = adminDb.collection('recent-scrapes').doc(scrape.id)
    await docRef.set(scrape)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding recent scrape:', error)
    return NextResponse.json(
      { error: 'Failed to add recent scrape' },
      { status: 500 }
    )
  }
}

// Clear all recent scrapes
export async function DELETE() {
  try {
    const snapshot = await adminDb.collection('recent-scrapes').get()
    const batch = adminDb.batch()
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    
    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing recent scrapes:', error)
    return NextResponse.json(
      { error: 'Failed to clear recent scrapes' },
      { status: 500 }
    )
  }
} 