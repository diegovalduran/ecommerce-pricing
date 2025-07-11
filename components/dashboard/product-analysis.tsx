"use client"

import { useState, useEffect } from "react"
import { ProductInput, type ProductData } from "@/components/dashboard/product-input"
import { Report } from "@/components/dashboard/report"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RotateCcw, Download, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { collection, addDoc, updateDoc, doc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase/config"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { toast } from "sonner"

interface ProductAnalysisProps {
  onAnalysisStateChange?: (isAnalyzing: boolean) => void
  onReportStateChange?: (showReport: boolean) => void
}

// Helper function to get the base URL
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export function ProductAnalysis({ onAnalysisStateChange, onReportStateChange }: ProductAnalysisProps) {
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(15)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const analysisSteps = [
    "Searching product database",
    "Analyzing product image",
    "Finding similar products",
    "Calculating optimal price point",
    "Generating market insights"
  ]

  const handleProductSubmit = async (data: ProductData) => {
    const controller = new AbortController();
    setAbortController(controller);
    
    setProductData(data)
    setIsAnalyzing(true)
    setTimeRemaining(15)
    setProgress(0)
    
    try {
      // Format the current date in a human-readable format
      const now = new Date();
      const formattedTimestamp = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // First save basic product data to Firestore
      console.log("Storing initial data in Firebase...");
      const dashboardInputsRef = collection(db, "Dashboard Inputs");
      const docRef = await addDoc(dashboardInputsRef, {
        productName: data.name,
        description: data.description || '',
        formattedTimestamp, // Add human-readable timestamp
        timestamp: new Date().toISOString()
      });
      console.log("Initial product data saved to Firebase with ID:", docRef.id);
      
      // Process and upload image if available
      let imageUrl = null;
      let imageAnalysis = null;
      
      if (data.image instanceof File) {
        try {
          console.log("🔍 [IMAGE] Starting image upload...");
          const imageRef = ref(storage, `product-images/${Date.now()}-${data.image.name}`);
          await uploadBytes(imageRef, data.image);
          imageUrl = await getDownloadURL(imageRef);
          console.log("🔍 [IMAGE] Uploaded to:", imageUrl);
          
          // Update the document with the image URL
          await updateDoc(doc(db, "Dashboard Inputs", docRef.id), {
            imageUrl: imageUrl
          });
          console.log("Document updated with image URL");
          
          // Call the analyze-image API to get image descriptions using Gemini
          console.log("🔍 [GEMINI] Starting image analysis...");
          const analysisResponse = await fetch("/api/analyze-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              imageUrl,
              productName: data.name // Pass product name to help with category detection
            }),
            signal: controller.signal
          });
          
          if (!analysisResponse.ok) {
            const errorData = await analysisResponse.json();
            throw new Error(errorData.details || "Failed to analyze image");
          }
          
          const analysisData = await analysisResponse.json();
          console.log("🔍 [GEMINI] Analysis result:", analysisData);
          
          if (!analysisData["analyzed description"]) {
            throw new Error("No analysis data received from Gemini");
          }
          
          imageAnalysis = analysisData["analyzed description"];
          console.log("🔍 [GEMINI] Final description:", imageAnalysis);
          
          // Store the analysis results in Firebase
          await updateDoc(doc(db, "Dashboard Inputs", docRef.id), {
            "analyzed description": imageAnalysis
          });
          console.log("Document updated with image analysis");
          
          // Run image similarity search and log results (do not show in UI)
          try {
            console.log("🔍 [SIMILARITY] Running image-based product similarity search...");
            const imageSimilarityResponse = await fetch("/api/image-search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productName: data.name,
                analyzedDescription: imageAnalysis,
                imageSearch: true
              }),
              signal: controller.signal
            });
            
            if (imageSimilarityResponse.ok) {
              const similarityResults = await imageSimilarityResponse.json();
              
              // Log the total count
              console.log(`🔍 [SIMILARITY] Image search found ${similarityResults.totalResults} similar products based on image analysis`);
              
              // Extract top results
              const topItems = similarityResults.results && similarityResults.results.length > 0 
                ? similarityResults.results.slice(0, 5) 
                : [];
              
              // Force each result to be logged separately rather than as an array
              if (topItems.length > 0) {
                console.log("🔍 [SIMILARITY] Most similar items:");
                
                // Log each item individually with string concatenation
                for (let i = 0; i < topItems.length; i++) {
                  const item = topItems[i];
                  const itemName = item.name || 'Unnamed';
                  const collectionName = item.collection || 'Unknown';
                  const docId = item.id || 'No ID';
                  const scoreValue = typeof item.score === 'number' ? item.score.toFixed(3) : 'N/A';
                  
                  // Log as plain text
                  console.log("Item " + (i+1) + ": \"" + itemName + "\" - Collection: \"" + collectionName + "\", ID: \"" + docId + "\" (Score: " + scoreValue + ")");
                }
                
                // Also log simple collection:id pairs
                console.log("🔍 [SIMILARITY] Quick reference - collection:id pairs:");
                for (let i = 0; i < topItems.length; i++) {
                  const item = topItems[i];
                  console.log(item.collection + " : " + item.id);
                }
              } else {
                console.log("🔍 [SIMILARITY] No similar items found");
              }
            } else {
              console.error("🔍 [SIMILARITY] Image search failed");
            }
          } catch (similarityError) {
            console.error("🔍 [SIMILARITY] Error in image similarity search:", similarityError);
            // Continue with normal flow even if similarity search fails
          }
        } catch (imageError) {
          console.error("Image processing failed:", imageError);
          // Continue with analysis even if image analysis fails
        }
      }
      
      // Always include text data (name, description, category) if available
      // If image analysis is available, include it as well, but don't make it an exclusive image search
      // This way, we combine both text and image search capabilities
      const requestBody = {
        query: data.name || "Image Search",
        ...(data.description && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(imageAnalysis && { 
          "analyzed description": imageAnalysis,
          // Only set imageSearch to true if there's no text data available
          imageSearch: !data.name && !data.description && !data.category
        })
      };
      
      console.log("Price recommendation request body:", JSON.stringify(requestBody, null, 2));
      console.log("Using combined search:", !!imageAnalysis && !!(data.name || data.description || data.category));
      
      const apiUrl = `${getBaseUrl()}/api/price-recommendation`;
      console.log("Calling price recommendation API at:", apiUrl);
      
      const fetchPromise = fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      let progressTimer = setInterval(() => {
        setProgress(prev => {
          const increment = Math.max(0.5, 3 * (1 - prev/100));
          return Math.min(prev + increment, 95);
        });
      }, 150);
      
      const response = await fetchPromise;
      clearInterval(progressTimer);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const responseData = await response.json();
      
      setProductData(prevData => {
        const competitors = responseData.competitors?.map((comp: {
          name: string;
          price: {
            original: number;
            discounted: number;
            currency: string;
          };
          similarity: number;
          url?: string;
        }) => ({
          ...comp,
          url: comp.url || undefined
        })) || [];
        
        return {
          ...prevData!,
          recommendedPrice: responseData.recommendedPrice,
          currency: responseData.currency,
          competitorsCount: competitors.length,
          competitors: competitors,
          insights: responseData.insights || [],
          reasoning: responseData.reasoning || [],
          "analyzed description": imageAnalysis // Include the image analysis in the product data
        };
      });
      
      // Update the Firestore document with analysis results
      try {
        await updateDoc(doc(db, "Dashboard Inputs", docRef.id), {
          recommendedPrice: responseData.recommendedPrice
        });
        console.log("Document updated with analysis results");
      } catch (updateError) {
        console.error("Error updating document with analysis results:", updateError);
      }
      
      setProgress(100);
      setCurrentStep(analysisSteps.length - 1);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setIsAnalyzing(false);
      setShowReport(true);
    } catch (error: any) {
      console.error("Error analyzing product:", error);
      setIsAnalyzing(false);
      
      if (error.name === 'AbortError') {
        setError('Analysis was cancelled');
      } else {
        setError(`Error analyzing product: ${error.message || 'Unknown error'}`);
      }
    }
  }

  useEffect(() => {
    if (!isAnalyzing) return;
    
    const timeInterval = setInterval(() => {
      setTimeRemaining(prev => Math.max(prev - 1, 0));
    }, 1000);
    
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const stepIndex = Math.min(
          Math.floor(progress / (100 / analysisSteps.length)),
          analysisSteps.length - 1
        );
        return stepIndex;
      });
    }, 300);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(stepInterval);
    };
  }, [isAnalyzing, progress, analysisSteps.length]);

  useEffect(() => {
    onAnalysisStateChange?.(isAnalyzing)
  }, [isAnalyzing, onAnalysisStateChange])

  useEffect(() => {
    onReportStateChange?.(showReport)
  }, [showReport, onReportStateChange])

  const handleRestart = () => {
    setProductData(null)
    setShowReport(false)
    setError(null)
  }
  
  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
    
    setIsAnalyzing(false);
    setProgress(0);
    setTimeRemaining(15);
    setError(null);
  }

  const handleExport = async () => {
    const reportElement = document.getElementById("analysis-report-root");
    if (!reportElement) return;
    
    try {
      const canvas = await html2canvas(reportElement, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Fit image to page width
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight, undefined, "FAST");
      pdf.save("product-analysis-report.pdf");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export report");
    }
  };

  return (
    <div className="w-full max-w-none">
      {!showReport && !isAnalyzing && (
        <div className="w-full bg-card text-card-foreground rounded-lg border shadow-sm">
          <ProductInput 
            onSubmit={handleProductSubmit} 
            onAnalysisComplete={() => {}}
          />
        </div>
      )}

      {isAnalyzing && productData && (
        <div className="w-full bg-card text-card-foreground rounded-lg border shadow-sm p-6">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-medium">Analyzing your product...</h3>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Processing your request...</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{analysisSteps[currentStep]}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
            
            <div className="space-y-1 text-xs">
              {analysisSteps.map((step, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${index <= currentStep ? 'bg-primary' : 'bg-muted'}`}></div>
                  <span className={index <= currentStep ? 'text-foreground' : 'text-muted-foreground'}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="text-center">We're analyzing thousands of products to find the best price for:</p>
              <p className="text-center font-medium text-foreground">{productData.name}</p>
            </div>
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Cancel Analysis
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReport && productData && (
        <div className="w-full bg-card text-card-foreground rounded-lg border shadow-sm">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Analysis Report</h2>
            <div className="flex space-x-2">
              <Button onClick={handleRestart} variant="outline" size="sm">
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
          <div className="p-6">
            <Report productData={productData} />
          </div>
        </div>
      )}

      {error && (
        <div className="w-full p-4 bg-destructive/10 border-destructive/20 border rounded-lg">
          <div className="text-destructive text-sm">{error}</div>
        </div>
      )}
    </div>
  )
}
