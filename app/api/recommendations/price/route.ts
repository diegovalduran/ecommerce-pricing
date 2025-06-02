import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'
import { getRelevantCollections, ValidCollection } from '@/lib/utils/collection-mapper'

// Configure runtime for Vercel
export const runtime = 'nodejs' // Use Node.js runtime instead of Edge
export const maxDuration = 60 // Maximum execution time in seconds
export const dynamic = 'force-dynamic' // Disable caching for real-time results

// Constants for optimization
const PRICE_BAND_COUNT = 5 // Number of price bands to analyze
const PRODUCTS_PER_BAND = 20 // Number of products to return per price band
const MIN_PRODUCTS_FOR_STATS = 10 // Minimum products needed for reliable stats

interface PriceBand {
  min: number
  max: number
  count: number
  averagePrice: number
  products: Product[]
}

interface Product {
  id: string
  name: string
  price: number
  originalPrice: number
  discountedPrice: number
  category?: string
  productType?: string
  store?: string
  collection: ValidCollection
}

interface CollectionStats {
  collection: ValidCollection
  totalProducts: number
  priceBands: PriceBand[]
  overallStats: {
    averagePrice: number
    lowestPrice: number
    highestPrice: number
    priceDistribution: number[] // Array of counts for each price band
  }
}

interface PriceFilters {
  priceRange?: [number, number]
  targetPrice?: number // Optional target price for more focused recommendations
}

interface PriceRecommendationResponse {
  recommendations: Product[]
  stats: {
    totalProducts: number
    averagePrice: number
    priceRange: [number, number]
    confidence: number
    collectionsAnalyzed: number
    totalCollections: number
    queryTime: number
    priceBands: PriceBand[]
  }
  pagination?: {
    hasMore: boolean
    nextBand?: number
  }
}

// Helper function to calculate price bands
function calculatePriceBands(prices: number[], bandCount: number = PRICE_BAND_COUNT): PriceBand[] {
  if (prices.length === 0) return []
  
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min
  const bandSize = range / bandCount

  const bands: PriceBand[] = Array.from({ length: bandCount }, (_, i) => ({
    min: min + (bandSize * i),
    max: min + (bandSize * (i + 1)),
    count: 0,
    averagePrice: 0,
    products: []
  }))

  // Count products in each band
  prices.forEach(price => {
    const bandIndex = Math.min(
      Math.floor((price - min) / bandSize),
      bandCount - 1
    )
    bands[bandIndex].count++
  })

  return bands
}

// Helper function to get products in a specific price band
async function getProductsInBand(
  collection: ValidCollection,
  minPrice: number,
  maxPrice: number,
  limit: number = PRODUCTS_PER_BAND
): Promise<Product[]> {
  const snapshot = await adminDb.collection(collection)
    .where('price.original', '>=', minPrice)
    .where('price.original', '<=', maxPrice)
    .limit(limit)
    .get()

  return snapshot.docs.map(doc => {
    const data = doc.data()
    const originalPrice = data.price?.original || 0
    const discountedPrice = data.price?.discounted || 0
    const effectivePrice = discountedPrice > 0 ? discountedPrice : originalPrice

    return {
      id: doc.id,
      name: data.name,
      price: effectivePrice,
      originalPrice,
      discountedPrice,
      category: data.category,
      productType: data.productType,
      store: data.store?.name,
      collection
    }
  })
}

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const { query, filters, bandIndex = 0 } = await request.json() as { 
      query: string, 
      filters?: PriceFilters,
      bandIndex?: number 
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Get relevant collections
    const relevantCollections = getRelevantCollections(query)
    
    if (relevantCollections.length === 0) {
      return NextResponse.json({
        recommendations: [],
        stats: {
          totalProducts: 0,
          averagePrice: 0,
          priceRange: [0, 0],
          confidence: 0,
          collectionsAnalyzed: 0,
          totalCollections: 0,
          queryTime: Date.now() - startTime,
          priceBands: []
        }
      } as PriceRecommendationResponse)
    }

    // First pass: Get aggregate statistics for each collection
    const collectionStats = await Promise.all(
      relevantCollections.map(async (collectionName: ValidCollection) => {
        try {
          // Get all prices for the collection
          const pricesSnapshot = await adminDb.collection(collectionName)
            .select('price.original', 'price.discounted')
            .get()

          const prices: number[] = []
          pricesSnapshot.forEach(doc => {
            const data = doc.data()
            const originalPrice = data.price?.original || 0
            const discountedPrice = data.price?.discounted || 0
            const effectivePrice = discountedPrice > 0 ? discountedPrice : originalPrice
            if (effectivePrice > 0) {
              prices.push(effectivePrice)
            }
          })

          if (prices.length < MIN_PRODUCTS_FOR_STATS) {
            return null
          }

          // Calculate price bands
          const priceBands = calculatePriceBands(prices)

          // Get products for the requested band
          const targetBand = priceBands[bandIndex]
          if (targetBand) {
            targetBand.products = await getProductsInBand(
              collectionName,
              targetBand.min,
              targetBand.max
            )
            targetBand.averagePrice = targetBand.products.reduce(
              (sum, p) => sum + p.price, 0
            ) / targetBand.products.length
          }

          return {
            collection: collectionName,
            totalProducts: prices.length,
            priceBands,
            overallStats: {
              averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
              lowestPrice: Math.min(...prices),
              highestPrice: Math.max(...prices),
              priceDistribution: priceBands.map(band => band.count)
            }
          } as CollectionStats
        } catch (error) {
          console.error(`Error processing collection ${collectionName}:`, error)
          return null
        }
      })
    )

    // Filter out failed collections
    const validStats = collectionStats.filter((stat): stat is CollectionStats => stat !== null)
    
    if (validStats.length === 0) {
      return NextResponse.json({
        recommendations: [],
        stats: {
          totalProducts: 0,
          averagePrice: 0,
          priceRange: [0, 0],
          confidence: 0,
          collectionsAnalyzed: 0,
          totalCollections: relevantCollections.length,
          queryTime: Date.now() - startTime,
          priceBands: []
        }
      } as PriceRecommendationResponse)
    }

    // Combine products from the target price band
    const allProducts = validStats.flatMap(
      stat => stat.priceBands[bandIndex]?.products || []
    )

    // Calculate overall statistics
    const totalProducts = validStats.reduce(
      (sum, stat) => sum + stat.totalProducts, 0
    )
    const averagePrice = validStats.reduce(
      (sum, stat) => sum + stat.overallStats.averagePrice, 0
    ) / validStats.length
    const lowestPrice = Math.min(
      ...validStats.map(stat => stat.overallStats.lowestPrice)
    )
    const highestPrice = Math.max(
      ...validStats.map(stat => stat.overallStats.highestPrice)
    )

    // Calculate confidence score
    const confidenceScore = Math.min(
      (validStats.length / relevantCollections.length) * 0.4 + // Collection coverage
      (totalProducts / 100) * 0.4 + // Product coverage
      (1 - (highestPrice - lowestPrice) / (highestPrice || 1)) * 0.2, // Price consistency
      1
    )

    // Sort products by price
    const sortedProducts = allProducts.sort((a, b) => a.price - b.price)

    // Determine if there are more bands to explore
    const hasMoreBands = bandIndex < PRICE_BAND_COUNT - 1

    return NextResponse.json({
      recommendations: sortedProducts,
      stats: {
        totalProducts,
        averagePrice,
        priceRange: [lowestPrice, highestPrice],
        confidence: confidenceScore,
        collectionsAnalyzed: validStats.length,
        totalCollections: relevantCollections.length,
        queryTime: Date.now() - startTime,
        priceBands: validStats[0]?.priceBands || [] // Use first collection's bands as reference
      },
      pagination: {
        hasMore: hasMoreBands,
        nextBand: hasMoreBands ? bandIndex + 1 : undefined
      }
    } as PriceRecommendationResponse)

  } catch (error) {
    console.error('Error in price recommendations API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate price recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
        queryTime: Date.now() - startTime
      },
      { status: 500 }
    )
  }
} 