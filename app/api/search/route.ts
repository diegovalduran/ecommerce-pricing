import { NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/utils/api-helpers';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "@/lib/firebase/config";
import { findSimilarProducts, findSimilarProductsByImage } from '@/utils/text-similarity';

export async function POST(req: Request) {
  try {
    console.log('Search API called');
    // Parse the search query from request body
    const body = await req.json();
    const { query, analyzedDescription, imageSearch } = body;
    console.log('Search query received:', query);
    console.log('Image search mode:', imageSearch ? 'Yes' : 'No');
    
    if (imageSearch && analyzedDescription) {
      console.log('Image analysis provided:', JSON.stringify(analyzedDescription, null, 2));
    }

    // Only require query if not doing an image search
    if (!imageSearch && !query) {
      console.log('Error: Search query is required for text search');
      return NextResponse.json({ 
        success: false, 
        error: 'Search query is required for text search' 
      }, { status: 400 });
    }

    // Get all collections first
    console.log('Fetching available collections...');
    const collectionsResponse = await fetch(getApiUrl('collections', req));
    if (!collectionsResponse.ok) {
      console.error(`Failed to fetch collections: ${collectionsResponse.status}`);
      throw new Error(`Failed to fetch collections: ${collectionsResponse.status}`);
    }
    
    const collectionsData = await collectionsResponse.json();
    const collections = collectionsData.collections;
    console.log(`Found ${collections.length} collections:`, collections);

    let similarProducts = [];
    let allProducts = [];
    let collectionStats: Record<string, number | string> = {};
    let isHybridSearch = false;
    
    // Fetch products from all collections first (needed for both search types)
    console.log('Starting to fetch from collections...');
    
    for (const collectionName of collections) {
      try {
        console.log(`Fetching from collection: ${collectionName}`);
        const querySnapshot = await getDocs(collection(db, collectionName));
        const products = querySnapshot.docs.map(doc => ({
          id: doc.id,
          collection: collectionName,
          ...doc.data()
        }));
        
        collectionStats[collectionName] = products.length;
        allProducts.push(...products);
        console.log(`Found ${products.length} products in ${collectionName}`);
      } catch (error) {
        console.error(`Error fetching from ${collectionName}:`, error);
        collectionStats[collectionName] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
    
    console.log('Collection stats:', collectionStats);
    console.log(`Total products found: ${allProducts.length}`);
    
    // Determine search strategy:
    // 1. Image-only search: imageSearch=true and analyzedDescription exists, but no query
    // 2. Text-only search: No analyzedDescription, but query exists
    // 3. Hybrid search: Both analyzedDescription and query exist
    
    if (analyzedDescription && query && query !== "Image Search") {
      // Hybrid search - use both text and image
      isHybridSearch = true;
      console.log('Using hybrid text+image search');
      
      try {
        // Get text search results
        console.log(`Running text similarity search for query: "${query}" on ${allProducts.length} products`);
        const textResults = findSimilarProducts(query, allProducts, 0.1);
        console.log(`Text search found ${textResults.length} results`);
        
        // Get image search results
        const inputProduct = {
          name: query,
          "analyzed description": analyzedDescription,
          color: analyzedDescription.color // Pass color if available
        };
        
        console.log('Input product for image search:', JSON.stringify(inputProduct, null, 2));
        
        const imageResults = await findSimilarProductsByImage(
          inputProduct,
          collections,
          db,
          0.1
        );
        console.log(`Image search found ${imageResults.length} results`);
        
        // Combine results, giving priority to items that appear in both searches
        const combinedResults = [...textResults];
        
        // Add image results that aren't already in text results
        for (const imgResult of imageResults) {
          const existingIndex = combinedResults.findIndex(r => r.id === imgResult.id);
          
          if (existingIndex >= 0) {
            // Product exists in both searches, boost its score
            // Give more weight to image search for clothing type matching
            const textScore = combinedResults[existingIndex].score;
            const imageScore = imgResult.score;
            
            // Check if the product types match
            const inputType = analyzedDescription.type.toLowerCase();
            const productType = imgResult.matchDetails?.type?.toLowerCase() || '';
            
            let combinedScore;
            if (inputType.includes('shorts') && productType.includes('shorts')) {
              // If both are shorts, heavily favor the image match
              console.log(`Type match found for shorts: ${imgResult.name}`);
              combinedScore = (textScore * 0.3) + (imageScore * 0.7);
            } else {
              // Default weighting
              combinedScore = (textScore * 0.4) + (imageScore * 0.6);
            }
            
            combinedResults[existingIndex].score = combinedScore;
            
            // Add debug info
            combinedResults[existingIndex].debug = {
              textScore: textScore,
              imageScore: imageScore,
              combinedScore: combinedScore,
              combined: true
            };
            
            // Add match details from image search
            if (imgResult.matchDetails) {
              combinedResults[existingIndex].matchDetails = {
                ...combinedResults[existingIndex].matchDetails,
                imageMatch: imgResult.matchDetails
              };
            }
          } else {
            // Product only in image results, add it
            combinedResults.push(imgResult);
          }
        }
        
        // Sort by score
        combinedResults.sort((a, b) => b.score - a.score);
        
        // Additional logging for debugging
        console.log("Top 5 combined results:");
        combinedResults.slice(0, 5).forEach((result, index) => {
          console.log(`${index + 1}. ${result.name} (${result.collection || 'unknown'}) - Score: ${result.score.toFixed(2)}`);
          if (result.debug) {
            console.log(`   Text: ${result.debug.textScore?.toFixed(2) || 'N/A'}, Image: ${result.debug.imageScore?.toFixed(2) || 'N/A'}`);
          }
          if (result.matchDetails) {
            console.log(`   Type: ${result.matchDetails.type}, Genre: ${result.matchDetails.genre}`);
          }
        });
        
        console.log(`Hybrid search found ${combinedResults.length} products`);
        similarProducts = combinedResults;
      } catch (error) {
        console.error('Error in hybrid search:', error);
        return NextResponse.json({ 
          success: false, 
          error: `Hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
      }
    } else if (analyzedDescription && (imageSearch || !query || query === "Image Search")) {
      // Image-only search
      console.log('Using image-based similarity search only');
      
      try {
        // Prepare input product with analyzed description
        const inputProduct = {
          name: query || "Image Search", // Use default name if no query provided
          "analyzed description": analyzedDescription
        };
        
        console.log('Input product for image search:', JSON.stringify(inputProduct, null, 2));
        
        // Call the image-based similarity search
        similarProducts = await findSimilarProductsByImage(
          inputProduct,
          collections,
          db,
          0.1 // similarity threshold
        );
        
        console.log(`Image similarity search found ${similarProducts.length} products`);
        
        // Process image search results for dashboard display
        const processedResults = similarProducts.map(product => ({
          id: product.id,
          name: product.name,
          collection: product.collection,
          score: product.score,
          matchDetails: product.matchDetails,
          price: product.price,
          store: product.store,
          url: product.url,
          "analyzed description": product["analyzed description"]
        }));
        
        similarProducts = processedResults;
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
      
      // Find similar products using text similarity
      console.log(`Running text similarity search for query: "${query}" on ${allProducts.length} products`);
      similarProducts = findSimilarProducts(query, allProducts);
      console.log(`Found ${similarProducts.length} products with similarity matches`);
    }

    // Get top 10 results with scores
    const topResults = similarProducts
      .slice(0, 10)
      .map(product => ({
        ...product,
        matchDetails: product.matchDetails || ('debug' in product ? (product as any).debug : undefined) // Include the match details
      })) as Array<{
        id: string;
        name: string;
        collection: string;
        score: number;
        matchDetails: any;
        price?: any;
        store?: any;
        url?: string;
        "analyzed description"?: any;
      }>;
    
    console.log(`Top result similarity score: ${topResults.length > 0 ? topResults[0].score : 'N/A'}`);
    if (topResults.length > 0) {
      console.log('Top match details:', {
        name: topResults[0].name,
        collection: topResults[0].collection,
        score: topResults[0].score,
        matchDetails: topResults[0].matchDetails
      });  
    }

    const response = {
      success: true,
      query: query || "Image Search",
      isImageSearch: !!imageSearch,
      isHybridSearch: isHybridSearch,
      searchType: isHybridSearch ? 'hybrid' : (analyzedDescription && (imageSearch || !query || query === "Image Search")) ? 'image-only' : 'text-only',
      results: topResults,
      totalResults: similarProducts.length,
      totalProducts: allProducts.length,
      collectionStats: collectionStats
    };
    
    console.log('Sending search response:', {
      success: response.success,
      query: response.query,
      searchType: response.searchType,
      resultsCount: response.results.length,
      totalResults: response.totalResults,
      totalProducts: response.totalProducts
    });
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
