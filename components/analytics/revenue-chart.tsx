"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { useTheme } from "next-themes"

const data = [
  { month: "Jan", views: 1200, favorites: 450 },
  { month: "Feb", views: 1500, favorites: 520 },
  { month: "Mar", views: 1800, favorites: 680 },
  { month: "Apr", views: 2100, favorites: 750 },
  { month: "May", views: 2400, favorites: 890 },
  { month: "Jun", views: 2800, favorites: 1020 },
  { month: "Jul", views: 3200, favorites: 1150 },
  { month: "Aug", views: 3500, favorites: 1280 },
  { month: "Sep", views: 3800, favorites: 1420 },
  { month: "Oct", views: 4200, favorites: 1580 },
  { month: "Nov", views: 4500, favorites: 1680 },
  { month: "Dec", views: 4800, favorites: 1820 },
]

interface RevenueChartProps {
  comparisonPeriod: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
  }>;
  label?: string;
}

export function RevenueChart({ comparisonPeriod }: RevenueChartProps) {
  const { theme } = useTheme()

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <Card className="border-none shadow-lg">
          <CardContent className="p-2">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-sm text-muted-foreground">Views: {payload[0].value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Favorites: {payload[1].value.toLocaleString()}</p>
          </CardContent>
        </Card>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis
          dataKey="month"
          stroke={theme === "dark" ? "#888888" : "#333333"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={theme === "dark" ? "#888888" : "#333333"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => value.toLocaleString()}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="views"
          name="Views"
          stroke={theme === "dark" ? "#adfa1d" : "#0ea5e9"}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="favorites"
          name="Favorites"
          stroke={theme === "dark" ? "#1e40af" : "#3b82f6"}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
