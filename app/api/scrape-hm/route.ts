import { NextResponse } from "next/server";
import { chromium } from "playwright";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
 admin.initializeApp({
   credential: admin.credential.cert(
     require("../../../firebaseDB/firebase-db-gdx2-firebase-adminsdk-fbsvc-4030f3a68f.json")
   ),
 });
}

const db = getFirestore();

interface Product {
    productId: string;
    name: string;
    images: {
        main: string;
        additional: string[];
    };
    features: string[];
    details: string;
    materials: {
    fabric: string;
    functionDetails: string;
    washingInstructions: string;
    additionalNotes: string;
    };
    colors: string[];
    sizes: string[];
    price: {
        original: number;
        discounted: number;
        discountPercentage: number;
        currency: string;
    };
    store: {
        name: string;
        region: string;
    };
    category: string;
    productType?: string;
    promotions: {
        current: string;
        historical: string[];
    };
    stockStatus: string;
    rating: number;
    reviewCount: number;
    url: string;
}

function getCollectionName(url: string): string {
  // Extract category and product type from H&M URLs
  const match = url.match(/th\.hm\.com\/th_en\/([^\/]+).*presentationproducttype=([^&]+)/);
  if (!match) return "default-collection";

  const [_, category, productType] = match;
  
  // Clean up the category and product type
  const cleanCategory = category === "ladies" ? "women" : 
                        category === "kids" ? "kids" : 
                        category;
  const cleanProductType = productType.replace(/-/g, '_').toLowerCase();
  
  return `hm-${cleanCategory}-${cleanProductType}`;
}

// Map subcategory IDs to H&M URLs
const SUBCATEGORY_URL_MAP = {
    "men-t-shirts": "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=T-shirt",
    "men-shirts": "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=Shirt",
    "men-tops": "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=Top",
    "men-trousers-and-jeans": "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=Trousers&presentationproducttype=Jeans",
    "men-shorts": "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=Shorts",
    "women-tops": "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=Top",
    "women-t-shirts": "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=T-shirt",
    "women-dresses": "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=Dress",
    "women-trousers-and-jeans": "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=Jeans&presentationproducttype=Trousers",
    "women-skirts": "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=Skirt",
    "kids-shorts": "https://th.hm.com/th_en/kids/shop-by-product.html?presentationproducttype=Shorts"
};

export async function POST(request: Request) {
    try {
        // Parse the request body
        const body = await request.json();
        const { categories, subcategories } = body;
        
        // Log the received inputs
        console.log("Received scrape request for H&M:");
        console.log("Categories:", categories);
        console.log("Subcategories:", subcategories);
        
        // Filter URLs based on selected subcategories
        const linksToScrape = subcategories
            .map((subId: string) => SUBCATEGORY_URL_MAP[subId as keyof typeof SUBCATEGORY_URL_MAP])
            .filter((url: string | undefined): url is string => !!url);
        
        console.log("\nURLs that would be scraped:");
        linksToScrape.forEach((url: string, index: number) => {
            console.log(`${index + 1}. ${url}`);
        });
        
        // For testing - return early with the received data and links
        return NextResponse.json({ 
            success: true, 
            message: "Test mode - received inputs successfully", 
            receivedData: { 
                categories, 
                subcategories,
                linksToScrape 
            } 
        });
        
         // Original code below - commented out for testing
        /*
        const links = [
        "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=T-shirt",
        "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=Shirt",
        "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=Top",
        "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=Trousers&presentationproducttype=Jeans",
        "https://th.hm.com/th_en/men/shop-by-product.html?presentationproducttype=Shorts",
        "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=Dress",
        "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=Top",
        "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=T-shirt",
        "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=Jeans&presentationproducttype=Trousers",
        "https://th.hm.com/th_en/ladies/shop-by-product.html?presentationproducttype=Skirt",
        "https://th.hm.com/th_en/kids/shop-by-product.html?presentationproducttype=Shorts"
        ];
        for (const url of links) {
        console.log(`Extracting product links for: ${url}`);
        const productLinks = await scrapeProductLinks(url);
        if (!productLinks.length) {
            console.warn(`No product links found for ${url}`);
            continue;
        }
        console.log(`Extracting product details for ${url}`);
        const extractedProducts = await scrapeProductDetailsFromLinks(productLinks);
        if (!extractedProducts.length) {
            console.warn(`No product details extracted for ${url}`);
            continue;
        }
            const collectionName = getCollectionName(url); // Get specific collection name
        await uploadExtractedProductsToFirestore(extractedProducts, collectionName);
        }
        return NextResponse.json({ success: true, message: "Scraping and upload complete" });
        */
    } catch (error) {
        console.error("Error in workflow:", error);
        return NextResponse.json({ error: "Failed to complete scraping process" }, { status: 500 });
    }
}
 
/** Scrape Product Links for H&M Thailand (All Pages) */
async function scrapeProductLinks(url: string): Promise<string[]> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
   
    try {
        let allProductLinks = new Set<string>();
        let currentPage = 1;
    
        while (true) {  // Loop until no more pages exist
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            await page.evaluate(() => window.scrollBy(0, 5000));
            await page.waitForTimeout(3000);
    
            // Extract product links from the page
            const productLinks = await page.evaluate(() =>
            Array.from(document.querySelectorAll('.ds-sdk-product-item__main a[href]'))
                .map(link => link.getAttribute("href"))
                .filter(Boolean)
            );
    
            // Convert relative URLs to absolute and add to set
            productLinks.forEach(link => {
            const fullLink = link!.startsWith("http") ? link! : `https:${link}`;
            allProductLinks.add(fullLink);
            });
    
            // Check for pagination (Next Page button)
            const nextPageButton = await page.$("button.text-white.w-full.uppercase");
            if (!nextPageButton) {
            break; // Exit loop if no "Next Page" button
            }
    
            // Increment page number in URL (H&M uses p=2, p=3, etc.)
            const nextPageUrl = new URL(url);
            nextPageUrl.searchParams.set("p", (currentPage + 1).toString()); // Set next page
            url = nextPageUrl.toString(); // Update URL for next iteration
    
            currentPage++;
        }
    
        // Convert Set to Array and save to file
        const linksArray = Array.from(allProductLinks);
        console.log(`Total products found: ${linksArray.length}`);

        return linksArray;
    } catch (error) {
        console.error("Error scraping links:", error);
      return [];
    } finally {
        await browser.close();
    }
}

async function scrapeProductDetails(url: string): Promise<Product | null> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();
 
    try {
        // Increase timeout and add retry logic
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                await page.goto(url, { 
                    waitUntil: 'networkidle',  // Wait until network is idle
                    timeout: 30000  // 30 seconds timeout
                });

                // Wait for either product info or error message
                await Promise.race([
                    page.waitForSelector('.product-info-main', { 
                        state: 'visible',
                        timeout: 20000 
                    }),
                    page.waitForSelector('.page-not-found', { 
                        state: 'visible',
                        timeout: 20000 
                    })
                ]);

                // Check if page is 404
                const is404 = await page.$('.page-not-found');
                if (is404) {
                    console.log(`Page not found: ${url}`);
                    return null;
                }

                // Add a small delay to ensure dynamic content loads
                await page.waitForTimeout(2000);

                // Scroll the page to trigger lazy loading
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                    window.scrollTo(0, 0);
                });

                break; // If we get here, break the retry loop
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw error; // Throw on final retry
                }
                console.log(`Retry ${retryCount}/${maxRetries} for ${url}`);
                await page.waitForTimeout(2000 * retryCount); // Exponential backoff
            }
        }

        await page.waitForSelector(".product-info-main", { timeout: 10000 });
 
        await page.waitForFunction(() => {
            return Array.from(document.querySelectorAll(".attributes-list .attribute-item-value"))
                .some(el => el.textContent && el.textContent.trim().length > 0);
        }, { timeout: 15000 });
 
        const featureElements = await page.$$(".attributes-list .attribute-item");
        const features: string[] = [];
        for (const feature of featureElements) {
            const label = await feature.$eval(".attribute-item-label", el => el.textContent?.trim() || "");
            const value = await feature.$eval(".attribute-item-value", el => el.textContent?.trim() || "");
            if (value.length > 0) {
                features.push(`${label}: ${value}`);
            }
        }
 
        let washingInstructions = "";
        try {
            await page.waitForSelector(".care-instruction-list .care-instruction-item", { state: "attached", timeout: 5000 });
            washingInstructions = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.care-instruction-list .care-instruction-item span'))
                    .map(el => el.textContent?.trim() || "")
                    .filter(instruction => instruction.length > 0)
                    .join(", ");
            });
        } catch (e) {
            // No washing instructions found. Set empty.    
        }
 
        const promotionsData = await page.evaluate(() => {
            const promotions: string[] = [];
       
            const existingPromotions = Array.from(document.querySelectorAll(".product-labels span"))
                .map(el => el.textContent?.trim() || "")
                .filter(text => text.length > 0);
       
            promotions.push(...existingPromotions);
       
            const newArrivalCount = Array.from(document.querySelectorAll("*"))
                .filter(el => el.textContent?.trim() === "New Arrival").length;
       
            const outOfStockCount = Array.from(document.querySelectorAll("*"))
                .filter(el => el.textContent?.trim() === "Out of Stock").length;
       
            return {
                promotions,
                newArrivalCount,
                outOfStockCount,
            };
        });
       
        let promotions: { current: string; historical: string[] } = {
            current: "No current promotions",
            historical: [],
        };
 
        const priceData = await page.evaluate(() => {
            const getText = (selector: string) =>
                document.querySelector(selector)?.textContent?.trim() || "";
            
            // Get original price from old-price element or normal price
            const originalPriceText = document.querySelector('.old-price .price')?.textContent?.trim() || 
                                    document.querySelector('.normal-price .price')?.textContent?.trim() || 
                                    document.querySelector('.price-wrapper .price')?.textContent?.trim() || '';
            const originalPrice = parseFloat(originalPriceText.replace(/[^\d.]/g, "")) || 0;
            
            // Check for member price first
            const memberPriceText = document.querySelector('.member-price b')?.textContent?.trim();
            
            // Then check for special price
            const specialPriceText = document.querySelector('.special-price .price')?.textContent?.trim();
            
            // Use member price if available, then special price, then original price
            const currentPrice = memberPriceText ? parseFloat(memberPriceText.replace(/[^\d.]/g, "")) :
                                specialPriceText ? parseFloat(specialPriceText.replace(/[^\d.]/g, "")) :
                                originalPrice;
            
            // Calculate discount percentage only if there's actually a discount
            const discountPercentage = originalPrice > currentPrice
                ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                : 0;
            
            // Get currency from meta tag or default to THB
            const currency = document.querySelector('meta[itemprop="priceCurrency"]')?.getAttribute("content") || "THB";
            
            // Check if this is a member price
            const isMemberPrice = !!memberPriceText;
            
            return {
                originalPrice: originalPrice || currentPrice, // If no original price, use current
                discountedPrice: currentPrice,
                discountPercentage,
                currency,
                isMemberPrice
            };
        });
       
        const price = {
            original: priceData.originalPrice,
            discounted: priceData.discountedPrice,
            discountPercentage: priceData.discountPercentage,
            currency: priceData.currency,
        };
 
        const product: Product = await page.evaluate(() => {
            const getText = (selector: string) =>
                document.querySelector(selector)?.textContent?.trim() || "";
            const getAttr = (selector: string, attr: string) =>
                document.querySelector(selector)?.getAttribute(attr) || "";
 
            const productId =
                getAttr(".price-box", "data-product-id") ||
                getAttr(".action.towishlist", "data-product-id") ||
                "Unknown";
 
            const name = getText(".page-title-wrapper.product .page-title span") || "Unknown";
 
            const images = Array.from(document.querySelectorAll(".product-gallery img"))
                .map((img) => img.getAttribute("src") || "")
                .filter((src) => src.length > 0);
 
            const mainImage = images.length > 0 ? images[0] : "";
            const additionalImages = images.length > 1 ? images.slice(1) : [];
 
            const details =
                getText('.short-description p[itemprop="description"]') || "No details provided.";
 
            const fewLeftLabel = document.querySelector('.few-left-label');
            const stockStatus = fewLeftLabel ? 
                "Few pieces left" : 
                getAttr('meta[itemprop="availability"]', "content")
                    ?.replace("http://schema.org/", "")
                    .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert a space between camelCase words
                    .trim() || "Unknown";
 
            const colors = Array.from(
                document.querySelectorAll(".configurable-product-item a img")
            )
                .map((el) => el.getAttribute("alt")?.split("|")[1]?.trim() || "Unknown")
                .filter((color) => color !== "Unknown");
 
            const materials = {
                fabric: getText(".materials-list .sub-section-value") || "Unknown",
                functionDetails: "",
                washingInstructions: "", // Placeholder, will update later
                additionalNotes: "",
            };
 
            const ratingText = getText(".product-rating .rating-value") || "0";
            const rating = parseFloat(ratingText) || 0;
 
            const reviewText = getText(".product-rating .review-count") || "0";
            const reviewCount = parseInt(reviewText.replace(/\D/g, ""), 10) || 0;
 
            const categoryMatch = window.location.pathname.match(/\/th_en\/([^\/]+)/);
            const category = categoryMatch ? 
                (categoryMatch[1] === 'ladies' ? 'Women' : 
                 categoryMatch[1] === 'men' ? 'Men' :
                 categoryMatch[1] === 'kids' ? 'Kids' :
                 'Uncategorized') 
                : "Uncategorized";

            // Extract product type from URL
            const productTypeMatch = window.location.search.match(/presentationproducttype=([^&]+)/);
            const productType = productTypeMatch ? 
                decodeURIComponent(productTypeMatch[1]).replace(/-/g, ' ') : 
                undefined;
 
            return {
                productId,
                name,
                images: { main: mainImage, additional: additionalImages },
                features: [], // Placeholder, will update later
                details,
                materials,
                colors,
                sizes: [], // Placeholder, will update below
                price: {
                    original: 0,
                    discounted: 0,
                    discountPercentage: 0,
                    currency: "THB",
                },
                store: { name: "H&M", region: "Thailand" },
                category,
                productType,
                promotions: { current: "", historical: [] }, // Placeholder
                stockStatus,
                rating,
                reviewCount,
                url: window.location.href,
            };
        });
 
        product.features = features;
        product.materials.washingInstructions = washingInstructions;
        product.promotions = promotions;
        product.price = price;
 
        if (promotionsData.newArrivalCount > 1) {
            product.materials.additionalNotes += "New Arrival";
        }
 
        // Update promotions based on price type
        if (priceData.isMemberPrice) {
            product.promotions.current = "Member Price";
        } else if (price.discountPercentage > 0) {
            product.promotions.current = "Online Discount";
        }
 
        await page.waitForSelector('.swatch-option-list input', { state: 'attached', timeout: 15000 });
 
        const sizes = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.swatch-option-list input'))
                .map(el => el.getAttribute("data-option-label")?.trim() || "")
                .filter(size => size.length > 0);
        });
 
        product.sizes = sizes; 
 
        return product;
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return null;
    } finally {
        await context.close();
        await browser.close();
    }
}
 
/** Step 3: Scrape All Extracted Links */
async function scrapeProductDetailsFromLinks(links: string[]): Promise<Product[]> {
    const extractedProducts: Product[] = [];
    
    for (const [index, link] of links.entries()) {
        console.log(`Scraping product ${index + 1}/${links.length}: ${link}`);
        
        // Add delay between requests to avoid overwhelming the server
        if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const product = await scrapeProductDetails(link);
        if (product) {
            extractedProducts.push(product);
        }
    }
   
    console.log(`Completed scraping: ${extractedProducts.length} products successfully scraped out of ${links.length} attempted`);
    return extractedProducts;
}
   
/** Step 4: Upload Extracted Products to Firestore */
async function uploadExtractedProductsToFirestore(products: Product[], collectionName: string) {
    try {
        const batch = db.batch();
        const timestamp = admin.firestore.Timestamp.now();
        products.forEach((product) => {
        if (!product.productId) {
            console.warn(`Skipping product without productId:`, product);
            return;
        }
            const docRef = db.collection(collectionName).doc(product.productId); // Use productId as doc ID
        batch.set(docRef, { ...product, scrapedAt: timestamp });
        });
        await batch.commit();
        console.log(`Uploaded ${products.length} products to Firestore collection: ${collectionName}`);
    } catch (error) {
        console.error(`Failed to upload products to ${collectionName}:`, error);
    }
}

/** API Route to Call Scraper */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
    }

    const productLinks = await scrapeProductLinks(url);

    return NextResponse.json({ success: true, count: productLinks.length });
}