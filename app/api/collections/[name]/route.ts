import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin-config'
import { FilterParams } from '../route'

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const skip = (page - 1) * pageSize

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

    // Build query based on filters
    let collectionQuery = adminDb.collection(params.name)
      .select(
        'name',
        'price.original',
        'price.discounted',
        'promotions.current',
        'scrapedAt',
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
    }

    // Get total count first
    const totalSnapshot = await collectionQuery.count().get()
    const totalProducts = totalSnapshot.data().count

    // Apply pagination
    collectionQuery = collectionQuery
      .orderBy('scrapedAt', 'desc')
      .limit(pageSize)
      .offset(skip)

    const snapshot = await collectionQuery.get()
    const products = []

    // Process products and apply in-memory filters
    for (const doc of snapshot.docs) {
      const data = doc.data()
      let matchesFilters = true

      // Apply in-memory filters
      if (filters) {
        if (filters.selectedSizes?.length && 
            (!data.sizes || !filters.selectedSizes.some((size: string) => data.sizes.includes(size)))) {
          matchesFilters = false
        }
        if (filters.selectedColors?.length && 
            (!data.colors || !filters.selectedColors.some((color: string) => data.colors.includes(color)))) {
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
        products.push({
          id: doc.id,
          ...data,
          scrapedAt: data.scrapedAt?.toDate?.() || data.scrapedAt
        })
      }
    }

    // Calculate matching products count
    const matchingProducts = products.length

    return NextResponse.json({
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / pageSize),
        totalProducts,
        matchingProducts,
        hasMore: skip + pageSize < totalProducts
      }
    })

  } catch (error) {
    console.error(`Error fetching collection ${params.name}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    )
  }
}

// ... rest of the code (DELETE method) stays the same ... 