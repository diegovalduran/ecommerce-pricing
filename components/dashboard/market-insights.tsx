"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import dynamic from 'next/dynamic'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowRight, ArrowUp, TrendingDown, TrendingUp } from "lucide-react"

// Dynamically import chart components with no SSR
const ChartComponents = dynamic(
  () => import('./chart-components').then(mod => mod.ChartComponents),
  { ssr: false }
)

interface MarketInsightsProps {
  competitors: Array<{
    name: string
    price: {
      original: number
      discounted: number
      currency: string
    }
    similarity: number
    url?: string
  }>
  recommendedPrice: number
  insights: Array<{
    type: string
    description: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
}

export function MarketInsights({ competitors, recommendedPrice, insights }: MarketInsightsProps) {
  // Process competitor data for visualization
  const competitorPricing = competitors.map(c => ({
    name: c.name,
    price: c.price.original,
    discounted: c.price.discounted,
    similarity: Math.round(c.similarity * 100),
    url: c.url || null
  })).concat([{
    name: 'Recommended',
    price: recommendedPrice,
    discounted: recommendedPrice,
    similarity: 100,
    url: null
  }]);

  // Calculate price distribution
  const priceRanges = {
    low: { name: 'Below Average', value: 0, color: '#ef4444' },
    mid: { name: 'Average', value: 0, color: '#3b82f6' },
    high: { name: 'Above Average', value: 0, color: '#22c55e' }
  };

  const avgPrice = competitorPricing.reduce((acc, curr) => acc + curr.price, 0) / competitorPricing.length;

  competitorPricing.forEach(comp => {
    if (comp.price < avgPrice * 0.9) priceRanges.low.value++;
    else if (comp.price > avgPrice * 1.1) priceRanges.high.value++;
    else priceRanges.mid.value++;
  });

  // Market position analysis
  const marketPosition = recommendedPrice > avgPrice ? 'premium' : 
    recommendedPrice < avgPrice ? 'competitive' : 'balanced';

  const positionColor = {
    premium: 'text-green-600',
    competitive: 'text-blue-600',
    balanced: 'text-yellow-600'
  }[marketPosition];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Market Position Analysis</CardTitle>
          <CardDescription>
            Your recommended price positions you as a
            <span className={`font-semibold ${positionColor} mx-1`}>
              {marketPosition}
            </span>
            player in the market
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <ChartComponents 
              competitorPricing={competitorPricing}
              priceRanges={priceRanges}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Insights</CardTitle>
          <CardDescription>
            Key insights to inform your pricing strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <Alert
                key={index}
                variant={insight.impact === 'positive' ? 'default' : 
                        insight.impact === 'negative' ? 'destructive' : 'default'}
              >
                <div className="flex items-center gap-2">
                  {insight.impact === 'positive' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : insight.impact === 'negative' ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  <AlertTitle>{insight.type}</AlertTitle>
                </div>
                <AlertDescription>{insight.description}</AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

