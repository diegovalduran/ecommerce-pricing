// updated-route-with-nulls.ts - using null for truly missing data
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import FirecrawlApp from "@mendable/firecrawl-js";
import { adminDb } from '@/lib/firebase/admin-config';

// Initialize FireCrawl client
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY || ""
});

// Product schema with optional fields
const productSchema = z.object({
  productId: z.string().optional(),
  name: z.string().optional(),
  images: z.object({
    main: z.string().optional(),
    additional: z.array(z.string()).optional()
  }).optional(),
  features: z.array(z.string()).optional(),
  details: z.string().optional(),
  materials: z.object({
    fabric: z.string().optional(),
    functionDetails: z.string().optional(),
    washingInstructions: z.string().optional(),
    additionalNotes: z.string().optional()
  }).optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  price: z.object({
    original: z.number().optional(),
    discounted: z.number().optional(),
    discountPercentage: z.number().optional(),
    currency: z.string().optional()
  }).optional(),
  store: z.object({
    name: z.string().optional(),
    region: z.string().optional()
  }).optional(),
  category: z.string().optional(),
  promotions: z.object({
    current: z.string().optional(),
    historical: z.array(z.string()).optional()
  }).optional(),
  stockStatus: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  url: z.string().optional()
});

// Interface for request body
interface ProductRequest {
  url: string;
  brand?: string;
  targetAudience?: string;
  category?: string;
  region?: string;
}

export async function POST(request: NextRequest) {
  console.log("🚀 Received product extraction request");
  
  try {
    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Parse request body
    const body = await request.json() as ProductRequest;
    console.log("📄 Product URL:", body.url);
    console.log("📝 Metadata:", {
      brand: body.brand,
      targetAudience: body.targetAudience,
      category: body.category,
      region: body.region
    });
    
    if (!body.url) {
      return NextResponse.json(
        { error: "Product URL is required" },
        { status: 400 }
      );
    }
    
    return await startProductExtraction(body.url, baseUrl);
    
  } catch (error) {
    console.error("❌ Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Start extraction for a product URL
async function startProductExtraction(url: string, baseUrl: string) {
  console.log(`🔎 Starting product extraction for: ${url}`);
  try {
    console.log("📡 Starting asyncExtract job...");
    
    // Log the environment variables
    console.log("🔑 Environment check:", {
      hasApiKey: !!process.env.FIRECRAWL_API_KEY,
      apiKeyLength: process.env.FIRECRAWL_API_KEY?.length
    });
    
    // Detailed prompt but with no defaults guidance
    const extractionJob = await firecrawl.asyncExtract(
      [url],
      {
        prompt: `Extract product information from this e-commerce page, including:
1. Product ID and name
2. Images (main and additional). 
3. Features and detailed description
4. Materials information (fabric, washing instructions, etc.). 
5. Available colors and sizes. 
6. Pricing details (original, discounted, currency). 
7. Store information and category
8. Promotions if any
9. Stock status - check if product is explicitly marked as "Low Stock", "Out of Stock" or "Sold Out"; if not clearly indicated as out of stock, mark as "In Stock"
10. Ratings and review count if available

Extract only the information that is clearly present on the page. Do not make assumptions for missing data. You may need to click on selectors in the details section to access the above information or scroll through the page.`,
        schema: productSchema
      }
    );
    
    console.log("📊 Extraction job response:", JSON.stringify(extractionJob, null, 2));
    
    // Handle the job ID
    let jobId: string;
    
    if (extractionJob && typeof extractionJob === 'object') {
      // Check different possible property names
      if ('jobId' in extractionJob) {
        jobId = (extractionJob as any).jobId;
        console.log("✅ Found jobId in response");
      } else if ('id' in extractionJob) {
        jobId = (extractionJob as any).id;
        console.log("✅ Found id in response");
      } else {
        console.error("❌ Unexpected response format:", extractionJob);
        throw new Error("Could not find job ID in response");
      }
    } else {
      console.error("❌ Invalid response from asyncExtract:", extractionJob);
      throw new Error("Invalid response from asyncExtract");
    }
    
    console.log(`✅ Started extraction job with ID: ${jobId}`);
    
    // Return the job ID to the client
    return NextResponse.json({
      success: true,
      message: "Product extraction started",
      jobId: jobId
    });
    
  } catch (error) {
    console.error("❌ Failed to start extraction:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: "Failed to start product extraction", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Get status of extraction job
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  const brand = request.nextUrl.searchParams.get("brand");
  const targetAudience = request.nextUrl.searchParams.get("targetAudience");
  const category = request.nextUrl.searchParams.get("category");
  const region = request.nextUrl.searchParams.get("region");
  
  if (!jobId) {
    return NextResponse.json(
      { error: "Job ID is required" },
      { status: 400 }
    );
  }
  
  console.log(`🔍 Checking status for job ID: ${jobId}`);
  console.log('📝 Metadata:', { brand, targetAudience, category, region });
  
  try {
    // Add a 5 minute timeout for polling
    const startTime = Date.now();
    let jobStatus;
    let timedOut = false;
    while (true) {
      jobStatus = await firecrawl.getExtractStatus(jobId);
      if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
        break;
      }
      if (Date.now() - startTime > 5 * 60 * 1000) { // 5 minutes
        timedOut = true;
        break;
      }
      // Wait 2 seconds before polling again
      await new Promise(res => setTimeout(res, 2000));
    }
    if (timedOut) {
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: 'Universal scraper timed out after 5 minutes.'
      }, { status: 504 });
    }
    
    // Determine what data to return based on status
    let resultData = null;
    let uploadSuccess = false;
    
    // Log the exact status we received
    console.log(`🔍 Job status from FireCrawl: ${jobStatus.status}`);
    
    // Map FireCrawl status to our status
    let mappedStatus = 'in-progress';
    if (jobStatus.status === 'completed') {
      mappedStatus = 'completed';
    } else if (jobStatus.status === 'failed') {
      mappedStatus = 'failed';
    }
    
    console.log(`🔄 Mapped status: ${mappedStatus}`);
    
    if (mappedStatus === 'completed') {
      console.log("✅ Job completed, processing results...");
      // Check where the results might be stored
      if (jobStatus.results) {
        console.log("📦 Found results in jobStatus.results");
        console.log("📝 Raw results data:", JSON.stringify(jobStatus.results, null, 2));
        resultData = jobStatus.results;
      } else if (jobStatus.data) {
        console.log("📦 Found results in jobStatus.data");
        console.log("📝 Raw data:", JSON.stringify(jobStatus.data, null, 2));
        resultData = jobStatus.data;
      } else {
        console.warn("⚠️ No results found in jobStatus");
        console.log("📝 Full jobStatus object:", JSON.stringify(jobStatus, null, 2));
      }
      
      // Process and standardize the data
      if (resultData) {
        console.log("🔄 Standardizing data...");
        console.log("📝 Pre-standardization data:", JSON.stringify(resultData, null, 2));
        resultData = standardizeData(resultData);
        console.log("📝 Post-standardization data:", JSON.stringify(resultData, null, 2));
        
        // Upload to Firestore if we have all required metadata
        if (brand && targetAudience && category && region) {
          try {
            // Create collection name using the convention
            const collectionName = `${brand}-${targetAudience}-${category}-${region}`.toLowerCase();
            console.log(`📦 Uploading to collection: ${collectionName}`);
            
            // Generate a unique product ID if not present
            const productId = resultData.productId || resultData.url?.split('/').pop() || Date.now().toString();
            console.log(`📝 Using product ID: ${productId}`);
            
            // Use product ID as document ID
            const docRef = adminDb.collection(collectionName).doc(productId);
            
            // Add timestamp and metadata
            const productData = {
              ...resultData,
              productId, // Ensure productId is in the data
              scrapedAt: new Date().toISOString(),
              brand,
              targetAudience,
              category,
              region,
              // Add any additional metadata that might be useful
              lastUpdated: new Date().toISOString(),
              source: 'universal-scraper',
              status: 'active'
            };
            
            console.log("📝 Final data to be uploaded:", JSON.stringify(productData, null, 2));
            
            // Set the document with merge to avoid overwriting existing data
            await docRef.set(productData, { merge: true });
            console.log(`✅ Successfully uploaded product to collection: ${collectionName} with ID: ${productId}`);
            uploadSuccess = true;
            
          } catch (uploadError) {
            console.error('❌ Firestore upload failed:', uploadError);
            // Don't fail the whole request if upload fails
            uploadSuccess = false;
          }
        } else {
          console.warn('⚠️ Missing metadata for Firestore upload:', { 
            brand, 
            targetAudience, 
            category, 
            region,
            hasBrand: !!brand,
            hasTargetAudience: !!targetAudience,
            hasCategory: !!category,
            hasRegion: !!region
          });
          uploadSuccess = false;
        }
      }
    } else if (mappedStatus === 'failed') {
      console.error("❌ Job failed:", jobStatus.error || "Unknown error");
      console.error("❌ Full error details:", JSON.stringify(jobStatus, null, 2));
    } else {
      console.log(`⏳ Job still processing: ${mappedStatus}`);
      console.log("📝 Current job status:", JSON.stringify(jobStatus, null, 2));
    }
    
    // Always return the current status and any results
    const response = {
      success: true,
      status: mappedStatus,
      progress: jobStatus.progress || 0,
      data: resultData,
      uploadSuccess: uploadSuccess
    };
    
    console.log("📤 Sending response:", JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error checking job status:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: "Failed to check job status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Standardize the data structure but keep nulls for missing fields
function standardizeData(data: any): any {
  const standardized: any = { ...data };
  
  // Only fix stock status as explicitly requested
  if (standardized.stockStatus) {
    const stockStatus = standardized.stockStatus.toLowerCase();
    if (stockStatus !== 'out of stock' && stockStatus !== 'sold out') {
      standardized.stockStatus = 'In Stock';
    } else {
      standardized.stockStatus = 'Out of Stock';
    }
  } else {
    // Default to In Stock if not specified
    standardized.stockStatus = 'In Stock';
  }
  
  // Ensure the structure exists but don't fill in values
  standardized.images = standardized.images || {};
  standardized.images.additional = standardized.images.additional || [];
  
  standardized.materials = standardized.materials || {};
  standardized.price = standardized.price || {};
  standardized.store = standardized.store || {};
  standardized.promotions = standardized.promotions || {};
  standardized.promotions.historical = standardized.promotions.historical || [];
  
  standardized.features = standardized.features || [];
  standardized.colors = standardized.colors || [];
  standardized.sizes = standardized.sizes || [];
  
  return standardized;
}

// Add new function for Firestore upload
async function uploadToFirestore(data: any, brand: string, targetAudience: string, category: string, region: string) {
  try {
    // Create collection name using the new format
    const collectionName = `${brand}-${targetAudience}-${category}-${region}`.toLowerCase();
    
    // Use product URL as document ID to avoid duplicates
    const docRef = adminDb.collection(collectionName).doc(data.url);
    
    // Add timestamp
    const productData = {
      ...data,
      scrapedAt: new Date().toISOString()
    };
    
    await docRef.set(productData);
    console.log(`✅ Successfully uploaded product to collection: ${collectionName}`);
    
    return {
      success: true,
      collectionName,
      message: 'Product uploaded successfully'
    };
  } catch (error) {
    console.error('❌ Error uploading to Firestore:', error);
    throw error;
  }
}