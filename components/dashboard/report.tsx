"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProductData } from "./product-input"
import { PricingRecommendation } from "./pricing-recommendation"
import { MarketInsights } from "./market-insights"
import { AnalysisStatistics } from "./analysis-statistics"
import Image from "next/image"
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportProps {
  productData: ProductData & {
    stats?: {
      timings: {
        total: number
        search: number
        analysis: number
      }
      results: {
        totalProducts: number
        relevantProducts: number
        validPricing: number
        collections: number
        avgSimilarity: number
        priceRange: {
          min: number
          max: number
          avg: number
          variance: number
        }
      }
    }
  }
}

export function Report({ productData }: ReportProps) {
  return (
    <div className="space-y-6" id="analysis-report-root">
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Name:</h3>
              <p>{productData.name}</p>
            </div>
            {productData.description && (
              <div>
                <h3 className="font-semibold">Description:</h3>
                <p>{productData.description}</p>
              </div>
            )}
            {productData.inventory && (
              <div>
                <h3 className="font-semibold">Inventory:</h3>
                <p>{productData.inventory}</p>
              </div>
            )}
            {productData.image && (
              <div>
                <h3 className="font-semibold">Image:</h3>
                <Image
                  src={URL.createObjectURL(productData.image)}
                  alt={productData.name}
                  width={200}
                  height={200}
                  className="object-cover rounded-md"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PricingRecommendation 
        recommendedPrice={productData.recommendedPrice}
        currency={productData.currency}
        reasoning={productData.reasoning}
      />

      <MarketInsights 
        competitors={productData.competitors || []}
        recommendedPrice={productData.recommendedPrice || 0}
        insights={productData.insights || []}
      />

      {productData.stats && (
        <AnalysisStatistics 
          stats={productData.stats} 
          currency={productData.currency || 'USD'} 
        />
      )}
    </div>
  )
}
