"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { useTheme } from "next-themes"

const data = [
  { month: "Jan", newProducts: 45, totalProducts: 450 },
  { month: "Feb", newProducts: 52, totalProducts: 502 },
  { month: "Mar", newProducts: 68, totalProducts: 570 },
  { month: "Apr", newProducts: 75, totalProducts: 645 },
  { month: "May", newProducts: 89, totalProducts: 734 },
  { month: "Jun", newProducts: 102, totalProducts: 836 },
  { month: "Jul", newProducts: 115, totalProducts: 951 },
  { month: "Aug", newProducts: 128, totalProducts: 1079 },
  { month: "Sep", newProducts: 142, totalProducts: 1221 },
  { month: "Oct", newProducts: 158, totalProducts: 1379 },
  { month: "Nov", newProducts: 168, totalProducts: 1547 },
  { month: "Dec", newProducts: 182, totalProducts: 1729 },
]

interface AccountGrowthProps {
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

export function AccountGrowth({ comparisonPeriod }: AccountGrowthProps) {
  const { theme } = useTheme()

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <Card className="border-none shadow-lg">
          <CardContent className="p-2">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-sm text-muted-foreground">New Products: {payload[0].value}</p>
            <p className="text-sm text-muted-foreground">Total Products: {payload[1].value}</p>
          </CardContent>
        </Card>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="month"
          stroke={theme === "dark" ? "#888888" : "#333333"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis stroke={theme === "dark" ? "#888888" : "#333333"} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="newProducts" fill={theme === "dark" ? "#adfa1d" : "#0ea5e9"} radius={[4, 4, 0, 0]} />
        <Bar dataKey="totalProducts" fill={theme === "dark" ? "#1e40af" : "#3b82f6"} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
