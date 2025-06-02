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
    promotions: {
        current: string;
        historical: string[];
    };
    stockStatus: string;
    rating: number;
    reviewCount: number;
    url: string;
}

export const getCollectionName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Handle Zara URLs specifically
    if (urlObj.hostname.includes('zara.com')) {
      // Extract relevant parts from pathname (e.g., /th/en/man-tshirts-l855.html -> man-tshirts)
      const parts = pathname.split('/');
      const relevantPart = parts.find(part => part.includes('-l')); // Find segment containing '-l'
      if (relevantPart) {
        const collectionName = relevantPart.split('-l')[0]; // Remove the '-l855.html' part
        return `zara-${collectionName}`;
      }
    }

    // Fallback to original logic for other URLs
    const segments = pathname.split('/').filter(Boolean);
    return segments[segments.length - 1];
  } catch (error) {
    console.error('Error parsing URL:', error);
    return 'default-collection';
  }
}

// Map subcategory IDs to Zara URLs
const SUBCATEGORY_URL_MAP = {
    "men-shirts": "https://www.zara.com/th/en/man-shirts-l737.html?v1=2431994",
    "men-linen": "https://www.zara.com/th/en/man-linen-l708.html?v1=2431961",
    "men-t-shirts": "https://www.zara.com/th/en/man-tshirts-l855.html?v1=2432042",
    "men-polos": "https://www.zara.com/th/en/man-polos-l733.html?v1=2432049",
    "men-trousers": "https://www.zara.com/th/en/man-trousers-l838.html?v1=2432096",
    "men-jeans": "https://www.zara.com/th/en/man-jeans-l659.html?v1=2432131",
    "men-shorts": "https://www.zara.com/th/en/man-bermudas-l592.html?v1=2432164", // Maps to bermudas
    "women-tops": "https://www.zara.com/th/en/woman-tops-l1322.html?v1=2419940",
    "women-shirts": "https://www.zara.com/th/en/woman-shirts-l1217.html?v1=2420369",
    "women-t-shirts": "https://www.zara.com/th/en/woman-tshirts-l1362.html?v1=2420417",
    "women-dresses": "https://www.zara.com/th/en/woman-dresses-l1066.html?v1=2420896",
    "women-jeans": "https://www.zara.com/th/en/woman-jeans-l1119.html?v1=2419185",
    "women-trousers": "https://www.zara.com/th/en/woman-trousers-l1335.html?v1=2420795",
    "women-skirts": "https://www.zara.com/th/en/woman-skirts-l1299.html?v1=2420454",
    "kids-shorts": "https://www.zara.com/th/en/kids-boy-bermudas-l203.html?v1=2426556",
    "kids-skirts": "https://www.zara.com/th/en/kids-girl-skirts-l425.html?v1=2426228"
};

export async function POST(request: Request) {
    try {
        // Parse the request body
        const body = await request.json();
        const { categories, subcategories } = body;
        
        // Log the received inputs
        console.log("Received scrape request for Zara:");
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
          "https://www.zara.com/th/en/man-trousers-l838.html?v1=2432096",
          "https://www.zara.com/th/en/man-jeans-l659.html?v1=2432131",
          "https://www.zara.com/th/en/man-shirts-l737.html?v1=2431994",
          "https://www.zara.com/th/en/man-linen-l708.html?v1=2431961",
          "https://www.zara.com/th/en/man-tshirts-l855.html?v1=2432042",
          "https://www.zara.com/th/en/man-polos-l733.html?v1=2432049",
          "https://www.zara.com/th/en/man-bermudas-l592.html?v1=2432164",
          "https://www.zara.com/th/en/woman-dresses-l1066.html?v1=2420896",
          "https://www.zara.com/th/en/woman-jeans-l1119.html?v1=2419185",
          "https://www.zara.com/th/en/woman-trousers-l1335.html?v1=2420795",
          "https://www.zara.com/th/en/woman-tops-l1322.html?v1=2419940",
          "https://www.zara.com/th/en/woman-shirts-l1217.html?v1=2420369",
          "https://www.zara.com/th/en/woman-tshirts-l1362.html?v1=2420417",
          "https://www.zara.com/th/en/woman-skirts-l1299.html?v1=2420454",
          "https://www.zara.com/th/en/kids-boy-bermudas-l203.html?v1=2426556",
          "https://www.zara.com/th/en/kids-girl-skirts-l425.html?v1=2426228"
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

/** Scrape Product Links from Zara Thailand */
async function scrapeProductLinks(url: string): Promise<string[]> {
  const browser = await chromium.launch({ headless: false }); // Keep visible for debugging
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    let allProductLinks = new Set<string>();
    let currentPage = 1;

    while (true) {
      // Construct next page URL
      const pageUrl = new URL(url);
      pageUrl.searchParams.set("page", currentPage.toString());

      await page.goto(pageUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60000 });

      // Extract product links
      const productLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a.product-link.product-grid-product__link[href], div.product-grid-product__figure a[href]"))
          .map(link => link.getAttribute("href"))
          .filter(Boolean)
      );

      // Convert relative URLs to absolute and store them
      productLinks.forEach(link => {
        const fullLink = link!.startsWith("http") ? link! : `https://www.zara.com${link}`;
        allProductLinks.add(fullLink);
      });

      // Stop if no new products were found
      if (productLinks.length === 0) {
        break;
      }

      currentPage++; // Move to the next page
    }

    console.log(`Page ${currentPage}: Found ${allProductLinks.size} new products.`);

    return Array.from(allProductLinks);
  } catch (error) {
      console.error("Error scraping links:", error);
      return [];
  } finally {
    await browser.close(); // Ensure the browser closes properly
  }
}

async function scrapeProductDetails(url: string): Promise<Product | null> {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    viewport: { width: 960, height: 540 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Handle geolocation modal first
    try {
        await page.waitForSelector('button[data-qa-action="stay-in-store"]', { timeout: 3000 });
        await page.click('button[data-qa-action="stay-in-store"]');
        await page.waitForTimeout(1000);  // Reduced from 2000
    } catch (error) {
        // Modal not found, continue
    }

    await page.waitForSelector('button[data-qa-action="store-stock"]', { 
        state: 'visible',
        timeout: 5000  // Reduced from 10000
    });
    await page.click('button[data-qa-action="store-stock"]');
    await page.waitForTimeout(1000);  // Reduced from 2000

    await page.waitForSelector('.multi-size-selector', { 
        state: 'visible',
        timeout: 5000  // Reduced from 10000
    });
    
    const sizes = await page.evaluate(() => {
        return Array.from(
            document.querySelectorAll('.multi-size-selector .zds-checkbox-label')
        )
            .map(label => label.textContent?.trim())
            .filter((size): size is string => size !== null && size !== undefined && size.length > 0);
    });

    try {
        await page.waitForSelector('button.zds-dialog-close-button', { 
            state: 'visible',
            timeout: 3000  // Reduced from 5000
        });
        await page.click('button.zds-dialog-close-button');
        await page.waitForTimeout(500);  // Reduced from 1000
    } catch (error) {
        // Modal not found, continue
    }

    await page.waitForSelector('button[data-qa-action="show-extra-detail"]', { 
        state: 'visible',
        timeout: 5000  // Reduced from 10000
    });
    await page.click('button[data-qa-action="show-extra-detail"]');
    await page.waitForTimeout(1000);  // Reduced from 2000

    await page.waitForSelector('.structured-component-icon-list', { 
        state: 'visible',
        timeout: 5000  // Reduced from 10000
    });

    const featureElements = await page.$$(".attributes-list .attribute-item");
    const features: string[] = [];
    for (const feature of featureElements) {
      const label = await feature.$eval(".attribute-item-label", el => el.textContent?.trim() || "");
      const value = await feature.$eval(".attribute-item-value", el => el.textContent?.trim() || "");
      if (value.length > 0) {
        features.push(`${label}: ${value}`);
      }
    }

    let promotions: { current: string; historical: string[] } = {
      current: "No current promotions",
      historical: [],
    };

    const priceData = await page.evaluate(() => {
      const extractPrice = (text: string | null | undefined): number => {
        if (!text) return 0;
        const match = text.match(/฿\s*([\d,]+)/);
        return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
      };

      const originalPriceElement = document.querySelector('.price-old__amount');
      let originalPrice = extractPrice(originalPriceElement?.textContent);

      const currentPriceElement = document.querySelector('.price-current__amount') || 
                                document.querySelector('.money-amount__main');
      const currentPrice = extractPrice(currentPriceElement?.textContent);

      if (!originalPrice) {
        originalPrice = currentPrice;
      }

      return {
        originalPrice,
        discountedPrice: currentPrice,
        discountPercentage: originalPrice > currentPrice 
          ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
          : 0,
        currency: 'THB'
      };
    });
   
    const price = {
      original: priceData.originalPrice,
      discounted: priceData.discountedPrice,
      discountPercentage: priceData.discountPercentage,
      currency: priceData.currency,
    };

    const product = await page.evaluate((sizes) => {
      const url = window.location.href;
      const productId = url.match(/p(\d+)/)?.[1] || "Unknown";
      
      // Helper function to get highest resolution image from srcset
      const getHighestResSrcFromSet = (srcset: string): string => {
        if (!srcset) return '';
        const sources = srcset.split(',')
          .map(src => {
            const [url, width] = src.trim().split(' ');
            return {
              url: url.trim(),
              width: width ? parseInt(width.replace('w', '')) : 0
            };
          })
          .sort((a, b) => b.width - a.width);
        return sources[0]?.url || '';
      };

      // Get main image
      const mainImage = document.querySelector('.media-image__image')?.getAttribute('src') || '';

      // Get secondary image
      const secondaryImage = document.querySelector('.product-detail-view__secondary-image picture source');
      const secondaryImageSrc = secondaryImage ? 
        getHighestResSrcFromSet(secondaryImage.getAttribute('srcset') || '') : '';

      // Get all extra images
      const extraImagePictures = document.querySelectorAll('.product-detail-view__extra-images li picture');

      const additionalImages = [
        secondaryImageSrc,
        ...Array.from(extraImagePictures)
          .map(picture => {
            const source = picture.querySelector('source[media="(min-width: 768px)"]');
            const srcset = source?.getAttribute('srcset') || '';
            const highResSrc = getHighestResSrcFromSet(srcset);
            return highResSrc;
          })
      ].filter(src => 
        src && 
        src !== mainImage && 
        !src.includes('transparent-background.png') &&
        src.includes('/assets/public/') &&
        src.split('?')[0] !== mainImage.split('?')[0]
      );

      // Extract colors with fallback
      let colors: string[] = [];
      const colorButtons = document.querySelectorAll('.product-detail-color-selector__color-area .screen-reader-text');
      if (colorButtons.length > 0) {
        colors = Array.from(colorButtons)
          .map(span => span.textContent || '')
          .filter(color => color !== '');
      } else {
        const singleColor = document.querySelector('.product-color-extended-name')
          ?.textContent
          ?.split('|')[0]
          ?.trim();
        if (singleColor) {
          colors = [singleColor];
        }
      }

      // Extract fabric content with proper formatting
      const fabricContent = Array.from(document.querySelectorAll('.structured-component-text.zds-heading-xs span'))
          .filter(span => span.textContent?.trim() === 'OUTER SHELL')
          .map(span => 
              span.parentElement  // Get the parent span
                  ?.parentElement  // Get to the heading container
                  ?.nextElementSibling  // Get the next element which contains the content
                  ?.querySelector('.structured-component-text.zds-body-m span')
                  ?.textContent
                  ?.trim()
          )
          .filter((text): text is string => text !== null && text !== undefined && text.length > 0)
          .map(text => {
              // Split the text by percentages and format each part
              return text.match(/(\d+%\s*[a-zA-Z]+)/g)
                  ?.map(part => part.trim())
                  ?.join(', ') || text;
          })
          .join(', ');

      // Extract origin information
      const originParagraphs = Array.from(document.querySelectorAll('.structured-component-text-block-paragraph .structured-component-text.zds-body-m span'))
          .map(span => span.textContent?.trim())
          .filter(text => text && text.startsWith('Made in'))
          .join(', ');

      // Extract washing instructions from all lists
      const washingInstructions = Array.from(
          document.querySelectorAll('.structured-component-icon-list')
      ).map(list => 
          Array.from(list.querySelectorAll('.structured-component-icon-list__item span.structured-component-text span'))
              .map(span => span.textContent?.trim())
              .filter(text => text && text.length > 0)
              .join('. ')
      ).filter(text => text.length > 0)
      .join('. ');

      // Get details but exclude model information
      const fullDetails = document.querySelector('.product-detail-description .expandable-text__inner-content p')
          ?.textContent
          ?.trim() || '';
      
      // Remove the model height, size portion, and any single letter size prefix
      const details = fullDetails.replace(/^Model height:.*?Size:.*?\s*[XSML]+/, '')
          .trim();

      return {
        productId,
        name: document.querySelector('.product-detail-info__header-name')?.textContent?.trim() || "Unknown",
        images: {
          main: mainImage,
          additional: additionalImages
        },
        features: [] as string[],
        details: details,  // Use the filtered details
        materials: {
          fabric: fabricContent,
          functionDetails: '',
          washingInstructions,
          additionalNotes: originParagraphs
        },
        colors,
        sizes: sizes,
        price: {
          original: 0,
          discounted: 0,
          discountPercentage: 0,
          currency: 'THB'
        },
        store: { name: 'Zara', region: 'Thailand' },
        category: 'Uncategorized',
        promotions: {
          current: 'No current promotions',
          historical: [] as string[]
        },
        stockStatus: 'In Stock',
        rating: 0,
        reviewCount: 0,
        url: url
      };
    }, sizes);

    product.features = features;
    product.promotions = promotions;
    product.price = price;

    if (product.price.discountPercentage > 0) {
      product.promotions.current = 'Online Discount';
    }

    return product;
  } catch (error) {
    console.error("Scraping error:", error);  // Added error logging
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
