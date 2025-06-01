"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, Search, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductInputProps {
  onSubmit: (data: ProductData) => void
  onAnalysisComplete: () => void
  isAnalyzing?: boolean
  initialData?: ProductData
}

export interface ProductData {
  name: string
  description?: string
  category?: string
  image: File | null
  inventory?: number
  // Price recommendation data
  recommendedPrice?: number
  currency?: string
  competitorsCount?: number
  insightsCount?: number
  "analyzed description"?: {
    genre: string
    length: string
    type: string
    pattern: string
    graphic: string
    fabrics: string[]
  }
  insights?: Array<{
    type: string
    description: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
  competitors?: Array<{
    name: string
    price: {
      original: number
      discounted: number
      currency: string
    }
    similarity: number
    url?: string
  }>
  reasoning?: string[]
}

export function ProductInput({ onSubmit, onAnalysisComplete, isAnalyzing, initialData }: ProductInputProps) {
  const [productName, setProductName] = useState(initialData?.name || "")
  const [category, setCategory] = useState(initialData?.category || "")
  const [image, setImage] = useState<File | null>(initialData?.image || null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ 
      name: productName, 
      category, 
      image 
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }

  return (
    <div className={cn("w-full p-6", isAnalyzing ? "opacity-50 pointer-events-none" : "")}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="productName"
                placeholder="e.g. Blue Slim Fit Jeans"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>



          <div className="space-y-2">
            <Label htmlFor="image">Product Image (Optional)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="image"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {image ? image.name : "Click to upload product image"}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isAnalyzing || (!productName && !image)}>
            {isAnalyzing ? "Analyzing..." : "Get Price Recommendation"}
          </Button>
        </div>
      </form>
    </div>
  )
}
