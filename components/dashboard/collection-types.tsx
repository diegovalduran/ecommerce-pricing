"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, ShoppingBag, Users, Search } from "lucide-react"
import { collection, getDocs } from 'firebase/firestore'
import { db } from "@/lib/firebase/config"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface Collection {
  name: string
  category: string
  categoryType: string
  region: string
  totalProducts: number
  brand: string
}

// Function to normalize category names
const normalizeCategory = (category: string): string => {
  const normalized = category.toUpperCase()
  if (normalized === "WOMEN" || normalized === "WOMAN") return "WOMEN"
  if (normalized === "MEN" || normalized === "MAN") return "MEN"
  return normalized
}

export function CollectionTypes() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = async (page: number = 1) => {
    try {
      setIsLoading(page === 1)
      setError(null)
      
      const response = await fetch(`/api/collections?page=${page}&pageSize=10`)
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.collections) {
        throw new Error('No collections data received')
      }

      // Transform collection names into structured data
      const formattedCollections = await Promise.all(
        data.collections.map(async (name: string) => {
          const parts = name.split('-')
          
          // Get product count from details
          const details = data.details.find((d: any) => d.name === name)
          const productCount = details?.totalProducts || 0

          // Extract information from collection name
          const brand = parts[0]?.toUpperCase() || 'Unknown'
          const category = normalizeCategory(parts[1] || 'Unknown')
          const categoryType = parts[2]?.toUpperCase() || 'Unknown'
          const region = parts[parts.length - 1]?.toUpperCase() || 'Unknown'

          return {
            name,
            brand,
            category,
            categoryType,
            region,
            totalProducts: productCount
          }
        })
      )

      if (page === 1) {
        setCollections(formattedCollections)
        // Extract unique categories
        const categories = [...new Set(formattedCollections.map(c => c.category))]
        setAvailableCategories(categories)
      } else {
        setCollections(prev => [...prev, ...formattedCollections])
      }

      // Update pagination state
      setHasMore(data.pagination.hasMore)
      setCurrentPage(data.pagination.currentPage)

    } catch (error) {
      console.error('Error fetching collections:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch collections')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchCollections(1)
  }, [])

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true)
      fetchCollections(currentPage + 1)
    }
  }

  // Filter collections based on search query and selected category
  const filteredCollections = collections.filter(collection => {
    const matchesSearch = searchQuery === "" || 
      collection.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collection.categoryType.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === "all" || 
      collection.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Collections</CardTitle>
          <CardDescription>Loading collections...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Collections</CardTitle>
          <CardDescription className="text-red-500">Error: {error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Collections</CardTitle>
        <CardDescription>
          Browse and search through available product collections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map((collection) => (
              <Card key={collection.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{collection.brand}</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{collection.category}</Badge>
                      <Badge variant="outline">{collection.categoryType}</Badge>
                      <Badge variant="outline">{collection.region}</Badge>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      <span>{collection.totalProducts} products</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button
                onClick={loadMore}
                disabled={isLoadingMore}
                variant="outline"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 