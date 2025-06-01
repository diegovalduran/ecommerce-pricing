// id-fix-route.ts - fixed to handle 'id' field correctly
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";

// Initialize FireCrawl client
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY || ""
});

// Simple schema for product URLs
const productLinksSchema = z.object({
  productUrls: z.array(z.string())
});

// Interface for request body
interface CategoryRequest {
  url: string;
}

export async function POST(request: NextRequest) {
  console.log("🚀 Received category URL extraction request");
  
  try {
    // Parse request body
    const body = await request.json() as CategoryRequest;
    console.log("📄 Category URL:", body.url);
    
    if (!body.url) {
      return NextResponse.json(
        { error: "Category URL is required" },
        { status: 400 }
      );
    }
    
    return await extractCategoryLinks(body.url);
    
  } catch (error) {
    console.error("❌ Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Extract all product links from a category page
async function extractCategoryLinks(url: string) {
  console.log(`🔍 Starting product link extraction for: ${url}`);
  try {
    console.log("📡 Starting extraction with direct API call and FIRE-1 agent...");
    
    // Enhanced prompt with explicit waiting instructions
    const enhancedPrompt = `Extract ALL product URLs from this e-commerce category page.

IMPORTANT - Follow these steps in order:
1. WAIT: After the page loads, wait 5 seconds for JavaScript to fully initialize
2. SCROLL: Scroll down slowly to trigger any lazy-loading of products
3. WAIT: Wait another 3 seconds after scrolling
4. FIND PRODUCTS: Look for product cards, tiles, or grid items
5. EXTRACT LINKS: Get the URLs from all product items
6. CHECK PAGINATION: Look for page numbers, "Next", "Load More" buttons
7. NAVIGATE: If pagination exists, click through ALL pages
8. REPEAT: For each new page, repeat steps 1-5

For EACH product card or tile, look for clickable links that would take a user to the product detail page. These are typically on:
- Product images
- Product titles
- "View" or "Details" buttons

This is an e-commerce site, so product URLs typically contain patterns like:
- /product/
- /p/
- /item/
- /detail/
- Product IDs (numbers or alphanumeric codes)

Return ALL product URLs you find across ALL pages.`;
    
    // Create the request body
    const requestBody = {
      urls: [url],
      prompt: enhancedPrompt,
      schema: {
        type: "object",
        properties: {
          productUrls: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["productUrls"]
      },
      agent: {
        model: "FIRE-1"
      }
    };
    
    console.log("📝 Request body:", JSON.stringify(requestBody, null, 2));
    
    // Make direct API call
    const response = await fetch("https://api.firecrawl.dev/v1/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ FireCrawl API error response:", errorText);
      throw new Error(`FireCrawl API error: ${response.status} - ${errorText}`);
    }
    
    // Parse the response
    const extractionJob = await response.json();
    console.log("📊 FireCrawl API response:", JSON.stringify(extractionJob, null, 2));
    
    // Get the job ID - FIXED: Checking specifically for 'id' first
    let jobId: string | undefined;
    
    if (extractionJob && typeof extractionJob === 'object') {
      // Check different possible property names, prioritizing 'id' based on the response
      if ('id' in extractionJob) {
        jobId = extractionJob.id;
        console.log("✅ Found job ID in 'id' field:", jobId);
      } else if ('jobId' in extractionJob) {
        jobId = extractionJob.jobId;
        console.log("✅ Found job ID in 'jobId' field:", jobId);
      } else if ('job_id' in extractionJob) {
        jobId = extractionJob.job_id;
        console.log("✅ Found job ID in 'job_id' field:", jobId);
      }
    }
    
    if (!jobId) {
      console.error("❌ No job ID in response:", extractionJob);
      throw new Error("No job ID returned from FireCrawl API");
    }
    
    console.log(`✅ Started extraction job with ID: ${jobId}`);
    
    // Return the job ID to the client
    return NextResponse.json({
      success: true,
      message: "Category link extraction started with JavaScript loading instructions",
      jobId: jobId
    });
    
  } catch (error) {
    console.error("❌ Failed to start extraction:", error);
    return NextResponse.json(
      { 
        error: "Failed to extract product links", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Get status of extraction job
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  
  if (!jobId) {
    return NextResponse.json(
      { error: "Job ID is required" },
      { status: 400 }
    );
  }
  
  console.log(`🔍 Checking status for job ID: ${jobId}`);
  
  try {
    // When checking status, ensure we're using the correct field name too
    let jobStatus;
    try {
      jobStatus = await firecrawl.getExtractStatus(jobId);
      console.log(`📊 Job status:`, JSON.stringify(jobStatus, null, 2));
    } catch (statusError) {
      console.error("❌ Standard getExtractStatus failed:", statusError);
      
      // Try direct API call as fallback
      console.log("⚠️ Trying direct API call for status...");
      
      // Try both status endpoints for compatibility
      let statusResponse;
      try {
        // Try v1 endpoint first
        statusResponse = await fetch(`https://api.firecrawl.dev/v1/extract/${jobId}`, {
          headers: {
            "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`
          }
        });
      } catch (e) {
        // Fallback to standard endpoint
        statusResponse = await fetch(`https://api.firecrawl.dev/extract/${jobId}`, {
          headers: {
            "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`
          }
        });
      }
      
      if (!statusResponse.ok) {
        throw new Error(`Failed to get job status: ${statusResponse.status}`);
      }
      
      jobStatus = await statusResponse.json();
      console.log(`📊 Direct API job status:`, JSON.stringify(jobStatus, null, 2));
    }
    
    // Determine what data to return based on status
    let resultData = null;
    
    if (jobStatus.status === 'completed') {
      // Check where the results might be stored
      if (jobStatus.results) {
        resultData = jobStatus.results;
      } else if (jobStatus.data) {
        resultData = jobStatus.data;
      }
      
      // Process the extracted URLs if needed
      if (resultData && resultData.productUrls) {
        // Get the original category URL to use as base
        const originalUrl = request.nextUrl.searchParams.get("url");
        let baseUrl: URL | null = null;
        
        if (originalUrl) {
          try {
            baseUrl = new URL(originalUrl);
            console.log(`🔗 Using base URL: ${baseUrl.origin}`);
          } catch (error) {
            console.error('❌ Error parsing base URL:', error);
          }
        }
        
        // First check if we already have absolute URLs
        const hasAbsoluteUrls = resultData.productUrls.every((url: string) => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        });

        if (hasAbsoluteUrls) {
          console.log("✅ All URLs are already absolute, no processing needed");
          // Just validate the URLs
          resultData.productUrls = resultData.productUrls.filter((url: string) => {
            try {
              new URL(url);
              return true;
            } catch {
              console.warn(`⚠️ Invalid URL found: ${url}`);
              return false;
            }
          });
        } else if (!baseUrl) {
          console.error("❌ No valid base URL provided for processing relative URLs");
          resultData.productUrls = [];
        } else {
          try {
            // Process and validate URLs
            const validUrls = resultData.productUrls
              .map((url: string) => {
                try {
                  // If it's already an absolute URL, return as is
                  new URL(url);
                  return url;
                } catch {
                  // Handle relative URLs
                  if (url.startsWith('/')) {
                    return `${baseUrl.origin}${url}`;
                  }
                  return `${baseUrl.origin}/${url}`;
                }
              })
              .filter((url: string) => {
                try {
                  new URL(url);
                  return true;
                } catch {
                  console.warn(`⚠️ Invalid URL after processing: ${url}`);
                  return false;
                }
              });

            resultData.productUrls = validUrls;
            console.log(`✅ Processed ${validUrls.length} valid product URLs`);
          } catch (baseUrlError) {
            console.error('❌ Error processing base URL:', baseUrlError);
            resultData.productUrls = [];
          }
        }
        
        // If no valid URLs found, try fallback to scrape
        if (resultData.productUrls.length === 0 && baseUrl) {
          console.log("⚠️ No valid product URLs found, trying fallback method...");
          
          try {
            // Try a basic scrape instead
            const scrapeResult = await firecrawl.scrapeUrl(originalUrl || "", {
              formats: ['html']
            });
            
            if (scrapeResult.success && scrapeResult.html) {
              // Extract hrefs from the HTML
              const extractedUrls = extractUrlsFromHtml(scrapeResult.html)
                .map(url => {
                  try {
                    // If it's already an absolute URL, return as is
                    new URL(url);
                    return url;
                  } catch {
                    // Handle relative URLs
                    if (url.startsWith('/')) {
                      return `${baseUrl.origin}${url}`;
                    }
                    return `${baseUrl.origin}/${url}`;
                  }
                })
                .filter(url => {
                  try {
                    new URL(url);
                    return true;
                  } catch {
                    return false;
                  }
                });
              
              if (extractedUrls.length > 0) {
                console.log(`✅ Fallback method found ${extractedUrls.length} potential product URLs`);
                resultData.productUrls = extractedUrls;
              }
            }
          } catch (fallbackError) {
            console.error("❌ Fallback extraction also failed:", fallbackError);
          }
        }
      } else {
        console.log("⚠️ No product URLs found in extraction result");
        resultData = { productUrls: [] };
      }
    }
    
    // Calculate total links found
    const totalLinks = resultData?.productUrls?.length || 0;
    console.log(`Total valid product links found: ${totalLinks}`);
    
    return NextResponse.json({
      success: true,
      status: jobStatus.status,
      progress: jobStatus.progress || 0,
      data: resultData,
      totalLinks: totalLinks
    });
  } catch (error) {
    console.error("❌ Error checking job status:", error);
    return NextResponse.json(
      { error: "Failed to check job status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Simple URL cleaning function
function cleanProductUrls(urls: string[]): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  
  return [...new Set(
    urls
      .filter(url => url && typeof url === 'string' && url.trim() !== '')
      .map(url => url.trim())
  )];
}

// Extract URLs from HTML as fallback
function extractUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  
  try {
    // Basic regex to find links in HTML
    const linkRegex = /href=["'](https?:\/\/[^"']+|\/[^"']+)["']/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1].trim();
      
      // Only keep URLs that look like product links
      if (isLikelyProductUrl(url)) {
        urls.push(url);
      }
    }
    
    // Remove duplicates
    return [...new Set(urls)];
  } catch (error) {
    console.error("Error extracting URLs from HTML:", error);
    return [];
  }
}

// Check if URL is likely a product URL
function isLikelyProductUrl(url: string): boolean {
  // Common patterns for product URLs
  const productPatterns = [
    /\/product\//i,
    /\/p\/[a-zA-Z0-9]/i,
    /\/item\//i,
    /\/products\//i,
    /\/shop\/[^\/]+\/[^\/]+$/i,
    /details?/i,
    /\/dp\//i,
    /\/pd\//i,
    /\/[a-zA-Z0-9]{5,}\.html$/i  // Product IDs in URLs
  ];
  
  // Negative patterns (not product URLs)
  const negativePatterns = [
    /\.(jpg|jpeg|png|gif|css|js)$/i,
    /\/(cart|checkout|account|login|register|search)\/?$/i,
    /facebook\.com/i,
    /twitter\.com/i,
    /instagram\.com/i
  ];
  
  // Check negative patterns first
  if (negativePatterns.some(pattern => pattern.test(url))) {
    return false;
  }
  
  // Then check positive patterns
  return productPatterns.some(pattern => pattern.test(url));
}