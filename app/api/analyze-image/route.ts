import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI with your API key
const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    console.error("🔍 [ERROR] No Google API key found in environment variables");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

interface ImageAnalysis {
    genre: string;
    length: string;
    type: string;
    pattern: string;
    graphic: string;
    fabrics: string[];
    color: string;
}

// Function to normalize category based on product name
function normalizeCategory(productName: string): string {
    const name = productName.toLowerCase();
    
    if (/\bskirt\b|\bskirts\b/.test(name)) return "skirt";
    if (/\bshorts?\b|\bbermudas?\b/.test(name)) return "shorts";
    if (/\bpants?\b|\bbottoms?\b/.test(name)) return "bottoms";
    if (/\bjeans?\b/.test(name)) return "jeans";
    if (/\bdress(?:es)?\b/.test(name)) return "dress";
    if (/\btops?\b|\bt-?shirts?\b|\btees?\b/.test(name)) return "top";
    if (/\bjackets?\b|\bcoats?\b/.test(name)) return "jacket";
    if (/\bpolos?\b/.test(name)) return "polo";
    if (/\bsocks?\b/.test(name)) return "sock";
    
    return "item"; // Default fallback
}

export async function POST(request: Request) {
    try {
        if (!API_KEY) {
            throw new Error("Google API key is not configured");
        }

        const { imageUrl, productName } = await request.json();
        console.log("🔍 [GEMINI] Received image URL:", imageUrl);
        console.log("🔍 [GEMINI] Product name:", productName);

        if (!imageUrl) {
            return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
        }

        // Normalize category based on product name
        const category = productName ? normalizeCategory(productName) : "item";
        console.log("🔍 [GEMINI] Detected category:", category);

        // Fetch the image
        console.log("🔍 [GEMINI] Fetching image...");
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
        
        const imageData = await imageResponse.arrayBuffer();
        const imageBytes = new Uint8Array(imageData);
        console.log("🔍 [GEMINI] Image fetched, size:", imageBytes.length);

        // Get the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("🔍 [GEMINI] Model initialized");

        // Create the prompt with the specific category
        const prompt = `Please give a description of the ${category} in the photos. 
            There are a few rules. Use 7 lowercase descriptions separated by commas to describe the ${category}. 
            Do not use overly specific words to describe the ${category}. 
            Give one description per photo.
            Every word needs to be entirely lowercase.
            Make the descriptions as follows in this order:
            1. Note the genre of the ${category} (i.e. casual, athletic, formal, etc.),
            2. Note the length of the ${category} (i.e. short-sleeve, long-sleeve, etc.),
            3. Note the EXACT type of ${category} (be very specific - e.g. distinguish between: jeans shorts, cargo shorts, athletic shorts, boxer shorts, briefs, underwear, pants, skirt, etc.),
            4. Note the pattern of the ${category} (i.e. striped, solid, multicolor, etc.),
            5. Note that there are graphics, don't specify the design (only "graphic" or "no graphic").
            6. Make a guess at the material of the ${category} (i.e. cotton, polyester, denim, etc.).
            7. Note the predominant color of the ${category} (i.e. blue, black, red, etc.). Use basic color terms.
            Do not make the description a bullet point list.
            Do not use words 'a, an, the'.
            
            IMPORTANT: For bottoms, be extremely precise about the type. For example, distinguish clearly between underwear, briefs, boxers, jean shorts, denim shorts, cargo shorts, athletic shorts, etc. This is critical for accurate classification.`;

        console.log("🔍 [GEMINI] Sending to Gemini...");
        // Generate content
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: Buffer.from(imageBytes).toString('base64'),
                    mimeType: 'image/jpeg'
                }
            }
        ]);
        const response = await result.response;
        const text = response.text();
        console.log("🔍 [GEMINI] Raw response:", text);

        // Parse the response
        const descriptions = text.split(",").map((word: string) => word.trim().toLowerCase());
        console.log("🔍 [GEMINI] Parsed descriptions:", descriptions);

        // Format the analysis to match similarityDescription.py format
        const analysis: ImageAnalysis = {
            genre: descriptions[0] || "unknown",
            length: descriptions[1] || "unknown",
            type: descriptions[2] || "unknown",
            pattern: descriptions[3] || "unknown",
            graphic: descriptions[4]?.includes("no") || descriptions[4]?.includes("not") ? "no graphic" : "graphic",
            fabrics: descriptions[5] ? [descriptions[5]] : [],
            color: descriptions[6] || "unknown"
        };
        console.log("🔍 [GEMINI] Final analysis:", analysis);

        return NextResponse.json({ 
            success: true, 
            "analyzed description": analysis,
            category // Return the detected category
        });
    } catch (error) {
        console.error("🔍 [ERROR] Gemini analysis failed:", error);
        return NextResponse.json({ 
            error: "Failed to analyze image",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
} 