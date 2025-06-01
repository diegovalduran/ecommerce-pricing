import { NextResponse } from 'next/server'
import { adminDb, getAllDocumentsAsync } from '@/lib/firebase/admin-config'

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const collectionName = params.name;
    const collectionRef = adminDb.collection(collectionName);
    
    // Get URL parameters for pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '100');
    const skip = (page - 1) * pageSize;

    // Use async iterator to get documents
    let totalProducts = 0;
    let lastUpdated = Date.now();
    let currentPage = 1;
    let currentSkip = 0;
    const products = [];

    const iterator = getAllDocumentsAsync(collectionRef, pageSize);
    for await (const doc of iterator) {
      totalProducts++;
      const data = doc.data();
      
      // Update lastUpdated timestamp
      if (data.scrapedAt) {
        const timestamp = new Date(data.scrapedAt).getTime();
        if (timestamp > lastUpdated) {
          lastUpdated = timestamp;
        }
      }

      // Handle pagination
      if (currentPage === page) {
        if (currentSkip < skip) {
          currentSkip++;
          continue;
        }
        if (products.length < pageSize) {
          products.push({
            id: doc.id,
            ...data
          });
        }
      } else if (currentSkip + products.length >= pageSize) {
        currentPage++;
        currentSkip = 0;
      }
    }

    const totalPages = Math.ceil(totalProducts / pageSize);

    return NextResponse.json({
      name: collectionName,
      totalProducts,
      lastUpdated,
      products,
      pagination: {
        currentPage: page,
        totalPages,
        pageSize,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching collection details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch collection details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 