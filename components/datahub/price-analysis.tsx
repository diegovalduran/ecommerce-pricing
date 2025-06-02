import { cn } from "@/lib/utils"
import { Package, Store, Tag, Ruler, Palette, Layers, Info, AlertCircle, Star, Link as LinkIcon, Image as ImageIcon, Search } from "lucide-react"
import { Product } from "@/types/database"
import Image from "next/image"

interface PriceAnalysisProps {
  className?: string;
  selectedProduct?: Product | null;
}

export function PriceAnalysis({ 
  className, 
  selectedProduct 
}: PriceAnalysisProps) {
  // Get effective price (discounted if available, otherwise original)
  const getEffectivePrice = (product: Product) => {
    if (!product?.price) return null;
    const price = product.price.discounted !== undefined ? product.price.discounted : product.price.original;
    return price !== undefined ? price : null;
  };

  return (
    <div className={cn(
      "w-full h-full",
      "grid grid-rows-1 gap-2",
      className
    )}>
      <div className={cn(
        "p-4 rounded-xl",
        "bg-card",
        "border border-border",
        "h-[calc(100vh-24rem)]", // Match the height of the left column
        "overflow-y-auto", // Always scrollable
        "scrollbar-none", // Hide scrollbar
        "overflow-x-hidden" // Prevent horizontal scrolling
      )}>
        {selectedProduct ? (
          <div className="space-y-6">
            {/* Header with Product Name, Price and URL */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                {selectedProduct.url && (
                  <a 
                    href={selectedProduct.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </a>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                {getEffectivePrice(selectedProduct) ? (
                  <>
                    <span className="text-2xl font-bold text-green-600">
                      {selectedProduct.price?.currency || '฿'}
                      {getEffectivePrice(selectedProduct)?.toFixed(2)}
                    </span>
                    {selectedProduct.price?.discounted && selectedProduct.price.discounted < selectedProduct.price.original && (
                      <span className="text-sm text-red-500 line-through">
                        {selectedProduct.price.currency}{selectedProduct.price.original.toFixed(2)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Price not available</span>
                )}
              </div>
            </div>

            {/* Images Section */}
            {selectedProduct.images && (
              <div className="grid grid-cols-2 gap-2">
                {selectedProduct.images.main && (
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={selectedProduct.images.main}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                {selectedProduct.images.additional && selectedProduct.images.additional.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProduct.images.additional.slice(0, 4).map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={image}
                          alt={`${selectedProduct.name} - Additional view ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Product ID</span>
                    <p className="text-sm font-medium">{selectedProduct.productId}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Store className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Store</span>
                    <p className="text-sm font-medium">{selectedProduct.store?.name}</p>
                    {selectedProduct.store?.region && (
                      <p className="text-xs text-muted-foreground">{selectedProduct.store.region}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Category</span>
                    <p className="text-sm font-medium">{selectedProduct.category}</p>
                    {selectedProduct.productType && (
                      <p className="text-xs text-muted-foreground">{selectedProduct.productType}</p>
                    )}
                  </div>
                </div>

                {/* Stock Status */}
                {selectedProduct.stockStatus && (
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Stock Status</span>
                      <p className="text-sm font-medium">{selectedProduct.stockStatus}</p>
                    </div>
                  </div>
                )}

                {/* Rating */}
                {selectedProduct.rating > 0 && (
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Rating</span>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium">{selectedProduct.rating.toFixed(1)}</p>
                        {selectedProduct.reviewCount > 0 && (
                          <p className="text-xs text-muted-foreground">({selectedProduct.reviewCount} reviews)</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Ruler className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Available Sizes</span>
                      <p className="text-sm font-medium">{selectedProduct.sizes.join(', ')}</p>
                    </div>
                  </div>
                )}

                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Colors</span>
                      <p className="text-sm font-medium">{selectedProduct.colors.join(', ')}</p>
                    </div>
                  </div>
                )}

                {/* Materials */}
                {selectedProduct.materials && (
                  <div className="flex items-start gap-2">
                    <Layers className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Materials</span>
                      <p className="text-sm font-medium">{selectedProduct.materials.fabric}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features and Details */}
            {(selectedProduct.features?.length > 0 || selectedProduct.details) && (
              <div className="pt-4 border-t">
                <div className="space-y-4">
                  {selectedProduct.features?.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Features</span>
                      <ul className="mt-1 space-y-1">
                        {selectedProduct.features.map((feature, index) => (
                          <li key={index} className="text-sm">• {feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedProduct.details && (
                    <div>
                      <span className="text-sm text-muted-foreground">Details</span>
                      <p className="text-sm mt-1">{selectedProduct.details}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Materials Info */}
            {(selectedProduct.materials?.functionDetails || 
              selectedProduct.materials?.washingInstructions || 
              selectedProduct.materials?.additionalNotes) && (
              <div className="pt-4 border-t">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-2">
                    {selectedProduct.materials?.functionDetails && (
                      <div>
                        <span className="text-sm text-muted-foreground">Function Details</span>
                        <p className="text-sm">{selectedProduct.materials.functionDetails}</p>
                      </div>
                    )}
                    {selectedProduct.materials?.washingInstructions && (
                      <div>
                        <span className="text-sm text-muted-foreground">Washing Instructions</span>
                        <p className="text-sm">{selectedProduct.materials.washingInstructions}</p>
                      </div>
                    )}
                    {selectedProduct.materials?.additionalNotes && (
                      <div>
                        <span className="text-sm text-muted-foreground">Additional Notes</span>
                        <p className="text-sm">{selectedProduct.materials.additionalNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Promotions */}
            {selectedProduct.promotions?.current && selectedProduct.promotions.current !== "No current promotions" && (
              <div className="pt-4 border-t">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Current Promotion</span>
                    <p className="text-sm font-medium">{selectedProduct.promotions.current}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-start h-full pt-8">
            <div className="text-sm text-muted-foreground mb-12">
              Select a product to view details
            </div>
            <div className="relative w-48 h-48">
              {/* Outer ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-2 border-primary/10 animate-spin-slow" />
              </div>
              
              {/* Middle ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-3/4 rounded-full border-2 border-primary/20 animate-spin-slow-reverse" />
              </div>
              
              {/* Inner ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1/2 h-1/2 rounded-full border-2 border-primary/30 animate-spin-slow" />
              </div>
              
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                  <Package className="w-8 h-8 text-primary/40 animate-pulse" />
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute inset-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 rounded-full bg-primary/10 animate-float" />
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                  <div className="w-4 h-4 rounded-full bg-primary/10 animate-float-delayed" />
                </div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
                  <div className="w-4 h-4 rounded-full bg-primary/10 animate-float" />
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                  <div className="w-4 h-4 rounded-full bg-primary/10 animate-float-delayed" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}