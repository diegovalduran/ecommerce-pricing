import { collection, getDocs, query, limit, startAfter, Query, DocumentData, QueryDocumentSnapshot, CollectionReference as ClientCollectionRef, QueryConstraint } from 'firebase/firestore';
import { db } from "@/lib/firebase/config";
import { findSimilarProducts, findSimilarProductsByImage } from '@/utils/text-similarity';
import { NextRequest } from 'next/server';
import { adminDb, listCollectionsAsync, getAllDocumentsAsync } from '@/lib/firebase/admin-config';
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

interface Product {
  id: string;
  collection: string;
  [key: string]: any;
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

// Constants for pagination and retries
const PRODUCT_BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const BATCH_SIZE = 3;

// Helper function to handle timeouts
const withTimeout = async (promise: Promise<any>, timeoutMs: number) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
};

// Add type for collection scoring
interface ScoredCollection {
  name: string;
  score: number;
}

// Helper function to get relevant collections using async iterator
async function getRelevantCollections(query: string): Promise<string[]> {
  try {
    console.log('Fetching collections using admin SDK...');
    const collections: string[] = [];
    const iterator = listCollectionsAsync();
    
    for await (const collection of iterator) {
      // Skip system collections
      if (["products", "Dashboard Inputs", "recent-scrapes", "batchJobs"].includes(collection.id)) {
        continue;
      }
      collections.push(collection.id);
    }
    
    console.log(`Found ${collections.length} total collections`);
    
    if (query && query !== "Image Search") {
      const variations = getCategoryVariations(query);
      console.log('Searching with category variations:', variations);
      
      const scoredCollections: ScoredCollection[] = collections.map((name: string) => {
        const nameLower = name.toLowerCase();
        const score = variations.reduce((total: number, variant: string) => {
          if (nameLower === variant) return total + 3;
          if (nameLower.includes(`-${variant}-`) || nameLower.startsWith(`${variant}-`) || nameLower.endsWith(`-${variant}`)) {
            return total + 2;
          }
          if (nameLower.includes(variant)) return total + 1;
          return total;
        }, 0);
        return { name, score };
      });

      const relevantCollections = scoredCollections
        .sort((a: ScoredCollection, b: ScoredCollection) => b.score - a.score)
        .slice(0, 10)
        .map((c: ScoredCollection) => c.name);

      if (relevantCollections.length > 0) {
        console.log(`Found ${relevantCollections.length} most relevant collections for query "${query}"`);
        return relevantCollections;
      }
    }
    
    // If no relevant collections found or no query, return top 10 collections
    const limitedCollections = collections
      .sort()
      .slice(0, 10);
    
    console.log(`Using top 10 collections from ${collections.length} available collections`);
    return limitedCollections;
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
}

// Helper function to fetch products from a collection using async iterator
async function fetchProductsFromCollection(
  collectionName: string,
  searchQuery: string,
  analyzedDescription?: any
): Promise<{ products: Product[]; stats: any }> {
  try {
    console.log(`Fetching products from collection: ${collectionName}`);
    const collectionRef = adminDb.collection(collectionName);
    const products: Product[] = [];
    let collectionStats = { totalProducts: 0, processedProducts: 0 };

    // Use async iterator to get documents
    const iterator = getAllDocumentsAsync(collectionRef, PRODUCT_BATCH_SIZE);
    for await (const doc of iterator) {
      const data = doc.data();
      products.push({
        id: doc.id,
        collection: collectionName,
        ...data
      });
      
      collectionStats.totalProducts++;
      collectionStats.processedProducts++;
    }

    console.log(`Found ${products.length} products in ${collectionName}`);
    return { products, stats: collectionStats };
  } catch (error) {
    console.error(`Error fetching products from ${collectionName}:`, error);
    return { products: [], stats: { totalProducts: 0, processedProducts: 0, error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

export async function performSearch(params: {
  query?: string;
  analyzedDescription?: any;
  imageSearch?: boolean;
  request?: NextRequest;
}): Promise<SearchResults> {
  const { query = "Image Search", analyzedDescription } = params;
  const startTime = Date.now();
  let collectionStats: Record<string, number | string> = {};
  let allProducts: Product[] = [];
  let searchType = "text";
  let isImageSearch = false;
  let isHybridSearch = false;

  try {
    // Get relevant collections
    const collections = await getRelevantCollections(query);
    console.log(`Processing ${collections.length} collections for search`);

    // Process collections in parallel with a concurrency limit
    for (let i = 0; i < collections.length; i += BATCH_SIZE) {
      const batch = collections.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (collectionName: string) => {
        try {
          const { products, stats } = await fetchProductsFromCollection(
            collectionName,
            query,
            analyzedDescription
          );
          
          collectionStats[collectionName] = stats.totalProducts;
          return products;
        } catch (error) {
          console.error(`Error processing collection ${collectionName}:`, error);
          collectionStats[collectionName] = 'error';
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allProducts = allProducts.concat(...batchResults);

      // Add a small delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < collections.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Perform search based on type
    let results: any[] = [];
    if (analyzedDescription && !analyzedDescription.skipped) {
      if (query && query !== "Image Search") {
        // Hybrid search
        isHybridSearch = true;
        searchType = "hybrid";
        const imageResults = await findSimilarProductsByImage(
          { name: query, "analyzed description": analyzedDescription },
          collections,
          adminDb
        );
        const textResults = findSimilarProducts(query, allProducts);
        results = [...imageResults, ...textResults];
      } else {
        // Image-only search
        isImageSearch = true;
        searchType = "image";
        results = await findSimilarProductsByImage(
          { name: query, "analyzed description": analyzedDescription },
          collections,
          adminDb
        );
      }
    } else {
      // Text-only search
      searchType = "text";
      results = findSimilarProducts(query, allProducts);
    }

    // Sort and deduplicate results
    const uniqueResults = Array.from(
      new Map(results.map(item => [item.id, item])).values()
    ).sort((a, b) => b.score - a.score);

    const endTime = Date.now();
    console.log(`Search completed in ${endTime - startTime}ms`);
    console.log(`Found ${uniqueResults.length} results from ${Object.keys(collectionStats).length} collections`);

    return {
      success: true,
      query,
      isImageSearch,
      isHybridSearch,
      searchType,
      results: uniqueResults,
      totalResults: uniqueResults.length,
      totalProducts: allProducts.length,
      collectionStats
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
      query,
      isImageSearch,
      isHybridSearch,
      searchType,
      results: [],
      totalResults: 0,
      totalProducts: 0,
      collectionStats
    };
  }
} 