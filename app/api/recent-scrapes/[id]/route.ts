import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    const docRef = adminDb.collection('recent-scrapes').doc(params.id)
    await docRef.update(updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating scrape:', error)
    return NextResponse.json(
      { error: 'Failed to update scrape' },
      { status: 500 }
    )
  }
} 