"use client"

import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Legend, Pie, PieChart } from "recharts"

interface ChartComponentsProps {
  competitorPricing: Array<{
    name: string
    price: number
    discounted: number
    similarity: number
    url: string | null
  }>
  priceRanges: {
    low: { name: string; value: number; color: string }
    mid: { name: string; value: number; color: string }
    high: { name: string; value: number; color: string }
  }
}

export function ChartComponents({ competitorPricing, priceRanges }: ChartComponentsProps) {
  return (
    <>
      <div>
        <h3 className="text-lg font-semibold mb-2">Price Comparison</h3>
        <p className="text-xs text-muted-foreground mb-3">Click on competitor bars to view product source</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={competitorPricing} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-4 rounded-lg shadow-lg border border-blue-100">
                      <p className="font-semibold text-lg mb-1">{data.name}</p>
                      <div className="border-t border-gray-100 pt-2 mb-2">
                        <p className="font-medium">
                          Price: <span className="font-bold">{new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'THB'
                          }).format(data.price)}</span>
                        </p>
                        {data.discounted < data.price && (
                          <p className="text-red-500 font-medium">
                            Sale: <span className="font-bold">{new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'THB'
                            }).format(data.discounted)}</span>
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Product Similarity: <span className="font-medium">{data.similarity}%</span>
                      </p>
                      {data.url ? (
                        <a 
                          href={data.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          View Product <span className="text-xs">↗</span>
                        </a>
                      ) : data.name === 'Recommended' ? (
                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full">
                          Recommended Price
                        </div>
                      ) : null}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="price"
              onClick={(data) => {
                if (data && data.url) {
                  window.open(data.url, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              {competitorPricing.map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={entry.name === 'Recommended' ? '#22c55e' : (entry.url ? '#4f46e5' : '#3b82f6')}
                  opacity={entry.similarity / 100}
                  style={entry.url ? { cursor: 'pointer', stroke: '#6366f1', strokeWidth: 1 } : {}} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Market Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={Object.values(priceRanges)}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {Object.values(priceRanges).map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  )
} 