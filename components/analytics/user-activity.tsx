import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Database, Download, Upload, Search, Filter, RefreshCw } from "lucide-react"

const userActivities = [
  {
    id: "1",
    user: "System",
    action: "Completed product data scrape",
    time: "2 minutes ago",
    icon: Database,
    details: "1,234 products updated",
  },
  {
    id: "2",
    user: "Auto-Import",
    action: "Imported new collection",
    time: "10 minutes ago",
    icon: Upload,
    details: "Nike Air Max collection",
  },
  {
    id: "3",
    user: "Data Sync",
    action: "Price update completed",
    time: "15 minutes ago",
    icon: RefreshCw,
    details: "Updated 567 product prices",
  },
  {
    id: "4",
    user: "System",
    action: "New data source added",
    time: "30 minutes ago",
    icon: Search,
    details: "Added StockX API integration",
  },
]

export function UserActivity() {
  return (
    <div className="space-y-4">
      {userActivities.map((activity) => (
        <Card key={activity.id} className="p-4">
          <CardContent className="flex items-center p-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <activity.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-4 flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">{activity.user}</p>
              <p className="text-xs text-muted-foreground">{activity.action}</p>
              <p className="text-xs text-muted-foreground">{activity.details}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
