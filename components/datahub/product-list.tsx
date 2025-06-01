import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Product } from "@/types/database"
import { cn } from "@/lib/utils"
import { Package, Link as LinkIcon } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

interface ProductListProps {
  products: Product[]
  totalProducts: number
  isLoading: boolean
  error: string | null
  selectedProductId?: string
  onProductSelect: (product: Product | null) => void
  onProductLink: (product: Product) => void
}

export function ProductList({
  products,
  totalProducts,
  isLoading,
  error,
  selectedProductId,
  onProductSelect,
  onProductLink
}: ProductListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Products</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-sm text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {products.length} of {totalProducts} products
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto overflow-x-hidden pr-2">
              {products.map((product) => (
                <Card
                  key={product.productId}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedProductId === product.productId
                      ? "border-primary"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => onProductSelect(selectedProductId === product.productId ? null : product)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Product Images Stack */}
                      <div className="relative w-16 flex-shrink-0">
                        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted">
                          {product.images?.main && (
                            <Image
                              src={product.images.main}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        {product.images?.additional && product.images.additional.length > 0 && (
                          <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted mt-3">
                            <Image
                              src={product.images.additional[0]}
                              alt={`${product.name} - Additional view`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-medium leading-none truncate">{product.name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{product.store?.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              onProductLink(product)
                            }}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Price</span>
                            <span className="font-medium text-green-600">
                              {product.price?.currency || '฿'}
                              {product.price?.discounted || product.price?.original}
                            </span>
                          </div>
                          {product.price?.discounted && product.price.discounted < product.price.original && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Original</span>
                              <span className="text-sm text-red-500 line-through">
                                {product.price.currency}{product.price.original}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Category</span>
                            <span className="text-sm">
                              {product.category}
                              {product.productType && ` - ${product.productType}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">ID</span>
                            <span className="text-sm text-muted-foreground font-mono">{product.productId}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
