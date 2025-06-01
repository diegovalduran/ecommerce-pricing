// Import Firebase Admin functions
import { getFirestore, Firestore } from 'firebase-admin/firestore';

interface ScoredProduct {
    id: string;
    score: number;
    debug?: any;
    matchDetails?: any;
    [key: string]: any;
  }
  
  function normalizeText(text: string): string[] {
    return text
      .toLowerCase()
      // Replace special characters with spaces
      .replace(/[^a-z0-9\s]/g, ' ')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ');
  }
  
  export function calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    // Normalize texts
    const words1 = normalizeText(text1);
    const words2 = normalizeText(text2);
    
    // Count word occurrences
    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();
    
    words1.forEach(word => freq1.set(word, (freq1.get(word) || 0) + 1));
    words2.forEach(word => freq2.set(word, (freq2.get(word) || 0) + 1));
    
    // Calculate dot product
    let dotProduct = 0;
    freq1.forEach((count1, word) => {
      const count2 = freq2.get(word) || 0;
      dotProduct += count1 * count2;
    });
    
    // Calculate magnitudes
    const mag1 = Math.sqrt([...freq1.values()].reduce((sum, count) => sum + count * count, 0));
    const mag2 = Math.sqrt([...freq2.values()].reduce((sum, count) => sum + count * count, 0));
    
    // Calculate cosine similarity
    return mag1 && mag2 ? dotProduct / (mag1 * mag2) : 0;
  }
  
  export function findSimilarProducts(
    query: string,
    products: any[],
    threshold: number = 0.1
  ): ScoredProduct[] {
    console.log(`Starting similarity search for query: "${query}" on ${products.length} products`);
    console.log(`Using similarity threshold: ${threshold}`);
    
    // Score each product based on various attributes
    const scoredProducts = products.map(product => {
      const nameScore = calculateTextSimilarity(query, product.name || '') * 2.0; // Higher weight for name matches
      const descScore = calculateTextSimilarity(query, product.description || '') * 1.0;
      const colorScore = calculateTextSimilarity(query, product.color || '') * 1.5;
      const categoryScore = calculateTextSimilarity(query, product.category || '') * 1.2;
      
      // Get the maximum score across all attributes
      const score = Math.max(
        nameScore,
        descScore,
        colorScore,
        categoryScore
      );
  
      // Log high-scoring matches for debugging
      if (score > 0.5) {
        console.log(`High match found (${score.toFixed(2)}): ${product.name} (${product.collection || 'unknown collection'})`);
        console.log(`  Scores: name=${nameScore.toFixed(2)}, desc=${descScore.toFixed(2)}, color=${colorScore.toFixed(2)}, category=${categoryScore.toFixed(2)}`);
      }
  
      return {
        ...product,
        score,
        debug: { nameScore, descScore, colorScore, categoryScore }
      };
    });
  
    // Filter products above threshold and sort by score
    const filteredProducts = scoredProducts
      .filter(product => product.score > threshold)
      .sort((a, b) => b.score - a.score);
    
    console.log(`Found ${filteredProducts.length} products with scores above threshold ${threshold}`);
    
    if (filteredProducts.length > 0) {
      console.log(`Top match: ${filteredProducts[0].name} with score ${filteredProducts[0].score.toFixed(2)}`);
    } else {
      console.log('No matches found above threshold');
    }
    
    return filteredProducts;
  }

interface AnalyzedDescription {
  genre: string;
  length: string;
  type: string;
  pattern: string;
  graphic: string;
  fabrics: string[];
  color?: string;
}

function isRelevantCollection(collectionName: string, inputType: string): boolean {
  // Skip Dashboard Inputs and products collections
  if (collectionName === 'Dashboard Inputs' || collectionName === 'products') {
    return false;
  }

  // Convert both to lowercase for case-insensitive comparison
  const lowerCollection = collectionName.toLowerCase();
  const lowerType = inputType.toLowerCase();

  console.log(`Evaluating collection: ${collectionName} for type: ${inputType}`);

  // If collection has no defining information (e.g., just brand name), include it
  if (lowerCollection.split('-').length <= 2) {
    console.log(`Including collection ${collectionName} (generic brand collection)`);
    return true;
  }

  // Special handling for jean shorts / denim shorts
  if ((lowerType.includes('jean') || lowerType.includes('denim')) && lowerType.includes('shorts')) {
    // For jean shorts, include both shorts and jeans collections
    if (lowerCollection.includes('jean') || lowerCollection.includes('denim') || lowerCollection.includes('shorts')) {
      console.log(`Including collection ${collectionName} (matches jean shorts)`);
      return true;
    }
  }

  // Check for type or category matches
  const typeSynonyms: Record<string, string[]> = {
    'pants': ['jeans', 'bottoms', 'trousers', 'chinos', 'shorts', 'jean', 'bottom', 'trouser', 'denim'],
    'shorts': ['jean shorts', 'denim shorts', 'cargo shorts', 'athletic shorts', 'bermuda', 'bottoms'],
    'underwear': ['briefs', 'boxers', 'undergarment', 'panties'],
    'shirt': ['top', 'tshirt', 't-shirt', 'tee', 'blouse', 'polo', 'shirt', 'polos', 'tank top', 'tanktop'],
    'dress': ['gown', 'dress', 'dresses'],
    'jacket': ['coats', 'coat', 'outerwear', 'jacket', 'jackets'],
    'shoes': ['footwear', 'sneakers', 'boots', 'sneaker', 'boot', 'heels', 'high heels', 'high heel', 'heel', 'heels']
  };

  // Check if the type is directly in the collection name
  if (lowerCollection.includes(lowerType)) {
    console.log(`Including collection ${collectionName} (direct type match: ${lowerType})`);
    return true;
  }

  // Check if any synonym of the type is in the collection name
  for (const [key, synonyms] of Object.entries(typeSynonyms)) {
    if (key === lowerType || synonyms.includes(lowerType)) {
      if (lowerCollection.includes(key) || synonyms.some(syn => lowerCollection.includes(syn))) {
        console.log(`Including collection ${collectionName} (synonym match: ${key})`);
        return true;
      }
    }
  }

  console.log(`Excluding collection ${collectionName} (no match for ${lowerType})`);
  return false;
}

function calculateImageSimilarity(
  inputDesc: AnalyzedDescription,
  productDesc: AnalyzedDescription
): number {
  if (!inputDesc || !productDesc) return 0;

  // Define weights for different attributes
  const weights = {
    type: 4.0,    // MUCH higher weight for matching product type
    genre: 1.5,   // Style is important
    fabrics: 1.2, // Material match is significant
    pattern: 1.0, // Pattern is relevant
    length: 0.8,  // Length is somewhat important
    graphic: 0.5, // Graphic presence is less important
    color: 1.8    // Color is very important (high weight)
  };

  // Special handling for shorts vs underwear to prevent mismatches
  // If input is shorts and product is underwear (or vice versa), heavily penalize
  const inputType = inputDesc.type.toLowerCase();
  const productType = productDesc.type.toLowerCase();
  
  // Check for mismatches between shorts and underwear categories
  const isInputShorts = inputType.includes('shorts') || inputType.includes('jeans shorts') || inputType.includes('denim shorts');
  const isProductShorts = productType.includes('shorts') || productType.includes('jeans shorts') || productType.includes('denim shorts');
  
  const isInputUnderwear = inputType.includes('underwear') || inputType.includes('briefs') || inputType.includes('boxers');
  const isProductUnderwear = productType.includes('underwear') || productType.includes('briefs') || productType.includes('boxers');
  
  // If there's a category mismatch between shorts and underwear, return a very low score
  if ((isInputShorts && isProductUnderwear) || (isInputUnderwear && isProductShorts)) {
    console.log(`Category mismatch: Input "${inputType}" vs Product "${productType}" - penalizing score`);
    return 0.01; // Very low score for mismatched categories
  }

  // Calculate individual attribute similarities
  const typeSim = calculateTextSimilarity(inputDesc.type, productDesc.type) * weights.type;
  const genreSim = calculateTextSimilarity(inputDesc.genre, productDesc.genre) * weights.genre;
  const patternSim = calculateTextSimilarity(inputDesc.pattern, productDesc.pattern) * weights.pattern;
  const lengthSim = calculateTextSimilarity(inputDesc.length, productDesc.length) * weights.length;
  
  // Compare graphic field as a string ("graphic" or "no graphic")
  const graphicSim = (inputDesc.graphic === productDesc.graphic ? 1 : 0) * weights.graphic;

  // Calculate color similarity if available
  let colorSim = 0;
  if (inputDesc.color && productDesc.color) {
    colorSim = calculateTextSimilarity(inputDesc.color, productDesc.color) * weights.color;
  }

  // Calculate fabric similarity (handle arrays)
  let fabricSim = 0;
  if (inputDesc.fabrics && productDesc.fabrics && 
      inputDesc.fabrics.length > 0 && productDesc.fabrics.length > 0) {
    // Compare each fabric in input against each fabric in product
    const fabricScores = inputDesc.fabrics.map(inFabric => 
      Math.max(...productDesc.fabrics.map(prodFabric => 
        calculateTextSimilarity(inFabric, prodFabric)
      ))
    );
    fabricSim = (fabricScores.reduce((sum, score) => sum + score, 0) / fabricScores.length) * weights.fabrics;
  }
  
  // Boost score for material match (e.g., if both are denim)
  if (inputDesc.fabrics && productDesc.fabrics) {
    const inputHasDenim = inputDesc.fabrics.some(f => f.includes('denim') || f.includes('jean'));
    const productHasDenim = productDesc.fabrics.some(f => f.includes('denim') || f.includes('jean'));
    
    if (inputHasDenim && productHasDenim) {
      fabricSim *= 1.5; // 50% boost for denim match
    }
  }

  // Get maximum score across all attributes
  const maxScore = Math.max(typeSim, genreSim, fabricSim, patternSim, lengthSim, graphicSim, colorSim);
  
  // Calculate weighted average (more comprehensive than just max)
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const weightedScore = (
    typeSim + genreSim + fabricSim + patternSim + lengthSim + graphicSim + colorSim
  ) / totalWeight;
  
  // Use 70% of max score and 30% of weighted average for final score
  return 0.7 * maxScore + 0.3 * weightedScore;
}

export async function findSimilarProductsByImage(
  inputProduct: {
    name: string;
    "analyzed description": AnalyzedDescription;
    color?: string | string[];
  },
  collections: string[],
  db: Firestore,
  threshold: number = 0.1
): Promise<ScoredProduct[]> {
  if (!inputProduct || !inputProduct["analyzed description"]) {
    console.log("No image analysis provided - falling back to text search");
    return [];
  }

  const inputDesc = inputProduct["analyzed description"];
  
  // Validate the analyzed description has required fields
  if (!inputDesc.type || !inputDesc.genre || !inputDesc.pattern || !inputDesc.length) {
    console.error("Invalid analyzed description format:", inputDesc);
    throw new Error("Invalid analyzed description format - missing required fields");
  }

  console.log(`Starting image-based similarity search for: "${inputProduct.name}"`);
  console.log(`Image analysis: ${JSON.stringify(inputDesc, null, 2)}`);
  
  // Filter relevant collections based on product type
  const productType = inputDesc.type || "";
  const relevantCollections = collections.filter(collection => 
    isRelevantCollection(collection, productType)
  );
  
  console.log(`Filtered to ${relevantCollections.length} relevant collections based on type "${productType}"`);
  console.log(`Relevant collections: ${relevantCollections.join(", ")}`);

  // Fetch and evaluate products from relevant collections
  let allScoredProducts: ScoredProduct[] = [];
  
  for (const collectionName of relevantCollections) {
    try {
      console.log(`Fetching products from collection: ${collectionName}`);
      
      // Get collection reference and fetch documents using Firebase Admin SDK
      const collectionRef = db.collection(collectionName);
      const snapshot = await collectionRef.get();
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Found ${products.length} products in ${collectionName}`);
      
      // Score each product based on image analysis similarity
      const scoredProducts = products
        .filter((product: any) => {
          const hasAnalysis = product["analyzed description"] && 
            product["analyzed description"].type && 
            product["analyzed description"].genre && 
            product["analyzed description"].pattern && 
            product["analyzed description"].length;
          
          if (!hasAnalysis) {
            console.log(`Skipping product ${product.id} in ${collectionName} - missing analyzed description`);
          }
          return hasAnalysis;
        })
        .map((product: any) => {
          // Calculate base similarity from analyzed description
          const similarity = calculateImageSimilarity(
            inputDesc,
            product["analyzed description"]
          );
          
          // Calculate color similarity if colors are available
          let colorScore = 0;
          if (inputProduct.color && product.colors && product.colors.length > 0) {
            const inputColors = Array.isArray(inputProduct.color) 
              ? inputProduct.color 
              : [inputProduct.color];
            
            // Compare each input color against each product color
            const colorScores = inputColors.map(inputColor => 
              Math.max(...product.colors.map((productColor: string) => 
                calculateTextSimilarity(inputColor.toLowerCase(), productColor.toLowerCase())
              ))
            );
            
            // Take the average of the best color matches
            colorScore = colorScores.reduce((sum, score) => sum + score, 0) / colorScores.length;
          }
          
          // Combine similarity with color score (70% analysis, 30% color if available)
          const finalScore = colorScore > 0 
            ? (0.7 * similarity + 0.3 * colorScore) 
            : similarity;
            
          // Only log the highest scoring matches (top 10% of threshold)
          if (finalScore > threshold * 2) {
            console.log(`High match found (${finalScore.toFixed(2)}): ${product.name || 'Unnamed'} (${collectionName})`);
            console.log(`  Document ID: ${product.id}`);
            console.log(`  Analysis score: ${similarity.toFixed(2)}, Color score: ${colorScore.toFixed(2)}`);
          }
          
          return {
            ...product,
            score: finalScore,
            matchDetails: { 
              analysisScore: similarity,
              colorScore: colorScore,
              type: product["analyzed description"].type,
              genre: product["analyzed description"].genre,
              pattern: product["analyzed description"].pattern,
              length: product["analyzed description"].length
            }
          };
        })
        .filter((product: any) => product.score > threshold);
      
      allScoredProducts = [...allScoredProducts, ...scoredProducts];
    } catch (error) {
      console.error(`Error processing collection ${collectionName}:`, error);
    }
  }
  
  // Sort all products by score
  const sortedProducts = allScoredProducts.sort((a: ScoredProduct, b: ScoredProduct) => b.score - a.score);
  
  console.log(`Found ${sortedProducts.length} products with scores above threshold ${threshold}`);
  
  if (sortedProducts.length > 0) {
    console.log(`Top match: ${sortedProducts[0].name} with score ${sortedProducts[0].score.toFixed(2)}`);
    console.log(`From collection: ${sortedProducts[0].collection}, Document ID: ${sortedProducts[0].id}`);
  } else {
    console.log('No matches found above threshold');
  }
  
  return sortedProducts;
}