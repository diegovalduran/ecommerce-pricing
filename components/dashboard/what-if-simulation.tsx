"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

export function WhatIfSimulation() {
  const [basePrice, setBasePrice] = useState(100)
  const [priceChange, setPriceChange] = useState(0)
  const [prediction, setPrediction] = useState<string | null>(null)

  useEffect(() => {
    const newPrice = basePrice * (1 + priceChange / 100)
    const revenueChange = (newPrice / basePrice - 1) * 100
    const demandChange = -((newPrice / basePrice - 1) * 100) // Simplified demand elasticity

    setPrediction(
      `At $${newPrice.toFixed(2)}, predicted revenue change is ${revenueChange.toFixed(
        2,
      )}% with an estimated demand change of ${demandChange.toFixed(2)}%.`,
    )
  }, [basePrice, priceChange])

  return (
    <Card>
      <CardHeader>
        <CardTitle>What-If Simulation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Price Change (%)</Label>
            <Slider
              min={-50}
              max={50}
              step={1}
              value={[priceChange]}
              onValueChange={(value) => setPriceChange(value[0])}
            />
            <div className="text-sm text-muted-foreground">
              {priceChange > 0 ? "+" : ""}
              {priceChange}%
            </div>
          </div>
          {prediction && (
            <div className="pt-4">
              <Label>Prediction</Label>
              <p className="text-sm text-muted-foreground mt-1">{prediction}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

