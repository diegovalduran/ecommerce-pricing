import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";
import { Logger } from "@/app/utils/logger";
import { adminDb } from '@/lib/firebase/admin-config';

// Initialize FireCrawl client
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY || ""
});

// Helper function to extract URLs from HTML
function extractUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  try {
    // Basic regex to find links in HTML
    const linkRegex = /href=["'](https?:\/\/[^"']+|\/[^"']+)["']/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1].trim();
      if (isLikelyProductUrl(url)) {
        urls.push(url);
      }
    }
    
    return [...new Set(urls)];
  } catch (error) {
    console.error("Error extracting URLs from HTML:", error);
    return [];
  }
}

// Check if URL is likely a product URL
function isLikelyProductUrl(url: string): boolean {
  const productPatterns = [
    /\/product\//i,
    /\/p\/[a-zA-Z0-9]/i,
    /\/item\//i,
    /\/products\//i,
    /shop\/[^\/]+\/[^\/]+$/i,
    /details?/i,
    /\/dp\//i,
    /\/pd\//i,
    /\/[a-zA-Z0-9]{5,}\.html$/i
  ];
  
  const negativePatterns = [
    /\.(jpg|jpeg|png|gif|css|js)$/i,
    /\/(cart|checkout|account|login|register|search)\/?$/i,
    /facebook\.com/i,
    /twitter\.com/i,
    /instagram\.com/i
  ];
  
  if (negativePatterns.some(pattern => pattern.test(url))) {
    return false;
  }
  
  return productPatterns.some(pattern => pattern.test(url));
}

// Schema for batch request
const batchRequestSchema = z.object({
  batchId: z.string().optional(),
  categoryUrl: z.string(),
  brand: z.string(),
  targetAudience: z.string(),
  category: z.string(),
  region: z.string(),
  batchSize: z.number().optional().default(20) // Default to 20 concurrent scrapes
});

// Interface for request body
interface BatchRequest {
  batchId?: string;
  categoryUrl: string;
  brand: string;
  targetAudience: string;
  category: string;
  region: string;
  batchSize?: number;
}

// Store active jobs
const activeJobs = new Map<string, {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  total: number;
  completed: number;
  failed: number;
  results: any[];
  phase: 'collecting' | 'scraping';
}>();

// Persist batch job progress to Firestore
async function updateBatchJobInDb(batchId: string, job: any) {
  try {
    // Update batchJobs (for backend tracking)
    await adminDb.collection('batchJobs').doc(batchId).set({
      completed: job.completed,
      failed: job.failed,
      phase: job.phase,
      progress: job.progress,
      total: job.total,
      status: job.status,
      results: job.results,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });

    // Also update recent-scrapes (for frontend display)
    await adminDb.collection('recent-scrapes').doc(batchId).set({
      batchProgress: {
        completed: job.completed,
        failed: job.failed,
        phase: job.phase,
        progress: job.progress,
        total: job.total,
      },
      status: job.status,
      lastUpdated: new Date().toISOString(),
      // Optionally add more fields if needed
    }, { merge: true });
  } catch (err) {
    console.error('❌ Failed to update batch job in Firestore:', err);
  }
}

export async function POST(request: NextRequest) {
  const logger = new Logger('batch-scrape');
  logger.log("🚀 Received batch scraping request");
  
  try {
    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Parse request body
    const body = await request.json() as BatchRequest;
    
    // Validate request
    const validatedData = batchRequestSchema.parse(body);
    logger.log("📄 Batch request:", {
      categoryUrl: validatedData.categoryUrl,
      brand: validatedData.brand,
      targetAudience: validatedData.targetAudience,
      category: validatedData.category,
      region: validatedData.region,
      batchSize: validatedData.batchSize
    });
    
    // Use provided batchId or generate one
    const batchId = validatedData.batchId || Date.now().toString();
    
    // Initialize batch job
    activeJobs.set(batchId, {
      status: 'pending',
      progress: 0,
      total: 0,
      completed: 0,
      failed: 0,
      results: [],
      phase: 'collecting'
    });
    
    // Start processing in background
    processBatch(batchId, validatedData, baseUrl, logger, true).catch(error => {
      logger.error("❌ Batch processing error:", error);
      const job = activeJobs.get(batchId);
      if (job) {
        job.status = 'failed';
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Batch scraping started",
      batchId
    });
    
  } catch (error) {
    logger.error("❌ Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    logger.close();
  }
}

// Process the entire batch
async function processBatch(batchId: string, data: BatchRequest, baseUrl: string, logger: Logger, useTestUrls: boolean = false) {
  const job = activeJobs.get(batchId);
  if (!job) return;
  
  job.status = 'in-progress';
  const { categoryUrl, brand, targetAudience, category, region, batchSize = 20 } = data;
  
  try {
    let productUrls: string[] = [];
    
    // Original link collection logic
    logger.log("🔍 Collecting product links from category page...");
    const linksResponse = await fetch(`${baseUrl}/api/collect-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: categoryUrl })
    });

    if (!linksResponse.ok) {
      throw new Error(`Failed to collect links: ${linksResponse.statusText}`);
    }

    const { jobId: linksJobId } = await linksResponse.json();
    if (!linksJobId) {
      throw new Error('No job ID returned from collect-links');
    }

    // Poll for links collection completion
    let attempts = 0;
    const maxAttempts = 300;
    const pollInterval = 2000; // 2 seconds between polls

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `${baseUrl}/api/collect-links?jobId=${linksJobId}&url=${encodeURIComponent(categoryUrl)}`
      );

      if (!statusResponse.ok) {
        throw new Error(`Failed to check links status: ${statusResponse.statusText}`);
      }

      const status = await statusResponse.json();
      logger.log(`📊 Current status:`, status);

      if (status.status === 'completed') {
        // Get URLs from either data.productUrls or data.results.productUrls
        const urls = status.data?.productUrls || status.data?.results?.productUrls || [];
        productUrls = urls;
        logger.log(`✅ Got ${productUrls.length} product URLs from completed status`);
        break;
      } else if (status.status === 'failed') {
        throw new Error('Link collection failed');
      } else if (status.status === 'processing') {
        logger.log(`⏳ Still processing... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Link collection timed out after 10 minutes');
    }

    // Update job with total URLs found (even if it's 0)
    job.total = productUrls.length;
    job.phase = 'scraping';
    logger.log(`✅ Found ${productUrls.length} product URLs to scrape`);
    await updateBatchJobInDb(batchId, job);
    // Add a short delay to allow the frontend to catch up
    await new Promise(resolve => setTimeout(resolve, 100));

    // If we have URLs, proceed with scraping
    if (productUrls.length > 0) {
      // Step 2: Process URLs in batches
      for (let i = 0; i < productUrls.length; i += batchSize) {
        const batch = productUrls.slice(i, i + batchSize);
        logger.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(productUrls.length/batchSize)}`);
        
        for (const url of batch) {
          try {
            const result = await processUrl(url, brand, targetAudience, category, region, baseUrl);
            job.completed++;
            job.results.push(result);
            logger.log(`✅ Successfully processed URL: ${url}`);
            await updateBatchJobInDb(batchId, job);
          } catch (error) {
            job.failed++;
            logger.error(`Failed to process URL: ${url}`, error);
            await updateBatchJobInDb(batchId, job);
          }
          job.progress = Math.round(((job.completed + job.failed) / job.total) * 100);
          logger.log(`📊 Progress: ${job.progress}% (${job.completed} completed, ${job.failed} failed)`);
          await updateBatchJobInDb(batchId, job);

          // If this is the last product, mark as completed/failed and update Firestore
          if ((job.completed + job.failed) === job.total) {
            job.status = job.failed === job.total ? 'failed' : 'completed';
            logger.log(`🏁 Batch processing ${job.status}. Total: ${job.total}, Completed: ${job.completed}, Failed: ${job.failed}`);
            await updateBatchJobInDb(batchId, job);
          }
        }
        // Small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      logger.log("⚠️ No product URLs found to scrape");
    }
    
  } catch (error) {
    logger.error("❌ Batch processing error:", error);
    job.status = 'failed';
    await updateBatchJobInDb(batchId, job);
  }
}

// Process individual URL using the universal-scraper endpoint
async function processUrl(url: string, brand: string, targetAudience: string, category: string, region: string, baseUrl: string) {
  const logger = new Logger('process-url');
  try {
    // Start extraction using universal-scraper endpoint
    const startResponse = await fetch(`${baseUrl}/api/universal-scraper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, brand, targetAudience, category, region })
    });

    if (!startResponse.ok) {
      throw new Error(`Failed to start extraction: ${startResponse.statusText}`);
    }

    const { jobId } = await startResponse.json();
    if (!jobId) {
      throw new Error('No job ID returned from universal-scraper');
    }

    // Poll for results
    let resultData = null;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `${baseUrl}/api/universal-scraper?jobId=${jobId}&brand=${brand}&targetAudience=${targetAudience}&category=${category}&region=${region}`
      );

      if (!statusResponse.ok) {
        throw new Error(`Failed to check status: ${statusResponse.statusText}`);
      }

      const status = await statusResponse.json();
      logger.log(`📊 Current status for ${url}:`, status);

      if (status.status === 'completed' && status.data) {
        resultData = status.data;
        break;
      } else if (status.status === 'failed') {
        throw new Error('Extraction failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!resultData) {
      throw new Error('Extraction timed out');
    }

    return resultData;

  } catch (error) {
    logger.error(`❌ Error processing URL ${url}:`, error);
    throw error;
  } finally {
    logger.close();
  }
}

// Get batch status
export async function GET(request: NextRequest) {
  const batchId = request.nextUrl.searchParams.get("batchId");
  
  if (!batchId) {
    return NextResponse.json(
      { error: "Batch ID is required" },
      { status: 400 }
    );
  }
  
  let job = activeJobs.get(batchId);
  if (!job || !job.status || typeof job.progress !== 'number' || typeof job.total !== 'number' || typeof job.completed !== 'number' || typeof job.failed !== 'number' || !job.phase) {
    return NextResponse.json(
      { error: "Batch job not found or incomplete data" },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    total: job.total,
    completed: job.completed,
    failed: job.failed,
    results: job.results
  });
}
