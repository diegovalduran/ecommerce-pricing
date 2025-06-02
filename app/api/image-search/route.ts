import { NextResponse } from 'next/server';
import { adminDb } from "@/lib/firebase/admin-config";
import { findSimilarProductsByImage } from '@/utils/text-similarity';

// Configure runtime for Vercel
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max execution time

// Helper function to get the base URL
function getBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  return 'http://localhost:3000';
}

export async function POST(req: Request) {
  const startTime = performance.now();
  
  try {
    console.log('Image search API called');
    
    // Parse the request body
    const body = await req.json();
    const { productName, analyzedDescription, imageSearch } = body;
    
    if (!analyzedDescription) {
      return NextResponse.json({ 
        success: false, 
        error: 'Analyzed description is required' 
      }, { status: 400 });
    }
    
    console.log('Image search for product:', productName || 'Unnamed');
    console.log('Analyzed description:', JSON.stringify(analyzedDescription).substring(0, 200));
    
    // Get all collections using absolute URL
    console.log('Fetching available collections...');
    const collectionsUrl = `${getBaseUrl()}/api/collections`;
    const collectionsResponse = await fetch(collectionsUrl);
    
    if (!collectionsResponse.ok) {
      throw new Error(`Failed to fetch collections: ${collectionsResponse.status}`);
    }
    
    const collectionsData = await collectionsResponse.json();
    const collections = collectionsData.collections;
    console.log(`Found ${collections.length} collections`);
    
    // Prepare input product
    const inputProduct = {
      name: productName || "Image Search",
      "analyzed description": analyzedDescription
    };
    
    // Perform image similarity search using admin SDK
    console.log('Starting image similarity search...');
    const similarProducts = await findSimilarProductsByImage(
      inputProduct,
      collections,
      adminDb,
      0.1 // threshold
    );
    
    console.log(`Found ${similarProducts.length} similar products based on image`);
    
    // Get top results with scores
    const topResults = similarProducts.slice(0, 10);
    
    if (topResults.length > 0) {
      console.log('Top match:', {
        name: topResults[0].name,
        collection: topResults[0].collection,
        score: topResults[0].score
      });
    } else {
      console.log('No matches found');
    }
    
    const response = {
      success: true,
      query: productName || "Image Search",
      isImageSearch: true,
      results: topResults,
      totalResults: similarProducts.length,
      queryTime: performance.now() - startTime
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      queryTime: performance.now() - startTime
    }, { status: 500 });
  }
} 