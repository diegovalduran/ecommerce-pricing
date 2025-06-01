import { NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/utils/api-helpers';
import { adminDb } from "@/lib/firebase/admin-config";
import { findSimilarProductsByImage } from '@/utils/text-similarity';

export async function POST(req: Request) {
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
    
    // Get all collections
    console.log('Fetching available collections...');
    const collectionsResponse = await fetch(getApiUrl('collections'));
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
      totalResults: similarProducts.length
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 