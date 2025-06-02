import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { findSimilarProducts } from '@/utils/text-similarity';
import { adminDb } from '@/lib/firebase/admin-config';
import { getRelevantCollections } from '@/lib/utils/collection-mapper';

// Configure runtime for Vercel
export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH_SIZE = 3; // Process collections in small batches
const MAX_DOCS_PER_COLLECTION = 300; // Increased limit for more comprehensive results

interface PriceData {
  original: number;
  discounted: number;
  currency: string;
}

interface Competitor {
  name: string;
  price: PriceData;
  url: string;
  similarity: number;
  matchDetails?: any;
}

interface PriceInsight {
  type: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

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
  const stats = {
    timings: {
      total: 0,
      search: 0,
      analysis: 0
    },
    results: {
      totalProducts: 0,
      relevantProducts: 0,
      validPricing: 0,
      collections: 0,
      avgSimilarity: 0,
      priceRange: {
        min: 0,
        max: 0,
        avg: 0,
        variance: 0
      }
    }
  };

  try {
    console.log('Price recommendation API called');
    const body = await req.json();
    const { query, description, category, "analyzed description": analyzedDescription, imageSearch } = body;
    
    console.log('Request data:', { query, description, category, analyzedDescription, imageSearch });

    // Only require query if not doing an image search
    if (!imageSearch && !query) {
      console.log('Error: Product query is required for text search');
      return NextResponse.json({ 
        success: false, 
        error: 'Product query is required for text search' 
      }, { status: 400 });
    }

    // Construct a comprehensive search query
    const searchQuery = [
      query || "Image Search",
      description || '',
      category || ''
    ].filter(Boolean).join(' ');

    console.log(`Searching for: "${searchQuery}"`);

    // Get relevant collections
    const relevantCollections = getRelevantCollections(searchQuery);
    stats.results.collections = relevantCollections.length;
    
    if (relevantCollections.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No relevant collections found',
        stats
      }, { status: 404 });
    }

    // Search directly in the collections with batch processing
    const searchStartTime = performance.now();
    console.log('Searching collections:', relevantCollections);
    
    let allProducts = [];
    
    // Process collections in smaller batches
    for (let i = 0; i < relevantCollections.length; i += BATCH_SIZE) {
      const batch = relevantCollections.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (collectionName) => {
        try {
          console.log(`Fetching from collection: ${collectionName}`);
          const snapshot = await adminDb.collection(collectionName)
            .orderBy('scrapedAt', 'desc')
            .limit(MAX_DOCS_PER_COLLECTION)
            .get();
            
          const products = snapshot.docs.map(doc => ({
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
      if (i + BATCH_SIZE < relevantCollections.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    stats.results.totalProducts = allProducts.length;

    // Find similar products using our similarity function
    const similarProducts = findSimilarProducts(searchQuery, allProducts);
    stats.results.relevantProducts = similarProducts.length;
    
    stats.timings.search = performance.now() - searchStartTime;
    console.log(`Search completed in ${stats.timings.search.toFixed(2)}ms`);
    console.log(`Found ${similarProducts.length} similar products out of ${allProducts.length} total products`);

    // Process search results to extract competitors with valid pricing
    console.log('Processing search results to extract competitors');
    const validProducts = similarProducts.filter((product: any) => 
      product.price?.original && 
      product.store?.name && 
      product.score > 0.3
    );
    
    stats.results.validPricing = validProducts.length;
    stats.results.avgSimilarity = validProducts.reduce((sum: number, p: any) => sum + p.score, 0) / validProducts.length;
    
    console.log(`Found ${validProducts.length} valid products with pricing and store info`);
    console.log(`Average similarity score: ${(stats.results.avgSimilarity * 100).toFixed(1)}%`);
    
    const competitors: Competitor[] = validProducts
      .slice(0, 6)
      .map((product: any) => ({
        name: product.store.name,
        price: product.price,
        url: product.url || '',
        similarity: product.score,
        matchDetails: product.matchDetails
      }));

    if (competitors.length === 0) {
      console.log('Error: No comparable products with valid pricing found');
      return NextResponse.json({
        success: false,
        error: 'No comparable products with valid pricing found',
        stats
      }, { status: 404 });
    }

    // Calculate price statistics
    const prices = competitors.map(c => c.price.original);
    stats.results.priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      variance: prices.reduce((sum, price) => sum + Math.pow(price - (prices.reduce((a, b) => a + b, 0) / prices.length), 2), 0) / prices.length
    };

    // Calculate recommended price (weighted by similarity)
    console.log('Calculating weighted price recommendation');
    const totalWeight = competitors.reduce((sum, comp) => sum + comp.similarity, 0);
    const weightedSum = competitors.reduce((sum, comp) => sum + (comp.price.original * comp.similarity), 0);
    const recommendedPrice = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // Generate insights
    const insights: PriceInsight[] = [];
    
    // Price range insight
    const priceRange = stats.results.priceRange.max - stats.results.priceRange.min;
    const priceVariation = priceRange / stats.results.priceRange.avg;
    
    if (priceVariation > 0.3) {
      insights.push({
        type: 'Price Variation',
        description: `High price variation (${Math.round(priceVariation * 100)}%) suggests flexible pricing opportunity`,
        impact: 'positive'
      });
    }

    // Price volatility insight
    const priceVolatility = Math.sqrt(stats.results.priceRange.variance) / stats.results.priceRange.avg;
    if (priceVolatility > 0.2) {
      insights.push({
        type: 'Price Volatility',
        description: `High price volatility (${(priceVolatility * 100).toFixed(1)}% coefficient of variation) indicates unstable market`,
        impact: 'neutral'
      });
    }

    // Market competition insight
    const competitionLevel = stats.results.relevantProducts / stats.results.totalProducts;
    if (competitionLevel > 0.1) {
      insights.push({
        type: 'Market Competition',
        description: `Strong market presence with ${(competitionLevel * 100).toFixed(1)}% of products in your category`,
        impact: competitionLevel > 0.3 ? 'negative' : 'neutral'
      });
    }

    // Premium positioning insight
    const premiumThreshold = stats.results.priceRange.avg * 1.15;
    const premiumCompetitors = competitors.filter(c => c.price.original > premiumThreshold);
    
    if (premiumCompetitors.length > 0) {
      insights.push({
        type: 'Premium Positioning',
        description: `${premiumCompetitors.length} competitors positioned as premium (>15% above average)`,
        impact: 'positive'
      });
    }

    // Generate reasoning based on data quality
    const reasoning = [
      `Analysis based on ${competitors.length} products with ${(stats.results.avgSimilarity * 100).toFixed(1)}% average similarity`,
      `Price recommendation weighted by product similarity scores`,
      `Market spans ${stats.results.collections} collections with ${stats.results.validPricing} valid price points`,
      `Price range: ${stats.results.priceRange.min.toFixed(2)} - ${stats.results.priceRange.max.toFixed(2)} ${competitors[0].price.currency}`,
      `Analysis completed in ${(performance.now() - startTime).toFixed(2)}ms`
    ];

    stats.timings.analysis = performance.now() - searchStartTime;
    stats.timings.total = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      recommendedPrice,
      currency: competitors[0].price.currency,
      competitors,
      insights,
      reasoning,
      stats
    });

  } catch (error: any) {
    console.error('Price recommendation error:', error);
    stats.timings.total = performance.now() - startTime;
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to generate price recommendation',
      stats
    }, { status: 500 });
  }
}
