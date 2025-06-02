import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'
import { collection, getDocs, query, orderBy, limit, startAfter, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { FilterState } from '@/types/database'

// Cache for collection stats with TTL
const statsCache = new Map<string, { stats: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Force dynamic to disable caching at the route level
export const dynamic = 'force-dynamic'

interface CollectionStats {
  totalProducts: number
  averagePrice: number
  lowestPrice: number
  highestPrice: number
  averageDiscount: number
  activePromotions: number
  lastUpdated: string
  matchingProducts?: number // New field for filtered count
}

// Export the FilterParams interface
export interface FilterParams {
  searchQuery?: string
  selectedBrands?: string[]
  selectedCategories?: string[]
  selectedSizes?: string[]
  selectedColors?: string[]
  selectedAvailability?: string[]
  selectedPromotions?: string[]
  selectedFabrics?: string[]
  priceRange?: [number, number]
  ratingRange?: [number, number]
}

async function getCollectionStats(
  collectionName: string, 
  filters?: FilterParams,
  forceRefresh?: boolean
): Promise<CollectionStats> {
  // Check cache first (only if no filters and not forcing refresh)
  if (!filters && !forceRefresh) {
    const cached = statsCache.get(collectionName)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.stats
    }
  }

  try {
    // Build query based on filters
    let collectionQuery = adminDb.collection(collectionName)
      .select(
        'price.original', 
        'price.discounted', 
        'promotions.current', 
        'scrapedAt',
        'name',
        'category',
        'productType',
        'store.name',
        'sizes',
        'colors',
        'stockStatus',
        'materials.fabric',
        'rating'
      )

    // Apply filters if provided
    if (filters) {
      if (filters.searchQuery) {
        collectionQuery = collectionQuery.where('name', '>=', filters.searchQuery)
          .where('name', '<=', filters.searchQuery + '\uf8ff')
      }
      if (filters.selectedCategories?.length) {
        collectionQuery = collectionQuery.where('category', 'in', filters.selectedCategories)
      }
      if (filters.selectedBrands?.length) {
        collectionQuery = collectionQuery.where('store.name', 'in', filters.selectedBrands)
      }
      if (filters.priceRange) {
        collectionQuery = collectionQuery
          .where('price.original', '>=', filters.priceRange[0])
          .where('price.original', '<=', filters.priceRange[1])
      }
      if (filters.ratingRange) {
        collectionQuery = collectionQuery
          .where('rating', '>=', filters.ratingRange[0])
          .where('rating', '<=', filters.ratingRange[1])
      }
      // Note: Some filters like sizes, colors, etc. need to be applied in memory
      // as Firestore doesn't support array contains with multiple values
    }

    const snapshot = await collectionQuery.get()

    let totalProducts = 0
    let matchingProducts = 0
    let totalPrice = 0
    let lowestPrice = Infinity
    let highestPrice = 0
    let totalDiscount = 0
    let discountedProducts = 0
    let activePromotions = 0
    let lastUpdated = ''

    snapshot.forEach(doc => {
      const data = doc.data()
      totalProducts++

      // Apply in-memory filters
      let matchesFilters = true
      if (filters) {
        if (filters.selectedSizes?.length && 
            (!data.sizes || !filters.selectedSizes.some(size => data.sizes.includes(size)))) {
          matchesFilters = false
        }
        if (filters.selectedColors?.length && 
            (!data.colors || !filters.selectedColors.some(color => data.colors.includes(color)))) {
          matchesFilters = false
        }
        if (filters.selectedAvailability?.length && 
            (!data.stockStatus || !filters.selectedAvailability.includes(data.stockStatus))) {
          matchesFilters = false
        }
        if (filters.selectedPromotions?.length && 
            (!data.promotions?.current || !filters.selectedPromotions.includes(data.promotions.current))) {
          matchesFilters = false
        }
        if (filters.selectedFabrics?.length && 
            (!data.materials?.fabric || !filters.selectedFabrics.includes(data.materials.fabric))) {
          matchesFilters = false
        }
      }

      if (matchesFilters) {
        matchingProducts++

        // Price calculations
        const originalPrice = data.price?.original || 0
        const discountedPrice = data.price?.discounted || 0
        const effectivePrice = discountedPrice > 0 ? discountedPrice : originalPrice

        if (effectivePrice > 0) {
          totalPrice += effectivePrice
          lowestPrice = Math.min(lowestPrice, effectivePrice)
          highestPrice = Math.max(highestPrice, effectivePrice)

          // Discount calculations
          if (discountedPrice > 0 && originalPrice > discountedPrice) {
            const discount = ((originalPrice - discountedPrice) / originalPrice) * 100
            totalDiscount += discount
            discountedProducts++
          }
        }

        // Promotion check
        if (data.promotions?.current && data.promotions.current !== "No current promotions") {
          activePromotions++
        }

        // Track last update
        if (data.scrapedAt) {
          const scrapedAt = data.scrapedAt.toDate?.() || new Date(data.scrapedAt)
          if (!lastUpdated || scrapedAt > new Date(lastUpdated)) {
            lastUpdated = scrapedAt.toISOString()
          }
        }
      }
    })

    const stats: CollectionStats = {
      totalProducts,
      matchingProducts: filters ? matchingProducts : undefined,
      averagePrice: matchingProducts > 0 ? totalPrice / matchingProducts : 0,
      lowestPrice: lowestPrice === Infinity ? 0 : lowestPrice,
      highestPrice,
      averageDiscount: discountedProducts > 0 ? totalDiscount / discountedProducts : 0,
      activePromotions,
      lastUpdated
    }

    // Update cache only if no filters
    if (!filters) {
      statsCache.set(collectionName, { stats, timestamp: Date.now() })
    }
    return stats

  } catch (error) {
    console.error(`Error getting stats for collection ${collectionName}:`, error)
    return {
      totalProducts: 0,
      matchingProducts: 0,
      averagePrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      averageDiscount: 0,
      activePromotions: 0,
      lastUpdated: new Date().toISOString()
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const skip = (page - 1) * pageSize
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    // Parse filter parameters
    const filters: FilterParams = {}
    if (searchParams.has('searchQuery')) filters.searchQuery = searchParams.get('searchQuery') || undefined
    if (searchParams.has('selectedBrands')) filters.selectedBrands = searchParams.get('selectedBrands')?.split(',')
    if (searchParams.has('selectedCategories')) filters.selectedCategories = searchParams.get('selectedCategories')?.split(',')
    if (searchParams.has('selectedSizes')) filters.selectedSizes = searchParams.get('selectedSizes')?.split(',')
    if (searchParams.has('selectedColors')) filters.selectedColors = searchParams.get('selectedColors')?.split(',')
    if (searchParams.has('selectedAvailability')) filters.selectedAvailability = searchParams.get('selectedAvailability')?.split(',')
    if (searchParams.has('selectedPromotions')) filters.selectedPromotions = searchParams.get('selectedPromotions')?.split(',')
    if (searchParams.has('selectedFabrics')) filters.selectedFabrics = searchParams.get('selectedFabrics')?.split(',')
    if (searchParams.has('priceRange')) {
      const [min, max] = searchParams.get('priceRange')?.split(',').map(Number) || [0, 1000]
      filters.priceRange = [min, max]
    }
    if (searchParams.has('ratingRange')) {
      const [min, max] = searchParams.get('ratingRange')?.split(',').map(Number) || [0, 5]
      filters.ratingRange = [min, max]
    }

    // Get all collections
    const collectionsSnapshot = await adminDb.listCollections()
    const collectionNames = collectionsSnapshot.map(col => col.id)

    // Filter out system collections
    const validCollections = collectionNames.filter(name => 
      name !== "products" && 
      name !== "batchJobs" && 
      name !== "dashboard" &&
      !name.startsWith("batchJobs-") && 
      !name.startsWith("dashboard-")
    )

    // Get stats for all collections in parallel
    const collectionStats = await Promise.all(
      validCollections.map(async (name) => {
        const stats = await getCollectionStats(name, filters, forceRefresh)
        return {
          name,
          ...stats
        }
      })
    )

    // Sort collections by matching products count (if filters applied) or last updated
    collectionStats.sort((a, b) => {
      if (filters && a.matchingProducts !== undefined && b.matchingProducts !== undefined) {
        return b.matchingProducts - a.matchingProducts
      }
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    })

    // Apply pagination
    const paginatedCollections = collectionStats.slice(skip, skip + pageSize)
    const totalCollections = collectionStats.length

    return NextResponse.json({
      collections: paginatedCollections.map(c => c.name),
      stats: paginatedCollections.reduce((acc, curr) => {
        acc[curr.name] = {
          totalProducts: curr.totalProducts,
          matchingProducts: curr.matchingProducts,
          averagePrice: curr.averagePrice,
          lowestPrice: curr.lowestPrice,
          highestPrice: curr.highestPrice,
          averageDiscount: curr.averageDiscount,
          activePromotions: curr.activePromotions,
          lastUpdated: curr.lastUpdated
        }
        return acc
      }, {} as Record<string, CollectionStats>),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCollections / pageSize),
        totalCollections,
        hasMore: skip + pageSize < totalCollections
      }
    })

  } catch (error) {
    console.error('Error in collections API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { collectionName } = await request.json();
    
    if (!collectionName) {
      return Response.json({ 
        error: 'Collection name is required',
        status: 'error'
      }, { 
        status: 400 
      });
    }

    // Get all documents in the collection
    const collectionRef = adminDb.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    // Delete all documents in the collection
    const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    return Response.json({ 
      message: `Successfully deleted collection ${collectionName}`,
      status: 'success'
    });

  } catch (error) {
    console.error('Error deleting collection:', error);
    
    return Response.json({ 
      error: 'Failed to delete collection',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { 
      status: 500 
    });
  }
}