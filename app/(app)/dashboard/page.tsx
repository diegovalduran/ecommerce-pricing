"use client"

import { ProductAnalysis } from "@/components/dashboard/product-analysis"
import { CollectionTypes } from "@/components/dashboard/collection-types"
import { useState } from "react"

export default function DashboardPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showReport, setShowReport] = useState(false)

  return (
    <main className="flex-1 overflow-y-auto bg-background [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Product Analysis</h2>
        </div>

        <div className="space-y-4">
          <ProductAnalysis 
            onAnalysisStateChange={setIsAnalyzing} 
            onReportStateChange={setShowReport}
          />
          {!isAnalyzing && !showReport && <CollectionTypes />}
        </div>
      </div>
    </main>
  )
} 