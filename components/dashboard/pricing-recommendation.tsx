"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PricingRecommendationProps {
  recommendedPrice?: number;
  currency?: string;
  reasoning?: string[];
}

export function PricingRecommendation({ 
  recommendedPrice = 149.99,
  currency = "USD",
  reasoning = []
}: PricingRecommendationProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Recommendation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center mt-1">
            <span className="text-3xl font-bold">
              {formatCurrency(recommendedPrice)}
            </span>
            <Badge variant="secondary" className="ml-2">
              AI Recommended
            </Badge>
          </div>
        </div>
        {reasoning.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Reasoning</label>
            <ul className="list-disc pl-4 space-y-1">
              {reasoning.map((reason, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

