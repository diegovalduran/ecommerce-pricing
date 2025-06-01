import { CheckCircle2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"

const topProducts = [
  { 
    name: "Nike Air Max 270", 
    priceChange: "-$25", 
    trend: "down",
    inventory: "Low Stock",
    lastUpdated: "2h ago"
  },
  { 
    name: "Adidas Ultraboost", 
    priceChange: "+$15", 
    trend: "up",
    inventory: "In Stock",
    lastUpdated: "4h ago"
  },
  { 
    name: "Puma RS-X", 
    priceChange: "-$10", 
    trend: "down",
    inventory: "Out of Stock",
    lastUpdated: "1h ago"
  },
  { 
    name: "New Balance 574", 
    priceChange: "+$20", 
    trend: "up",
    inventory: "In Stock",
    lastUpdated: "3h ago"
  },
  { 
    name: "Reebok Classic", 
    priceChange: "-$5", 
    trend: "down",
    inventory: "Low Stock",
    lastUpdated: "5h ago"
  },
]

export function TopProducts() {
  return (
    <div className="space-y-8">
      {topProducts.map((product) => (
        <div key={product.name} className="flex items-center">
          <CheckCircle2 className="mr-2 h-4 w-4 text-muted-foreground" />
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{product.name}</p>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium ${product.trend === "up" ? "text-red-500" : "text-green-500"}`}>
                {product.priceChange}
              </p>
              <span className="text-sm text-muted-foreground">•</span>
              <p className="text-sm text-muted-foreground">{product.inventory}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {product.trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            <span className="text-xs text-muted-foreground">{product.lastUpdated}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
