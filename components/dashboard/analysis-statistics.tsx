"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gauge, Clock, Database, Target } from "lucide-react"
import { formatNumber } from "@/lib/utils/format"

interface AnalysisStatisticsProps {
  stats: {
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
  currency: string
}

export function AnalysisStatistics({ stats, currency }: AnalysisStatisticsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Analysis Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Performance Metrics */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" /> Performance
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Time:</div>
              <div>{stats.timings.total.toFixed(0)}ms</div>
              <div>Search Time:</div>
              <div>{stats.timings.search.toFixed(0)}ms</div>
              <div>Analysis Time:</div>
              <div>{stats.timings.analysis.toFixed(0)}ms</div>
            </div>
          </div>

          {/* Data Coverage */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" /> Coverage
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Products:</div>
              <div>{formatNumber(stats.results.totalProducts)}</div>
              <div>Relevant Products:</div>
              <div>{formatNumber(stats.results.relevantProducts)}</div>
              <div>Collections:</div>
              <div>{stats.results.collections}</div>
            </div>
          </div>

          {/* Market Analysis */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" /> Market Analysis
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Price Range:</div>
              <div>
                {formatNumber(stats.results.priceRange.min)} - {formatNumber(stats.results.priceRange.max)} {currency}
              </div>
              <div>Average Price:</div>
              <div>{formatNumber(stats.results.priceRange.avg)} {currency}</div>
              <div>Price Volatility:</div>
              <div>{((Math.sqrt(stats.results.priceRange.variance) / stats.results.priceRange.avg) * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" /> Quality Metrics
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Valid Price Points:</div>
              <div>{stats.results.validPricing}</div>
              <div>Avg. Similarity:</div>
              <div>{(stats.results.avgSimilarity * 100).toFixed(1)}%</div>
              <div>Market Coverage:</div>
              <div>{((stats.results.relevantProducts / stats.results.totalProducts) * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
