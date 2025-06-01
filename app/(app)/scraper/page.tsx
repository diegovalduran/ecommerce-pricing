"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Package, FolderTree, Settings, AlertCircle, HelpCircle, Trash2, RefreshCw, Users, Globe, Tag, ShoppingBag, Store, Clock, X } from "lucide-react"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { createOrUpdateCollection, fetchCollections, fetchCollectionDetails, deleteCollection, CollectionData } from "@/lib/firebase"
import { toast } from "sonner"

interface CollectionDetail {
  name: string;
  totalProducts: number;
  lastUpdated: number;
}

interface RecentScrape {
  id: string;
  url: string;
  brand: string;
  category: string;
  targetAudience: string;
  region: string;
  status: 'completed' | 'failed' | 'in-progress';
  timestamp: string;
  collectionName: string;
  batchProgress?: {
    phase: 'collecting' | 'scraping';
    progress: number;
    total: number;
    completed: number;
    failed: number;
  };
  lastUpdated?: number;
}

const BatchProgress = ({ progress }: { progress: RecentScrape['batchProgress'] }) => {
  if (!progress) return null;

  if (progress.phase === 'collecting') {
    // Show spinner while collecting links
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        <span className="text-sm text-muted-foreground">Collecting product links...</span>
      </div>
    );
  }

  // Use completed/total for a more accurate progress bar
  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Scraping products...</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {progress.completed} completed, {progress.failed} failed
        </span>
        <span>
          {progress.completed + progress.failed} / {progress.total} products
        </span>
      </div>
    </div>
  );
};

export default function ScraperPage() {
  const [scrapeType, setScrapeType] = useState<"product" | "category">("product")
  const [url, setUrl] = useState("")
  const [category, setCategory] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [region, setRegion] = useState("")
  const [brand, setBrand] = useState("")
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [recentScrapes, setRecentScrapes] = useState<RecentScrape[]>([])
  const [collections, setCollections] = useState<CollectionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isFormValid = url && category && targetAudience && region && brand

  // Fetch collections on component mount
  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/collections')
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.collections || !data.details) {
        throw new Error('No collections data received')
      }

      // Create a map of collection details for quick lookup
      const detailsMap = new Map(
        data.details.map((detail: CollectionDetail) => [detail.name, detail])
      )

      // Parse collection names into structured data
      const formattedCollections = data.collections
        .filter((name: string) => name !== "products" && name !== "Dashboard Inputs")
        .map((name: string) => {
          const parts = name.split('-')
          
          // Extract brand (first part)
          const brand = parts[0]?.toUpperCase() || 'Unknown'
          
          // Extract target audience (second part)
          const targetAudience = parts[1]?.toUpperCase() || 'Unknown'
          
          // Extract category (remaining parts joined)
          const category = parts.slice(2).join(' ').toUpperCase() || 'Unknown'

          // Get details from the map
          const details = detailsMap.get(name) as CollectionDetail || { 
            totalProducts: 0, 
            lastUpdated: Date.now() 
          }

          return {
            name,
            brand,
            category,
            targetAudience,
            totalProducts: details.totalProducts,
            lastUpdated: details.lastUpdated
          }
        })

      setCollections(formattedCollections)
    } catch (error) {
      console.error('Error loading collections:', error)
      toast.error('Failed to load collections')
    } finally {
      setIsLoading(false)
    }
  }

  // Load recent scrapes on component mount
  useEffect(() => {
    loadRecentScrapes();
  }, []);

  const loadRecentScrapes = async () => {
    try {
      const response = await fetch('/api/recent-scrapes');
      if (!response.ok) throw new Error('Failed to fetch recent scrapes');
      const data = await response.json();
      setRecentScrapes(data.scrapes);
    } catch (error) {
      console.error('Error loading recent scrapes:', error);
      toast.error('Failed to load recent scrapes');
    }
  };

  const handleDeleteCategory = async (collectionName: string) => {
    setCategoryToDelete(collectionName)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      const response = await fetch('/api/collections', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collectionName: categoryToDelete }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete collection')
      }

      toast.success(data.message || 'Collection deleted successfully')
      // Refresh collections
      await loadCollections()
    } catch (error) {
      console.error('Error deleting collection:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete collection')
    } finally {
      setCategoryToDelete(null)
    }
  }

  const handleRescrape = async (collectionName: string) => {
    // TODO: Implement rescraping functionality
    toast.info('Rescraping functionality coming soon')
  }

  // Mock data for categories
  const categories = [
    {
      name: "Men's Clothing",
      categoryType: "Shorts",
      targetAudience: "men",
      region: "japan",
      brand: "Nike",
      lastUpdated: "2 days ago",
      totalProducts: 156
    },
    {
      name: "Women's Accessories",
      categoryType: "Bags",
      targetAudience: "women",
      region: "thailand",
      brand: "Adidas",
      lastUpdated: "1 week ago",
      totalProducts: 89
    }
  ]

  const handleScrape = async () => {
    if (!url || !brand || !category || !targetAudience || !region) {
      toast.error('Please fill in all fields');
      return;
    }

    const batchId = crypto.randomUUID();
    const scrapeId = scrapeType === 'category' ? batchId : crypto.randomUUID();
    const collectionName = `${brand}-${targetAudience}-${category}-${region}`.toLowerCase();

    const scrape: RecentScrape = {
      id: scrapeId,
      url,
      brand,
      category,
      targetAudience,
      region,
      timestamp: new Date().toISOString(),
      collectionName,
      status: 'in-progress' as const,
      batchProgress: scrapeType === 'category' ? {
        phase: 'collecting' as const,
        progress: 0,
        total: 0,
        completed: 0,
        failed: 0
      } : undefined
    };

    // Add to recent scrapes
    await fetch('/api/recent-scrapes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scrape)
    });

    setRecentScrapes(prev => [scrape, ...prev]);

    try {
      if (scrapeType === 'product') {
        // Single product scraping
        const response = await fetch('/api/universal-scraper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url,
            brand,
            category,
            targetAudience,
            region
          })
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        
        // For single product scraping, start polling
        const updatedScrape: RecentScrape = {
          ...scrape,
          status: 'in-progress' as const
        };

        await fetch('/api/recent-scrapes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedScrape)
        });

        setRecentScrapes((prev: RecentScrape[]) => 
          prev.map((s: RecentScrape) => s.id === scrapeId ? updatedScrape : s)
        );

        // Start polling the universal scraper status
        pollUniversalScraperStatus(data.jobId, scrapeId, brand, targetAudience, category, region);
      } else {
        // Category scraping
        const response = await fetch('/api/batch-scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId,
            categoryUrl: url,
            brand,
            category,
            targetAudience,
            region,
            batchSize: 20
          })
        });

        if (!response.ok) {
          throw new Error('Failed to start batch scraping');
        }

        pollBatchStatus(batchId, scrapeId);
      }
    } catch (error) {
      console.error('Error during scraping:', error);
      toast.error('Failed to start scraping');

      // Update scrape status to failed
      const failedScrape: RecentScrape = {
        ...scrape,
        status: 'failed' as const
      };

      await fetch('/api/recent-scrapes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(failedScrape)
      });

      setRecentScrapes((prev: RecentScrape[]) => 
        prev.map((s: RecentScrape) => s.id === scrapeId ? failedScrape : s)
      );
    }
  };

  // Update the pollBatchStatus function
  const pollBatchStatus = (batchId: string, scrapeId: string) => {
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const response = await fetch(`/api/batch-scrape?batchId=${batchId}`);
        if (!response.ok) throw new Error('Failed to fetch batch status');
        const data = await response.json();

        setRecentScrapes(prev => prev.map(s => {
          if (s.id !== scrapeId) return s;
          return {
            ...s,
            status: data.status as 'completed' | 'failed' | 'in-progress',
            batchProgress: {
              phase: data.phase,
              progress: data.progress,
              total: data.total,
              completed: data.completed,
              failed: data.failed,
            },
            lastUpdated: Date.now(),
          };
        }));

        if (data.status === 'in-progress') {
          setTimeout(poll, 1000); // Poll every second
        } else {
          stopped = true; // Stop polling when done
        }
      } catch (error) {
        console.error('Error polling batch status:', error);
        // Optionally, you can retry or stop polling on error
      }
    };
    poll();
    // Optionally return a stop function if you want to cancel polling
    return () => { stopped = true; };
  };

  // Add new polling function for universal scraper
  const pollUniversalScraperStatus = async (
    jobId: string, 
    scrapeId: string,
    brand: string,
    targetAudience: string,
    category: string,
    region: string
  ) => {
    const maxAttempts = 300; // 5 minutes maximum
    let attempts = 0;

    const updateScrapeStatus = async (status: 'completed' | 'failed' | 'in-progress') => {
      await fetch('/api/recent-scrapes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scrapeId, status })
      });

      setRecentScrapes(prev => {
        const updated = prev.map(s =>
          s.id === scrapeId ? { ...s, status } : s
        );
        console.log('📊 Updated recent scrapes (after status change):', updated);
        return updated;
      });
    };

    const poll = async () => {
      try {
        console.log(`🔄 Polling attempt ${attempts + 1}/${maxAttempts} for job ${jobId}`);
        const response = await fetch(
          `/api/universal-scraper?jobId=${jobId}&brand=${brand}&targetAudience=${targetAudience}&category=${category}&region=${region}`
        );
        if (!response.ok) throw new Error('Failed to fetch scraper status');
        const data = await response.json();
        console.log('📊 Polling response:', data);

        // Only mark as completed if both status and uploadSuccess are true
        if (data.status === 'completed' && data.uploadSuccess) {
          console.log('✅ Job and upload both completed, updating status');
          await updateScrapeStatus('completed');
          toast.success('Product scraping completed successfully');
          return;
        }

        if (data.status === 'failed') {
          console.log('❌ Job failed, updating status');
          await updateScrapeStatus('failed');
          toast.error('Product scraping failed');
          return;
        }

        // If not completed or failed, or upload not done, keep polling
        if (attempts < maxAttempts) {
          console.log('⏳ Still waiting for completion or upload. Continuing to poll...');
          attempts++;
          setTimeout(() => poll(), 1000);
        } else {
          console.log('⚠️ Max attempts reached, marking as failed');
          await updateScrapeStatus('failed');
          toast.error('Scraping timed out after 5 minutes');
        }
      } catch (error) {
        console.error('❌ Error polling scraper status:', error);
        toast.error('Failed to check scraping status');
        await updateScrapeStatus('failed');
      }
    };

    // Start polling
    console.log('🚀 Starting polling for job:', jobId);
    poll();
  };

  const clearRecentScrapes = async () => {
    try {
      await fetch('/api/recent-scrapes', {
        method: 'DELETE'
      });
      setRecentScrapes([]);
      toast.success('Recent scrapes cleared');
    } catch (error) {
      console.error('Error clearing recent scrapes:', error);
      toast.error('Failed to clear recent scrapes');
    }
  };

  // On mount, resume polling for any in-progress batch scrapes and sync with backend
  useEffect(() => {
    recentScrapes.forEach(async scrape => {
      if (
        scrape.status === 'in-progress' &&
        scrape.batchProgress &&
        scrape.batchProgress.phase &&
        scrape.collectionName &&
        scrape.id &&
        scrape.collectionName.includes('-') // crude check for batch jobs
      ) {
        // Fetch latest status from backend before polling
        try {
          const response = await fetch(`/api/batch-scrape?batchId=${scrape.id}`);
          if (response.ok) {
            const data = await response.json();
            setRecentScrapes(prev => prev.map(s => {
              if (s.id !== scrape.id) return s;
              return {
                ...s,
                status: data.status as 'completed' | 'failed' | 'in-progress',
                batchProgress: {
                  phase: data.phase,
                  progress: data.progress,
                  total: data.total,
                  completed: data.completed,
                  failed: data.failed,
                },
                lastUpdated: Date.now(),
              };
            }));
          }
        } catch (err) {
          // ignore error, polling will handle it
        }
        pollBatchStatus(scrape.id, scrape.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Scraper</h2>
      </div>

      <Tabs defaultValue="scrape" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scrape" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Scrape Data
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scrape" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Scrape</CardTitle>
              <CardDescription>
                Enter a product URL or category page to scrape data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                defaultValue="product"
                value={scrapeType}
                onValueChange={(value) => setScrapeType(value as "product" | "category")}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="product"
                    id="product"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="product"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Package className="mb-3 h-6 w-6" />
                    Single Product
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="category"
                    id="category"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="category"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <FolderTree className="mb-3 h-6 w-6" />
                    Category Page
                  </Label>
                </div>
              </RadioGroup>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="url">URL</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enter the full URL of the product or category page you want to scrape</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="url"
                    placeholder={scrapeType === "product" ? "Enter product URL" : "Enter category URL"}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="category">Category</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enter the main category for this product (e.g., T-Shirts, Dresses, Sneakers)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="category"
                      placeholder="Enter category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="brand">Brand</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enter the brand name (e.g., Nike, Adidas, Zara)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="brand"
                      placeholder="Enter brand"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="targetAudience">Target Audience</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select the primary audience for this product</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={targetAudience} onValueChange={setTargetAudience}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="men">Men</SelectItem>
                        <SelectItem value="women">Women</SelectItem>
                        <SelectItem value="kids">Kids</SelectItem>
                        <SelectItem value="unisex">Unisex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="region">Region</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select the region where this product is being sold</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="japan">Japan</SelectItem>
                        <SelectItem value="thailand">Thailand</SelectItem>
                        <SelectItem value="singapore">Singapore</SelectItem>
                        <SelectItem value="malaysia">Malaysia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    disabled={!isFormValid} 
                    onClick={handleScrape}
                  >
                    Start Scrape
                  </Button>
                </div>
              </div>

              {scrapeType === "category" && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <p>Category scraping may take longer and will collect multiple products.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Scrapes</CardTitle>
                <CardDescription>
                  View the status of your recent scraping jobs
                </CardDescription>
              </div>
              {recentScrapes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentScrapes}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentScrapes.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No recent scrapes
                </div>
              ) : (
                <div className="space-y-4">
                  {recentScrapes.map((scrape) => (
                    <div key={scrape.id + (scrape.lastUpdated || '')} className="flex flex-col border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate max-w-[300px]">{scrape.url}</p>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Store className="h-3 w-3" />
                                {scrape.brand}
                              </Badge>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {scrape.category}
                              </Badge>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {scrape.targetAudience}
                              </Badge>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {scrape.region}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(scrape.timestamp).toLocaleString()}
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              Collection: {scrape.collectionName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {scrape.batchProgress && (
                            <>
                              <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white" style={{ background: '#22c55e' }}>
                                {scrape.batchProgress.completed} Success
                              </span>
                              <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white" style={{ background: '#ef4444' }}>
                                {scrape.batchProgress.failed} Failed
                              </span>
                            </>
                          )}
                          <Badge
                            variant={
                              scrape.status === 'completed'
                                ? 'default'
                                : scrape.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {scrape.status === 'completed'
                              ? 'Completed'
                              : scrape.status === 'failed'
                              ? 'Failed'
                              : 'In Progress'}
                          </Badge>
                        </div>
                      </div>
                      {scrape.status === 'in-progress' && scrape.batchProgress && (
                        <BatchProgress progress={scrape.batchProgress} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Collection Management</CardTitle>
                <CardDescription>
                  View and manage your scraped collections
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadCollections}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : collections.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No collections found
                </div>
              ) : (
                <div className="space-y-4">
                  {collections.map((collection) => (
                    <div key={collection.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-2"
                          onClick={() => handleRescrape(collection.name)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Rescrape
                        </Button>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium">{collection.name}</h4>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Store className="h-3 w-3" />
                                {collection.brand}
                              </Badge>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {collection.category}
                              </Badge>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {collection.targetAudience}
                              </Badge>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {collection.region}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Last updated {new Date(collection.lastUpdated).toLocaleString()}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ShoppingBag className="h-3.5 w-3.5" />
                              {collection.totalProducts} products
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => handleDeleteCategory(collection.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scraper Settings</CardTitle>
              <CardDescription>
                Configure your scraping preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Settings coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the collection "{categoryToDelete}" and all its associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
