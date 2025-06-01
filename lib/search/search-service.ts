import { collection, getDocs } from 'firebase/firestore';
import { db } from "@/lib/firebase/config";
import { findSimilarProducts, findSimilarProductsByImage } from '@/utils/text-similarity';

export interface SearchResults {
  success: boolean;
  error?: string;
  query: string;
  isImageSearch: boolean;
  isHybridSearch: boolean;
  searchType: string;
  results: Array<{
    id: string;
    name: string;
    collection: string;
    score: number;
    matchDetails?: any;
    price?: any;
    store?: any;
    url?: string;
    "analyzed description"?: any;
    debug?: any;
  }>;
  totalResults: number;
  totalProducts: number;
  collectionStats: Record<string, number | string>;
}

export async function performSearch(params: {
  query?: string;
  analyzedDescription?: any;
  imageSearch?: boolean;
}): Promise<SearchResults> {
  const { query = "Image Search", analyzedDescription, imageSearch } = params;
  
  console.log('Search service called with:', { query, imageSearch });
  if (imageSearch && analyzedDescription) {
    console.log('Image analysis provided:', JSON.stringify(analyzedDescription, null, 2));
  }

  // Only require query if not doing an image search
  if (!imageSearch && !query) {
    throw new Error('Search query is required for text search');
  }

  // Get all collections
  console.log('Fetching available collections...');
  const collectionsSnapshot = await getDocs(collection(db, 'collections'));
  const collections = collectionsSnapshot.docs.map(doc => doc.id);
  console.log(`Found ${collections.length} collections:`, collections);

  let similarProducts = [];
  let allProducts = [];
  let collectionStats: Record<string, number | string> = {};
  let isHybridSearch = false;
  
  // Fetch products from all collections
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
  
  // Determine search strategy
  if (analyzedDescription && query && query !== "Image Search") {
    // Hybrid search
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
        color: analyzedDescription.color
      };
      
      console.log('Input product for image search:', JSON.stringify(inputProduct, null, 2));
      
      const imageResults = await findSimilarProductsByImage(
        inputProduct,
        collections,
        db,
        0.1
      );
      console.log(`Image search found ${imageResults.length} results`);
      
      // Combine results
      const combinedResults = [...textResults];
      
      for (const imgResult of imageResults) {
        const existingIndex = combinedResults.findIndex(r => r.id === imgResult.id);
        
        if (existingIndex >= 0) {
          const textScore = combinedResults[existingIndex].score;
          const imageScore = imgResult.score;
          
          const inputType = analyzedDescription.type.toLowerCase();
          const productType = imgResult.matchDetails?.type?.toLowerCase() || '';
          
          let combinedScore;
          if (inputType.includes('shorts') && productType.includes('shorts')) {
            console.log(`Type match found for shorts: ${imgResult.name}`);
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
      
      combinedResults.sort((a, b) => b.score - a.score);
      similarProducts = combinedResults;
      
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  } else if (analyzedDescription && (imageSearch || !query || query === "Image Search")) {
    // Image-only search
    console.log('Using image-based similarity search only');
    
    try {
      const inputProduct = {
        name: query || "Image Search",
        "analyzed description": analyzedDescription
      };
      
      console.log('Input product for image search:', JSON.stringify(inputProduct, null, 2));
      
      similarProducts = await findSimilarProductsByImage(
        inputProduct,
        collections,
        db,
        0.1
      );
      
      console.log(`Image similarity search found ${similarProducts.length} products`);
      
    } catch (error) {
      console.error('Error in image similarity search:', error);
      throw error;
    }
  } else {
    // Text-only search
    console.log('Using traditional text-based similarity search only');
    console.log(`Running text similarity search for query: "${query}" on ${allProducts.length} products`);
    similarProducts = findSimilarProducts(query, allProducts);
    console.log(`Found ${similarProducts.length} products with similarity matches`);
  }

  // Get top 10 results
  const topResults = similarProducts
    .slice(0, 10)
    .map(product => ({
      id: product.id,
      name: product.name || 'Unknown Product',
      collection: product.collection || 'Unknown Collection',
      score: product.score,
      matchDetails: product.matchDetails || ('debug' in product ? (product as any).debug : undefined),
      price: product.price,
      store: product.store,
      url: product.url,
      "analyzed description": product["analyzed description"],
      debug: 'debug' in product ? (product as any).debug : undefined
    }));

  return {
    success: true,
    query,
    isImageSearch: !!imageSearch,
    isHybridSearch,
    searchType: isHybridSearch ? 'hybrid' : (analyzedDescription && (imageSearch || !query || query === "Image Search")) ? 'image-only' : 'text-only',
    results: topResults,
    totalResults: similarProducts.length,
    totalProducts: allProducts.length,
    collectionStats
  };
} 