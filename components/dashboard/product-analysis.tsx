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

interface ProductAnalysisProps {
  onAnalysisStateChange?: (isAnalyzing: boolean) => void
  onReportStateChange?: (showReport: boolean) => void
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
        formattedTimestamp,
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
              productName: data.name
            }),
            signal: controller.signal
          });
          
          const analysisData = await analysisResponse.json();
          
          if (!analysisResponse.ok) {
            if (analysisData.code === "SKIPPED_ANALYSIS") {
              console.log("🔍 [GEMINI] Image analysis skipped - continuing with text-only search");
              // Continue without image analysis
            } else {
              throw new Error(analysisData.details || "Failed to analyze image");
            }
          } else if (analysisData.skipped) {
            console.log("🔍 [GEMINI] Image analysis skipped - continuing with text-only search");
            // Continue without image analysis
          } else if (analysisData["analyzed description"]) {
            imageAnalysis = analysisData["analyzed description"];
            console.log("🔍 [GEMINI] Final description:", imageAnalysis);
            
            // Store the analysis results in Firebase
            await updateDoc(doc(db, "Dashboard Inputs", docRef.id), {
              "analyzed description": imageAnalysis
            });
            console.log("Document updated with image analysis");
          }
          
          // Only run image similarity search if we have analysis data and it wasn't skipped
          if (imageAnalysis && !analysisData.skipped) {
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
                console.log(`🔍 [SIMILARITY] Image search found ${similarityResults.totalResults} similar products`);
              }
            } catch (similarityError) {
              console.error("🔍 [SIMILARITY] Error in image similarity search:", similarityError);
              // Continue with normal flow even if similarity search fails
            }
          }
        } catch (imageError) {
          console.error("Image processing failed:", imageError);
          // Continue with analysis even if image analysis fails
        }
      }
      
      // Prepare request body for price recommendation
      const requestBody = {
        query: data.name || "Image Search",
        ...(data.description && { description: data.description }),
        ...(data.category && { category: data.category }),
        // Only include image analysis if we have it
        ...(imageAnalysis && { 
          "analyzed description": imageAnalysis,
          imageSearch: !data.name && !data.description && !data.category
        })
      };
      
      console.log("Price recommendation request body:", JSON.stringify(requestBody, null, 2));
      console.log("Using combined search:", !!imageAnalysis && !!(data.name || data.description || data.category));
      
      const fetchPromise = fetch("/api/price-recommendation", {
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

  const handleExport = () => {
    console.log("Exporting report...")
  }

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
