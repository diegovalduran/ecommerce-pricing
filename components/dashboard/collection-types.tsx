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

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch('/api/collections')
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.collections) {
          throw new Error('No collections data received')
        }

        // Transform collection names into structured data and fetch product counts
        const formattedCollections = await Promise.all(
          data.collections
            .filter((name: string) => name !== "products")
            .map(async (name: string) => {
              const parts = name.split('-')
              
              // Get product count for this collection
              const collectionRef = collection(db, name)
              const snapshot = await getDocs(collectionRef)
              const productCount = snapshot.size

              // Extract information from collection name
              const brand = parts[0]?.toUpperCase() || 'Unknown'
              const category = normalizeCategory(parts[1] || 'Unknown') // Normalize category
              const categoryType = parts[2]?.toUpperCase() || 'Unknown' // e.g., "SHIRTS", "JEANS"
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

        setCollections(formattedCollections)

        // Extract unique categories (they're already normalized)
        const categories = [...new Set(formattedCollections.map(c => c.category))]
        setAvailableCategories(categories)
      } catch (error) {
        console.error('Error fetching collections:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCollections()
  }, [])

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Collections</CardTitle>
        <CardDescription>Browse and analyze data from these collections</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by brand or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            {!isLoading && (
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
            )}
          </div>

          <div className="h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-2">
              {filteredCollections.map((collection) => (
                <div
                  key={collection.name}
                  className="group flex flex-col rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="font-semibold text-base truncate">{collection.brand}</h3>
                      <p className="text-sm text-muted-foreground truncate">{collection.categoryType}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="flex items-center gap-1 font-medium text-xs whitespace-nowrap">
                          <Users className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[60px]">{collection.category}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <ShoppingBag className="h-3 w-3 shrink-0" />
                        <span>{collection.totalProducts.toLocaleString()} products</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 