"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Activity, 
  AlertCircle, 
  Clock, 
  Database, 
  Download, 
  Search, 
  Server, 
  Shield, 
  Zap 
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function LoggingPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">Monitor API usage, system health, and activity logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Logs
          </Button>
          <Button className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            System Status
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,521</div>
            <p className="text-xs text-muted-foreground">+12.3% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Crawlers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">2 high priority tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.9%</div>
            <p className="text-xs text-muted-foreground">Uptime last 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Processed</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4GB</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="logs">Recent Logs</TabsTrigger>
            <TabsTrigger value="api">API Usage</TabsTrigger>
            <TabsTrigger value="crawlers">Crawler Status</TabsTrigger>
            <TabsTrigger value="alerts">System Alerts</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-8 w-[200px]" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Logs</CardTitle>
              <CardDescription>Latest system events and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Log Entry */}
                <div className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">INFO</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">FireCrawl completed collection update</p>
                    <p className="text-sm text-muted-foreground">Updated 1,245 products in ZARA collection</p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    2m ago
                  </div>
                </div>

                {/* Log Entry */}
                <div className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">WARNING</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">High API usage detected</p>
                    <p className="text-sm text-muted-foreground">Rate limit approaching for H&M crawler</p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    15m ago
                  </div>
                </div>

                {/* Log Entry */}
                <div className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">ERROR</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Database connection timeout</p>
                    <p className="text-sm text-muted-foreground">Failed to update price history for 3 items</p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    1h ago
                  </div>
                </div>

                {/* Log Entry */}
                <div className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">SUCCESS</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Price update completed</p>
                    <p className="text-sm text-muted-foreground">Successfully updated prices for 500 items</p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    5m ago
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Usage Statistics</CardTitle>
              <CardDescription>Detailed breakdown of API calls and resource usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Placeholder for API usage charts */}
                <p className="text-muted-foreground">API usage charts will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crawlers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crawler Status</CardTitle>
              <CardDescription>Current status of all web crawlers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Placeholder for crawler status */}
                <p className="text-muted-foreground">Crawler status information will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Active system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Placeholder for system alerts */}
                <p className="text-muted-foreground">System alerts will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
