import { collection, getDocs } from 'firebase/firestore';
import { db } from "@/lib/firebase/config";
import { findSimilarProducts, findSimilarProductsByImage } from '@/utils/text-similarity';
import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { CollectionReference } from 'firebase-admin/firestore';

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

// Map of common product categories and their variations
const CATEGORY_MAPPINGS: Record<string, string[]> = {
  // Bottoms
  'jeans': ['jeans', 'denim', 'pants', 'bottoms', 'trousers', 'chinos', 'khakis', 'slacks', 'leggings', 'jeggings', 'cargo', 'casual', 'formal'],
  'pants': ['pants', 'trousers', 'bottoms', 'jeans', 'denim', 'chinos', 'khakis', 'slacks', 'leggings', 'jeggings', 'cargo', 'casual', 'formal'],
  'shorts': ['shorts', 'bottoms', 'bermudas', 'athletic', 'casual', 'swim', 'beach'],
  'skirts': ['skirts', 'bottoms', 'mini', 'midi', 'maxi', 'pleated', 'a-line', 'pencil'],
  'leggings': ['leggings', 'bottoms', 'activewear', 'athletic', 'yoga', 'workout', 'jeggings'],
  
  // Tops
  'shirts': ['shirts', 'tops', 'blouses', 'tees', 't-shirts', 'polos', 'button-down', 'button-up', 'casual', 'formal', 'dress'],
  'tops': ['tops', 'shirts', 'blouses', 'tees', 't-shirts', 'polos', 'button-down', 'button-up', 'casual', 'formal', 'dress'],
  't-shirts': ['t-shirts', 'tees', 'tops', 'casual', 'graphic', 'basic', 'crew', 'v-neck'],
  'blouses': ['blouses', 'tops', 'shirts', 'formal', 'casual', 'work', 'office'],
  'sweaters': ['sweaters', 'sweatshirts', 'hoodies', 'knits', 'cardigans', 'pullovers', 'turtlenecks', 'tops'],
  
  // Dresses
  'dresses': ['dresses', 'gowns', 'frocks', 'maxi', 'midi', 'mini', 'casual', 'formal', 'evening', 'cocktail', 'party'],
  'gowns': ['gowns', 'dresses', 'evening', 'formal', 'party', 'prom', 'wedding'],
  
  // Outerwear
  'jackets': ['jackets', 'coats', 'outerwear', 'blazers', 'bombers', 'denim', 'leather', 'puffer', 'rain', 'windbreaker'],
  'coats': ['coats', 'jackets', 'outerwear', 'winter', 'fall', 'rain', 'trench', 'peacoat'],
  'blazers': ['blazers', 'jackets', 'formal', 'casual', 'work', 'office'],
  
  // Footwear
  'shoes': ['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'flats', 'heels', 'loafers', 'oxfords', 'pumps', 'mules', 'espadrilles'],
  'sneakers': ['sneakers', 'shoes', 'athletic', 'casual', 'running', 'training', 'lifestyle'],
  'boots': ['boots', 'shoes', 'ankle', 'knee-high', 'riding', 'chelsea', 'hiking', 'winter'],
  'sandals': ['sandals', 'shoes', 'flip-flops', 'slides', 'gladiator', 'wedge', 'flat'],
  
  // Accessories
  'accessories': ['accessories', 'bags', 'jewelry', 'belts', 'scarves', 'hats', 'gloves', 'sunglasses', 'wallets', 'watches'],
  'bags': ['bags', 'accessories', 'handbags', 'backpacks', 'totes', 'clutches', 'crossbody', 'shoulder', 'satchels'],
  'jewelry': ['jewelry', 'accessories', 'necklaces', 'earrings', 'bracelets', 'rings', 'anklets'],
  
  // Activewear
  'activewear': ['activewear', 'athletic', 'sportswear', 'workout', 'gym', 'fitness', 'yoga', 'running', 'training'],
  'swimwear': ['swimwear', 'swim', 'bathing', 'suits', 'bikinis', 'one-piece', 'beach'],
  
  // Loungewear
  'loungewear': ['loungewear', 'pajamas', 'sleepwear', 'robes', 'lounge', 'home', 'casual'],
  'pajamas': ['pajamas', 'sleepwear', 'loungewear', 'nightwear', 'pjs'],
  
  // Undergarments
  'underwear': ['underwear', 'lingerie', 'bras', 'panties', 'briefs', 'boxers', 'undergarments'],
  'lingerie': ['lingerie', 'underwear', 'bras', 'panties', 'sleepwear', 'intimates'],
  
  // Seasonal
  'summer': ['summer', 'spring', 'warm', 'light', 'seasonal'],
  'winter': ['winter', 'fall', 'cold', 'warm', 'seasonal'],
  
  // Styles
  'casual': ['casual', 'everyday', 'basic', 'comfort', 'relaxed'],
  'formal': ['formal', 'business', 'office', 'work', 'professional'],
  'vintage': ['vintage', 'retro', 'classic', 'throwback', 'old-school'],
  'streetwear': ['streetwear', 'urban', 'street', 'hip-hop', 'contemporary']
};

// Common product attributes and their variations
const ATTRIBUTE_MAPPINGS: Record<string, string[]> = {
  // Fits
  'slim': ['slim', 'fitted', 'skinny', 'tapered', 'narrow'],
  'regular': ['regular', 'standard', 'classic', 'traditional'],
  'loose': ['loose', 'relaxed', 'oversized', 'baggy', 'wide'],
  
  // Lengths
  'short': ['short', 'mini', 'cropped', 'ankle'],
  'medium': ['medium', 'regular', 'standard'],
  'long': ['long', 'full', 'maxi', 'floor-length'],
  
  // Materials
  'cotton': ['cotton', 'natural', 'breathable'],
  'denim': ['denim', 'jean', 'indigo'],
  'leather': ['leather', 'suede', 'faux-leather', 'vegan-leather'],
  'silk': ['silk', 'satin', 'smooth'],
  'wool': ['wool', 'cashmere', 'merino', 'knit'],
  
  // Patterns
  'solid': ['solid', 'plain', 'basic'],
  'striped': ['striped', 'stripes', 'pinstripe'],
  'floral': ['floral', 'flower', 'print'],
  'plaid': ['plaid', 'tartan', 'check'],
  'print': ['print', 'patterned', 'graphic']
};

// Helper function to get word variations including plurality
function getWordVariations(word: string): string[] {
  const variations = new Set<string>();
  variations.add(word); // Add the original word

  // Handle plurality
  if (word.endsWith('s')) {
    // Convert plural to singular
    variations.add(word.slice(0, -1)); // Remove 's'
    if (word.endsWith('ies')) {
      variations.add(word.slice(0, -3) + 'y'); // Convert 'ies' to 'y'
    }
    if (word.endsWith('es')) {
      variations.add(word.slice(0, -2)); // Remove 'es'
    }
  } else {
    // Convert singular to plural
    variations.add(word + 's'); // Add 's'
    if (word.endsWith('y')) {
      variations.add(word.slice(0, -1) + 'ies'); // Convert 'y' to 'ies'
    }
    if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
      variations.add(word + 'es'); // Add 'es'
    }
  }

  // Handle common word endings
  if (word.endsWith('ing')) {
    variations.add(word.slice(0, -3)); // Remove 'ing'
    variations.add(word.slice(0, -3) + 'e'); // Remove 'ing' and add 'e'
  }
  if (word.endsWith('ed')) {
    variations.add(word.slice(0, -2)); // Remove 'ed'
    variations.add(word.slice(0, -2) + 'e'); // Remove 'ed' and add 'e'
  }

  return Array.from(variations);
}

function getCategoryVariations(query: string): string[] {
  const queryLower = query.toLowerCase();
  const variations = new Set<string>();
  
  // Add variations of each word in the query
  queryLower.split(/\s+/).forEach(word => {
    getWordVariations(word).forEach(variant => variations.add(variant));
  });
  
  // Add variations from category mappings
  Object.entries(CATEGORY_MAPPINGS).forEach(([category, variants]) => {
    // Check both singular and plural forms of the category
    const categoryVariations = getWordVariations(category);
    if (categoryVariations.some(variant => queryLower.includes(variant))) {
      // Add all variants of each mapping word
      variants.forEach(variant => {
        getWordVariations(variant).forEach(wordVar => variations.add(wordVar));
      });
    }
  });
  
  // Add variations from attribute mappings
  Object.entries(ATTRIBUTE_MAPPINGS).forEach(([attribute, variants]) => {
    // Check both singular and plural forms of the attribute
    const attributeVariations = getWordVariations(attribute);
    if (attributeVariations.some(variant => queryLower.includes(variant))) {
      // Add all variants of each mapping word
      variants.forEach(variant => {
        getWordVariations(variant).forEach(wordVar => variations.add(wordVar));
      });
    }
  });
  
  // Common colors with variations
  const colors = {
    'blue': ['blue', 'navy', 'indigo', 'denim', 'azure', 'royal'],
    'black': ['black', 'onyx', 'ebony', 'charcoal'],
    'white': ['white', 'ivory', 'cream', 'off-white'],
    'red': ['red', 'crimson', 'burgundy', 'maroon', 'scarlet'],
    'green': ['green', 'olive', 'emerald', 'sage', 'mint'],
    'yellow': ['yellow', 'gold', 'mustard', 'amber'],
    'purple': ['purple', 'lavender', 'violet', 'plum'],
    'pink': ['pink', 'rose', 'fuchsia', 'magenta'],
    'brown': ['brown', 'tan', 'beige', 'khaki', 'camel'],
    'gray': ['gray', 'grey', 'silver', 'ash', 'slate']
  };
  
  Object.entries(colors).forEach(([color, variants]) => {
    // Check both singular and plural forms of the color
    const colorVariations = getWordVariations(color);
    if (colorVariations.some(variant => queryLower.includes(variant))) {
      // Add all variants of each color word
      variants.forEach(variant => {
        getWordVariations(variant).forEach(wordVar => variations.add(wordVar));
      });
    }
  });
  
  return Array.from(variations);
}

async function getRelevantCollections(query: string): Promise<string[]> {
  try {
    console.log('Fetching collections using admin SDK...');
    const collections = await adminDb.listCollections();
    const collectionNames = collections.map((col: CollectionReference) => col.id);
    
    // Filter out system collections
    const filteredCollections = collectionNames.filter((name: string) => 
      name !== "products" && 
      name !== "Dashboard Inputs" && 
      name !== "recent-scrapes" &&
      name !== "batchJobs"
    );

    // If it's a text search, try to find relevant collections based on the query
    if (query && query !== "Image Search") {
      const variations = getCategoryVariations(query);
      console.log('Searching with category variations:', variations);
      
      const relevantCollections = filteredCollections.filter(name => {
        const nameLower = name.toLowerCase();
        // Check if collection name contains any variation
        return variations.some(variant => nameLower.includes(variant));
      });

      // If we found relevant collections, use those. Otherwise, use all collections
      if (relevantCollections.length > 0) {
        console.log(`Found ${relevantCollections.length} relevant collections for query "${query}"`);
        console.log('Relevant collections:', relevantCollections);
        return relevantCollections;
      }
    }
    
    console.log(`Using all ${filteredCollections.length} collections`);
    return filteredCollections;
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
}

export async function performSearch(params: {
  query?: string;
  analyzedDescription?: any;
  imageSearch?: boolean;
  request?: NextRequest;
}): Promise<SearchResults> {
  const { query = "Image Search", analyzedDescription } = params;
  let { imageSearch } = params; // Make imageSearch mutable
  
  console.log('Search service called with:', { query, imageSearch });
  
  // Validate image analysis data if provided
  if (imageSearch && analyzedDescription) {
    const hasValidAnalysis = analyzedDescription && 
      analyzedDescription.type && 
      analyzedDescription.genre && 
      analyzedDescription.pattern && 
      analyzedDescription.length;
    
    if (!hasValidAnalysis) {
      console.log('Invalid or incomplete image analysis data - falling back to text search');
      // Override imageSearch to false if analysis data is invalid
      imageSearch = false;
    } else {
      console.log('Image analysis provided:', JSON.stringify(analyzedDescription, null, 2));
    }
  }

  // Only require query if not doing an image search
  if (!imageSearch && !query) {
    throw new Error('Search query is required for text search');
  }

  // Get relevant collections based on the query
  console.log('Fetching relevant collections...');
  const collections = await getRelevantCollections(query);
  console.log(`Found ${collections.length} collections to search`);

  let similarProducts = [];
  let allProducts = [];
  let collectionStats: Record<string, number | string> = {};
  let isHybridSearch = false;
  
  // Fetch products from collections in parallel with a limit
  console.log('Starting to fetch from collections...');
  const BATCH_SIZE = 3; // Process 3 collections at a time
  
  for (let i = 0; i < collections.length; i += BATCH_SIZE) {
    const batch = collections.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (collectionName) => {
      try {
        console.log(`Fetching from collection: ${collectionName}`);
        const querySnapshot = await getDocs(collection(db, collectionName));
        const products = querySnapshot.docs.map(doc => ({
          id: doc.id,
          collection: collectionName,
          ...doc.data()
        }));
        
        collectionStats[collectionName] = products.length;
        return products;
      } catch (error) {
        console.error(`Error fetching from ${collectionName}:`, error);
        collectionStats[collectionName] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        return [];
      }
    });

    const batchResults = await Promise.all(batchPromises);
    allProducts.push(...batchResults.flat());
    console.log(`Processed batch ${i/BATCH_SIZE + 1} of ${Math.ceil(collections.length/BATCH_SIZE)}`);
  }
  
  console.log('Collection stats:', collectionStats);
  console.log(`Total products found: ${allProducts.length}`);
  
  // Determine search strategy
  if (analyzedDescription && query && query !== "Image Search" && imageSearch) {
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
      // Fall back to text-only search on error
      console.log('Falling back to text-only search due to error');
      similarProducts = findSimilarProducts(query, allProducts);
      console.log(`Text search found ${similarProducts.length} products`);
    }
  } else if (analyzedDescription && imageSearch && (imageSearch || !query || query === "Image Search")) {
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
      // Fall back to text search if available, otherwise throw
      if (query && query !== "Image Search") {
        console.log('Falling back to text search due to error');
        similarProducts = findSimilarProducts(query, allProducts);
        console.log(`Text search found ${similarProducts.length} products`);
      } else {
        throw error;
      }
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