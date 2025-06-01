"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Printer, Database, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react"

type ReportType = "Data Collection Summary" | "Product Performance" | "Price Analysis" | "Data Source Health" | "Collection Growth" | "System Performance"

const reportTypes: ReportType[] = [
  "Data Collection Summary",
  "Product Performance",
  "Price Analysis",
  "Data Source Health",
  "Collection Growth",
  "System Performance",
]

interface ReportData {
  id: number;
  metric: string;
  value: string;
}

const dummyReportData: Record<ReportType, ReportData[]> = {
  "Data Collection Summary": [
    { id: 1, metric: "Total Products Tracked", value: "45,231" },
    { id: 2, metric: "New Products Added", value: "2,350" },
    { id: 3, metric: "Price Updates", value: "12,234" },
    { id: 4, metric: "Data Sources Active", value: "12" },
    { id: 5, metric: "Collection Growth Rate", value: "18.6%" },
  ],
  "Product Performance": [
    { id: 1, metric: "Most Tracked Products", value: "Nike Air Max Series" },
    { id: 2, metric: "Price Change Frequency", value: "Every 2.5 hours" },
    { id: 3, metric: "Average Price Range", value: "$120 - $350" },
    { id: 4, metric: "Top Performing Brands", value: "Nike, Adidas, New Balance" },
    { id: 5, metric: "Price Volatility Index", value: "Medium" },
  ],
  "Price Analysis": [
    { id: 1, metric: "Average Price Change", value: "+5.2%" },
    { id: 2, metric: "Price Update Success Rate", value: "98.5%" },
    { id: 3, metric: "Price Discrepancies Found", value: "234" },
    { id: 4, metric: "Market Price Trends", value: "Upward" },
    { id: 5, metric: "Price Update Frequency", value: "Every 3 hours" },
  ],
  "Data Source Health": [
    { id: 1, metric: "Active Sources", value: "12/12" },
    { id: 2, metric: "API Response Time", value: "1.2s avg" },
    { id: 3, metric: "Data Freshness", value: "98.5%" },
    { id: 4, metric: "Error Rate", value: "0.5%" },
    { id: 5, metric: "Last Health Check", value: "2 minutes ago" },
  ],
  "Collection Growth": [
    { id: 1, metric: "Total Collections", value: "156" },
    { id: 2, metric: "New Collections", value: "+12 this month" },
    { id: 3, metric: "Average Collection Size", value: "289 products" },
    { id: 4, metric: "Growth Rate", value: "18.6%" },
    { id: 5, metric: "Most Active Collection", value: "Nike Air Max" },
  ],
  "System Performance": [
    { id: 1, metric: "Data Processing Rate", value: "1,234 items/min" },
    { id: 2, metric: "API Call Success Rate", value: "99.8%" },
    { id: 3, metric: "Average Response Time", value: "850ms" },
    { id: 4, metric: "System Uptime", value: "99.9%" },
    { id: 5, metric: "Last System Check", value: "1 minute ago" },
  ],
}

export function ReportsTab() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(reportTypes[0])

  const handleGenerateReport = () => {
    console.log(`Generating ${selectedReport} report...`)
  }

  const handleDownloadReport = () => {
    console.log(`Downloading ${selectedReport} report...`)
  }

  const handlePrintReport = () => {
    console.log(`Printing ${selectedReport} report...`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
          <Select value={selectedReport} onValueChange={(value: ReportType) => setSelectedReport(value)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateReport}>Generate Report</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{selectedReport} Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyReportData[selectedReport].map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.metric}</TableCell>
                  <TableCell>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={handleDownloadReport}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={handlePrintReport}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
