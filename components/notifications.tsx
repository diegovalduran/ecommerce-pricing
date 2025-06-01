"use client"

import { useState } from "react"
import { Bell, X, Database, AlertTriangle, RefreshCw, Search, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const notifications = [
  {
    id: 1,
    title: "Data Collection Complete",
    message: "Successfully scraped 1,234 new products from StockX",
    date: "2 minutes ago",
    icon: Database,
    color: "text-blue-500",
  },
  {
    id: 2,
    title: "Price Alert",
    message: "Significant price drop detected for Nike Air Max 270",
    date: "10 minutes ago",
    icon: AlertTriangle,
    color: "text-yellow-500",
  },
  {
    id: 3,
    title: "API Status",
    message: "StockX API response time increased by 200ms",
    date: "15 minutes ago",
    icon: RefreshCw,
    color: "text-orange-500",
  },
  {
    id: 4,
    title: "New Data Source",
    message: "Successfully integrated GOAT API for price tracking",
    date: "30 minutes ago",
    icon: Search,
    color: "text-green-500",
  },
  {
    id: 5,
    title: "Collection Update",
    message: "Nike Air Max collection has grown by 15% this week",
    date: "1 hour ago",
    icon: TrendingUp,
    color: "text-purple-500",
  },
  {
    id: 6,
    title: "System Warning",
    message: "High memory usage detected in data processing queue",
    date: "2 hours ago",
    icon: AlertCircle,
    color: "text-red-500",
  },
]

export function Notifications() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
      </Button>
      {isOpen && (
        <Card className="absolute right-0 mt-2 w-96 z-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Notifications</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close notifications">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className="mb-4 last:mb-0 border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className={`${notification.color} p-2 rounded-full bg-opacity-10`}>
                        <notification.icon className={`h-5 w-5 ${notification.color}`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{notification.date}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
