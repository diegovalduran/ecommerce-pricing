import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, TrendingUp, RefreshCw, Search } from "lucide-react"

const cards = [
  {
    title: "Total Products Tracked",
    icon: Database,
    amount: "45,231",
    description: "+2,350 from last month",
    trend: "up",
  },
  {
    title: "Active Data Sources",
    icon: Search,
    amount: "12",
    description: "+2 new sources added",
    trend: "up",
  },
  {
    title: "Price Updates Today",
    icon: RefreshCw,
    amount: "12,234",
    description: "+19% from yesterday",
    trend: "up",
  },
  {
    title: "Collection Growth",
    icon: TrendingUp,
    amount: "18.6%",
    description: "+5.4% from last month",
    trend: "up",
  },
]

interface OverviewCardsProps {
  comparisonPeriod: string;
}

export function OverviewCards({ comparisonPeriod }: OverviewCardsProps) {
  return (
    <>
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.amount}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
            <div
              className={`mt-2 flex items-center text-xs ${card.trend === "up" ? "text-green-500" : "text-red-500"}`}
            >
              {card.trend === "up" ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingUp className="mr-1 h-3 w-3 transform rotate-180" />
              )}
              {card.description.split(" ")[0]}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
