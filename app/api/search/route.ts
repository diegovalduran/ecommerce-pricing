import { NextResponse } from 'next/server';
import { collection, getDocs, query, limit, orderBy, Firestore } from 'firebase/firestore';
import { db } from "@/lib/firebase/config";
import { findSimilarProducts, findSimilarProductsByImage } from '@/utils/text-similarity';
import { adminDb } from '@/lib/firebase/admin-config';

// Configure runtime for Vercel
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max execution time

const MAX_DOCS_PER_COLLECTION = 100; // Limit documents per collection
const BATCH_SIZE = 3; // Process collections in small batches

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
    console.log('Search API called');
    const body = await req.json();
    const { query: searchQuery, analyzedDescription, imageSearch, page = 1, pageSize = 20 } = body;
    console.log('Search query received:', searchQuery);
    console.log('Image search mode:', imageSearch ? 'Yes' : 'No');
    
    if (imageSearch && analyzedDescription) {
      console.log('Image analysis provided:', JSON.stringify(analyzedDescription, null, 2));
    }

    // Only require query if not doing an image search
    if (!imageSearch && !searchQuery) {
      console.log('Error: Search query is required for text search');
      return NextResponse.json({ 
        success: false, 
        error: 'Search query is required for text search' 
      }, { status: 400 });
    }

    // Get collections with their stats using absolute URL
    console.log('Fetching collections with stats...');
    const collectionsUrl = `${getBaseUrl()}/api/collections`;
    const collectionsResponse = await fetch(collectionsUrl);
    
    if (!collectionsResponse.ok) {
      console.error(`Failed to fetch collections: ${collectionsResponse.status}`);
      throw new Error(`Failed to fetch collections: ${collectionsResponse.status}`);
    }
    
    const collectionsData = await collectionsResponse.json();
    const collections: string[] = collectionsData.collections;
    const collectionStats = collectionsData.stats;
    console.log(`Found ${collections.length} collections`);

    let similarProducts = [];
    let allProducts = [];
    let isHybridSearch = false;
    
    // Process collections in smaller batches
    for (let i = 0; i < collections.length; i += BATCH_SIZE) {
      const batch = collections.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (collectionName: string) => {
        try {
          console.log(`Fetching from collection: ${collectionName}`);
          const q = query(
            collection(db, collectionName),
            orderBy('scrapedAt', 'desc'),
            limit(MAX_DOCS_PER_COLLECTION)
          );
          
          const querySnapshot = await getDocs(q);
          const products = querySnapshot.docs.map(doc => ({
            id: doc.id,
            collection: collectionName,
            ...doc.data()
          }));
          
          return products;
        } catch (error) {
          console.error(`Error fetching from ${collectionName}:`, error);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allProducts.push(...batchResults.flat());

      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < collections.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Total products found: ${allProducts.length}`);
    
    // Determine search strategy
    if (analyzedDescription && searchQuery && searchQuery !== "Image Search") {
      // Hybrid search - use both text and image
      isHybridSearch = true;
      console.log('Using hybrid text+image search');
      
      try {
        // Get text search results
        const textResults = findSimilarProducts(searchQuery, allProducts, 0.1);
        console.log(`Text search found ${textResults.length} results`);
        
        // Get image search results
        const inputProduct = {
          name: searchQuery,
          "analyzed description": analyzedDescription,
          color: analyzedDescription.color
        };
        
        const imageResults = await findSimilarProductsByImage(
          inputProduct,
          collections,
          adminDb, // Use adminDb instead of db for image search
          0.1
        );
        console.log(`Image search found ${imageResults.length} results`);
        
        // Combine results
        const combinedResults = [...textResults];
        
        // Add image results that aren't already in text results
        for (const imgResult of imageResults) {
          const existingIndex = combinedResults.findIndex(r => r.id === imgResult.id);
          
          if (existingIndex >= 0) {
            // Product exists in both searches, boost its score
            const textScore = combinedResults[existingIndex].score;
            const imageScore = imgResult.score;
            const inputType = analyzedDescription.type.toLowerCase();
            const productType = imgResult.matchDetails?.type?.toLowerCase() || '';
            
            let combinedScore;
            if (inputType.includes('shorts') && productType.includes('shorts')) {
              combinedScore = (textScore * 0.3) + (imageScore * 0.7);
            } else {
              combinedScore = (textScore * 0.4) + (imageScore * 0.6);
            }
            
            combinedResults[existingIndex].score = combinedScore;
            combinedResults[existingIndex].debug = {
              textScore,
              imageScore,
              combinedScore,
              combined: true
            };
            
            if (imgResult.matchDetails) {
              combinedResults[existingIndex].matchDetails = {
                ...combinedResults[existingIndex].matchDetails,
                imageMatch: imgResult.matchDetails
              };
            }
          } else {
            combinedResults.push(imgResult);
          }
        }
        
        // Sort by score
        combinedResults.sort((a, b) => b.score - a.score);
        similarProducts = combinedResults;
        
      } catch (error) {
        console.error('Error in hybrid search:', error);
        return NextResponse.json({ 
          success: false, 
          error: `Hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
      }
    } else if (analyzedDescription) {
      // Image-only search
      console.log('Using image-based similarity search only');
      
      try {
        const inputProduct = {
          name: searchQuery || "Image Search",
          "analyzed description": analyzedDescription
        };
        
        similarProducts = await findSimilarProductsByImage(
          inputProduct,
          collections,
          adminDb, // Use adminDb instead of db for image search
          0.1
        );
        
        console.log(`Image similarity search found ${similarProducts.length} products`);
        
      } catch (error) {
        console.error('Error in image similarity search:', error);
        return NextResponse.json({ 
          success: false, 
          error: `Image similarity search failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
      }
    } else {
      // Text-only search
      console.log('Using traditional text-based similarity search only');
      similarProducts = findSimilarProducts(searchQuery, allProducts);
      console.log(`Found ${similarProducts.length} products with similarity matches`);
    }

    // Apply pagination to similar products
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = similarProducts.slice(startIndex, endIndex);

    const response = {
      success: true,
      query: searchQuery || "Image Search",
      isImageSearch: !!imageSearch,
      isHybridSearch,
      searchType: isHybridSearch ? 'hybrid' : (analyzedDescription ? 'image-only' : 'text-only'),
      results: paginatedResults,
      totalResults: similarProducts.length,
      currentPage: page,
      totalPages: Math.ceil(similarProducts.length / pageSize),
      collectionStats,
      queryTime: performance.now() - startTime
    };
    
    console.log('Sending search response:', {
      success: response.success,
      query: response.query,
      searchType: response.searchType,
      resultsCount: response.results.length,
      totalResults: response.totalResults,
      currentPage: response.currentPage,
      totalPages: response.totalPages,
      queryTime: response.queryTime
    });
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed',
        queryTime: performance.now() - startTime
      },
      { status: 500 }
    );
  }
}
