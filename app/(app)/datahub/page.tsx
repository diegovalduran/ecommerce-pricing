"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { DatabaseOverview } from "@/components/datahub/database-overview"
import { DatabaseConfigurator } from "@/components/datahub/database-configurator"
import { ProductList } from "@/components/datahub/product-list"
import { PriceAnalysis } from "@/components/datahub/price-analysis"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Product, FilterState, Stats } from "@/types/database"
import { collection, getDocs, query, limit, startAfter } from 'firebase/firestore';
import { db } from "@/lib/firebase/config";
import { filterProducts } from "@/utils/product-filters"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import debounce from 'lodash/debounce'

// Cache for collection data
const collectionCache = new Map<string, Product[]>()

export default function DataHubPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [displayCount, setDisplayCount] = useState(99)
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 1000],
    minRating: 0,
    sortBy: "relevance",
  })
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    averagePrice: "$0",
    searchResults: 0,
    lowestPrice: "$0",
    highestPrice: "$0",
    uniqueStores: 0,
    averageDiscount: "0.0%",
    activePromotions: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [competitorProduct, setCompetitorProduct] = useState<Product | null>(null);
  
  // New state for pagination
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 100;

  // Add new states for all filters
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([])
  const [selectedPromotions, setSelectedPromotions] = useState<string[]>([])
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 5])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreCollections, setHasMoreCollections] = useState(true)
  const [loadedCollections, setLoadedCollections] = useState<string[]>([])
  const BATCH_SIZE = 99

  // Handle color changes
  const handleColorChange = (colors: React.SetStateAction<string[]>) => {
    setSelectedColors(colors);
  };

  // Memoized filter function
  const applyFilters = useCallback((products: Product[]) => {
    const hasActiveFilters = 
      selectedColors.length > 0 ||
      selectedAvailability.length > 0 ||
      searchQuery.trim() !== '' ||
      selectedBrands.length > 0 ||
      selectedCategories.length > 0 ||
      selectedSizes.length > 0 ||
      selectedPromotions.length > 0 ||
      selectedFabrics.length > 0 ||
      priceRange[0] > 0 ||
      priceRange[1] < 1000 ||
      ratingRange[0] > 0 ||
      ratingRange[1] < 5

    if (!hasActiveFilters) return products

    return filterProducts(products, {
      selectedColors,
      searchQuery,
      selectedBrands,
      selectedCategories,
      selectedSizes,
      selectedAvailability,
      selectedPromotions,
      selectedFabrics,
      priceRange,
      ratingRange
    })
  }, [
    selectedColors,
    searchQuery,
    selectedBrands,
    selectedCategories,
    selectedSizes,
    selectedAvailability,
    selectedPromotions,
    selectedFabrics,
    priceRange,
    ratingRange
  ])

  // Debounced filter update
  const debouncedFilterUpdate = useMemo(
    () => debounce((products: Product[]) => {
      setFilteredProducts(applyFilters(products))
    }, 300),
    [applyFilters]
  )

  // Update filters when dependencies change
  useEffect(() => {
    if (!products.length) return
    debouncedFilterUpdate(products)
  }, [products, debouncedFilterUpdate])

  const handleProductSelect = (product: Product | null) => {
    setSelectedProduct(product);
  };

  const handleProductLink = (product: Product) => {
    setCompetitorProduct(product);
  };

  // Function to fetch a single collection
  const fetchCollection = async (collectionName: string): Promise<Product[]> => {
    // Check cache first
    if (collectionCache.has(collectionName)) {
      return collectionCache.get(collectionName)!
    }

    try {
      let allProducts: Product[] = []
      let lastDoc = null
      let hasMore = true
      const BATCH_SIZE = 100 // Smaller batch size for better performance
      
      while (hasMore) {
        let q = query(
          collection(db, collectionName),
          limit(BATCH_SIZE)
        )
        if (lastDoc) {
          q = query(
            collection(db, collectionName),
            startAfter(lastDoc),
            limit(BATCH_SIZE)
          )
        }
        
        const snapshot = await getDocs(q)
        const productsFromBatch = snapshot.docs.map(doc => {
          const data = doc.data()
          const collectionParts = collectionName.split('-')
          
          const category = collectionParts[1] || data.category || 'Unknown'
          const productType = collectionParts.slice(2).join(' ')
            .replace(/-/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')

          return {
            ...data,
            productId: doc.id,
            category: category.toUpperCase(),
            productType: productType || 'Unknown'
          }
        }) as Product[]
        
        allProducts = [...allProducts, ...productsFromBatch]
        
        lastDoc = snapshot.docs[snapshot.docs.length - 1]
        hasMore = snapshot.docs.length === BATCH_SIZE // Only continue if we got a full batch
      }

      // Cache the results
      collectionCache.set(collectionName, allProducts)
      return allProducts

    } catch (error) {
      console.error(`Error fetching collection ${collectionName}:`, error)
      return []
    }
  }

  // Function to fetch multiple collections in parallel with rate limiting
  const fetchCollectionsParallel = async (collectionNames: string[]) => {
    const BATCH_SIZE = 3 // Process 3 collections at a time
    const results: Product[][] = []
    
    for (let i = 0; i < collectionNames.length; i += BATCH_SIZE) {
      const batch = collectionNames.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(name => fetchCollection(name))
      )
      results.push(...batchResults)
      
      // Add a small delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < collectionNames.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results.flat()
  }

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const collectionsResponse = await fetch('/api/collections')
        if (!collectionsResponse.ok) {
          throw new Error(`API returned ${collectionsResponse.status}`)
        }
        
        const data = await collectionsResponse.json()
        
        if (!data.collections) {
          throw new Error('No collections data received')
        }

        // Filter out products, batchJobs, dashboard collections and their variants
        const validCollections = data.collections.filter((name: string) => 
          name !== "products" && 
          name !== "batchJobs" && 
          name !== "dashboard" &&
          !name.startsWith("batchJobs-") && 
          !name.startsWith("dashboard-")
        )
        const firstBatch = validCollections.slice(0, BATCH_SIZE)
        setLoadedCollections(firstBatch)
        setHasMoreCollections(validCollections.length > BATCH_SIZE)

        // Fetch first batch in parallel
        const allProducts = await fetchCollectionsParallel(firstBatch)
        
        setProducts(allProducts)
        setFilteredProducts(allProducts)

        // Calculate initial stats
        updateStats(allProducts)

      } catch (error) {
        console.error('Error fetching products:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch products')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Function to update stats
  const updateStats = (products: Product[]) => {
    const validProducts = products.filter(p => {
      const effectivePrice = p.price?.discounted > 0 ? p.price.discounted : p.price?.original
      return effectivePrice && effectivePrice > 0
    })

    const avgPrice = calculateAveragePrice(validProducts)
    const lowestPrice = findLowestPrice(validProducts)
    const highestPrice = findHighestPrice(validProducts)
    const avgDiscount = calculateAverageDiscount(validProducts)
    const activePromos = countActivePromotions(validProducts)
    
    const storeToCompany = (store: string) => {
      if (store.toLowerCase().includes('zara')) return 'ZARA'
      if (store.toLowerCase().includes('h&m') || store.toLowerCase().includes('hm')) return 'H&M'
      if (store.toLowerCase().includes('uniqlo')) return 'UNIQLO'
      return store
    }

    const uniqueStores = new Set(
      validProducts.map(p => storeToCompany(p.store?.name || ''))
    ).size

    setStats({
      totalProducts: validProducts.length,
      averagePrice: `$${avgPrice.toFixed(2)}`,
      searchResults: validProducts.length,
      lowestPrice: `$${lowestPrice.toFixed(2)}`,
      highestPrice: `$${highestPrice.toFixed(2)}`,
      uniqueStores: uniqueStores,
      averageDiscount: `${avgDiscount.toFixed(1)}%`,
      activePromotions: activePromos,
    })
  }

  // Function to load more collections
  const loadMoreCollections = async () => {
    if (isLoadingMore || !hasMoreCollections) return

    setIsLoadingMore(true)
    try {
      const collectionsResponse = await fetch('/api/collections')
      if (!collectionsResponse.ok) throw new Error(`API returned ${collectionsResponse.status}`)
      
      const data = await collectionsResponse.json()
      if (!data.collections) throw new Error('No collections data received')

      // Filter out products, batchJobs, dashboard collections and their variants
      const validCollections = data.collections.filter((name: string) => 
        name !== "products" && 
        name !== "batchJobs" && 
        name !== "dashboard" &&
        !name.startsWith("batchJobs-") && 
        !name.startsWith("dashboard-")
      )
      const nextBatch = validCollections.slice(loadedCollections.length, loadedCollections.length + BATCH_SIZE)
      
      if (nextBatch.length === 0) {
        setHasMoreCollections(false)
        return
      }

      // Fetch next batch in parallel
      const newProducts = await fetchCollectionsParallel(nextBatch)

      setLoadedCollections(prev => [...prev, ...nextBatch])
      setProducts(prev => [...prev, ...newProducts])
      setFilteredProducts(prev => [...prev, ...newProducts])
      setHasMoreCollections(validCollections.length > loadedCollections.length + BATCH_SIZE)

      // Update stats with all products
      updateStats([...products, ...newProducts])

    } catch (error) {
      console.error('Error loading more collections:', error)
      setError(error instanceof Error ? error.message : 'Failed to load more collections')
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Function to load more products
  const loadMoreProducts = () => {
    setDisplayCount(prevCount => prevCount + 99);
  };

  // Calculate displayed products based on filtered results
  const displayedProducts = filteredProducts.slice(0, displayCount);

  // Helper functions for stats calculation
  const calculateAveragePrice = (products: Product[]) => {
    if (products.length === 0) return 0;
    const sum = products.reduce((acc, p) => {
      const effectivePrice = p.price?.discounted > 0 ? p.price.discounted : p.price?.original;
      return acc + (effectivePrice || 0);
    }, 0);
    return (sum / products.length);
  };

  const findLowestPrice = (products: Product[]) => {
    if (products.length === 0) return 0;
    
    const allPrices = products.flatMap(p => [
      p.price?.original || Infinity,
      p.price?.discounted || Infinity
    ]);
    
    const validPrices = allPrices.filter(price => price !== Infinity);
    const min = 0; // Force minimum to 0

    return min;
  };

  const findHighestPrice = (products: Product[]) => {
    if (products.length === 0) return 0;
    
    // Consider both original and discounted prices
    const allPrices = products.flatMap(p => [
      p.price?.original || 0,
      p.price?.discounted || 0
    ]);
    
    return Math.max(...allPrices);
  };

  const calculateAverageDiscount = (products: Product[]) => {
    // Filter products that have actual discounts (discounted price is lower than original)
    const discountedProducts = products.filter(p => 
      p.price?.original && 
      p.price?.discounted && 
      p.price.discounted < p.price.original
    );

    if (discountedProducts.length === 0) return 0;

    const sum = discountedProducts.reduce((acc, p) => {
      // Calculate actual discount percentage
      const original = p.price?.original || 0;
      const discounted = p.price?.discounted || 0;
      const discountPercentage = ((original - discounted) / original) * 100;
      return acc + discountPercentage;
    }, 0);

    return (sum / discountedProducts.length);
  };

  const countActivePromotions = (products: Product[]) => {
    return products.filter(p => p.promotions?.current && p.promotions.current !== "No current promotions").length;
  };

  // Add this function to your DataHubPage component
  const extractDistinctValues = () => {
    if (!products || products.length === 0) return;

    // Extract distinct sizes
    const allSizes = products
      .flatMap(p => p.sizes || [])
      .filter(Boolean);
    const distinctSizes = [...new Set(allSizes)].sort();
    
    // Extract distinct availability statuses
    const allAvailability = products
      .map(p => p.stockStatus)
      .filter(Boolean);
    const distinctAvailability = [...new Set(allAvailability)].sort();
    
    // Extract distinct promotions
    const allPromotions = products
      .map(p => p.promotions?.current)
      .filter(Boolean)
      .filter(p => p !== "No current promotions");
    const distinctPromotions = [...new Set(allPromotions)].sort();
    
    // Extract distinct fabrics
    const allFabrics = products
      .map(p => p.materials?.fabric)
      .filter(Boolean)
      .filter(f => f !== "-" && f !== "");
    const distinctFabrics = [...new Set(allFabrics)].sort();
    
    // Extract distinct categories
    const allCategories = products
      .map(p => p.category)
      .filter(Boolean);
    const distinctCategories = [...new Set(allCategories)].sort();
    
    // Extract distinct brands/stores
    const allStores = products
      .map(p => p.store?.name)
      .filter(Boolean);
    const distinctStores = [...new Set(allStores)].sort();
  };

  // Call this function after products are loaded
  useEffect(() => {
    if (products.length > 0) {
      extractDistinctValues();
    }
  }, [products]);

  // Update price range when stats are calculated
  useEffect(() => {
    if (stats.lowestPrice !== "$0" && stats.highestPrice !== "$0") {
      setPriceRange([
        parseFloat(stats.lowestPrice.replace('$', '')),
        parseFloat(stats.highestPrice.replace('$', ''))
      ]);
    }
  }, [stats.lowestPrice, stats.highestPrice]);

  return (
    <main className="flex-1 overflow-y-auto bg-background [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Data Hub</h2>
          <Button onClick={() => {}} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr] lg:grid-cols-[1fr,3fr] gap-4">
            <div className="space-y-4">
              <DatabaseOverview 
                stats={stats}
                isLoading={isLoading}
                productsCount={filteredProducts.length}
              />
              <DatabaseConfigurator
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedBrands={selectedBrands}
                setSelectedBrands={setSelectedBrands}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                selectedSizes={selectedSizes}
                setSelectedSizes={setSelectedSizes}
                selectedColors={selectedColors}
                setSelectedColors={handleColorChange}
                selectedAvailability={selectedAvailability}
                setSelectedAvailability={setSelectedAvailability}
                onRemoveAvailability={(status) => setSelectedAvailability(prev => prev.filter(s => s !== status))}
                selectedPromotions={selectedPromotions}
                setSelectedPromotions={setSelectedPromotions}
                onRemovePromotion={(promo) => setSelectedPromotions(prev => prev.filter(p => p !== promo))}
                selectedFabrics={selectedFabrics}
                setSelectedFabrics={setSelectedFabrics}
                onRemoveFabric={(fabric) => setSelectedFabrics(prev => prev.filter(f => f !== fabric))}
                priceRangeLimits={[
                  parseFloat(stats.lowestPrice.replace('$', '')), 
                  parseFloat(stats.highestPrice.replace('$', ''))
                ]}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                ratingRange={ratingRange}
                setRatingRange={setRatingRange}
                filters={filters}
                setFilters={setFilters}
                isLoading={isLoading}
                onRemoveBrand={(brandId) => setSelectedBrands(prev => prev.filter(b => b !== brandId))}
                onRemoveCategory={(categoryId) => setSelectedCategories(prev => prev.filter(c => c !== categoryId))}
                onRemoveColor={(colorId) => setSelectedColors(prev => prev.filter(c => c !== colorId))}
              />
            </div>
            
            <PriceAnalysis 
              selectedProduct={selectedProduct}
            />
          </div>

          <ProductList 
            products={displayedProducts}
            totalProducts={filteredProducts.length}
            isLoading={isLoading}
            error={error}
            selectedProductId={selectedProduct?.productId}
            onProductSelect={handleProductSelect}
            onProductLink={handleProductLink}
          />

          {displayedProducts.length < filteredProducts.length && (
            <div className="flex justify-center py-4">
              <Button
                onClick={loadMoreProducts}
                className="flex items-center gap-2"
              >
                Load More Products ({displayedProducts.length} of {filteredProducts.length})
              </Button>
            </div>
          )}

          {hasMoreCollections && (
            <div className="flex justify-center py-4">
              <Button
                onClick={loadMoreCollections}
                disabled={isLoadingMore}
                className="flex items-center gap-2"
              >
                {isLoadingMore ? 'Loading...' : 'Load More Collections'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}