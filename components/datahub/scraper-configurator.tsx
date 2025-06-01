import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Globe, Check, ChevronDown } from 'lucide-react'

interface ScraperSite {
  id: string
  name: string
  enabled: boolean
  categories: {
    id: string
    name: string
    enabled: boolean
    subcategories: {
      id: string
      name: string
      enabled: boolean
      items: string[]
    }[]
  }[]
}

const SCRAPER_SITES: ScraperSite[] = [
  {
    id: "uniqlo",
    name: "Uniqlo",
    enabled: true,
    categories: [
      {
        id: "men",
        name: "Men",
        enabled: true,
        subcategories: [
          {
            id: "men-tops",
            name: "Tops",
            enabled: true,
            items: []
          },
          {
            id: "men-shirts-and-polo-shirts",
            name: "Shirts & Polo Shirts",
            enabled: true,
            items: []
          },
          {
            id: "men-bottoms",
            name: "Bottoms",
            enabled: true,
            items: []
          }
        ]
      },
      {
        id: "women",
        name: "Women",
        enabled: true,
        subcategories: [
          {
            id: "women-tops",
            name: "Tops",
            enabled: true,
            items: []
          },
          {
            id: "women-shirts-and-blouses",
            name: "Shirts & Blouses",
            enabled: true,
            items: []
          },
          {
            id: "women-bottoms",
            name: "Bottoms",
            enabled: true,
            items: []
          },
          {
            id: "women-dresses-and-jumpsuits",
            name: "Dresses & Jumpsuits",
            enabled: true,
            items: []
          }
        ]
      },
      {
        id: "kids",
        name: "Kids",
        enabled: true,
        subcategories: [
          {
            id: "kids-bottoms",
            name: "Bottoms",
            enabled: true,
            items: ["Shorts"]
          }
        ]
      }
    ]
  },
  {
    id: "hm",
    name: "H&M",
    enabled: true,
    categories: [
      {
        id: "men",
        name: "Men",
        enabled: true,
        subcategories: [
          {
            id: "men-t-shirts",
            name: "T-Shirts",
            enabled: true,
            items: []
          },
          {
            id: "men-shirts",
            name: "Shirts",
            enabled: true,
            items: []
          },
          {
            id: "men-tops",
            name: "Tops",
            enabled: true,
            items: []
          },
          {
            id: "men-trousers-and-jeans",
            name: "Trousers & Jeans",
            enabled: true,
            items: []
          },
          {
            id: "men-shorts",
            name: "Shorts",
            enabled: true,
            items: []
          }
        ]
      },
      {
        id: "women",
        name: "Women",
        enabled: true,
        subcategories: [
          {
            id: "women-tops",
            name: "Tops",
            enabled: true,
            items: []
          },
          {
            id: "women-t-shirts",
            name: "T-Shirts",
            enabled: true,
            items: []
          },
          {
            id: "women-dresses",
            name: "Dresses",
            enabled: true,
            items: []
          },
          {
            id: "women-trousers-and-jeans",
            name: "Trousers & Jeans",
            enabled: true,
            items: []
          },
          {
            id: "women-skirts",
            name: "Skirts",
            enabled: true,
            items: []
          }
        ]
      },
      {
        id: "kids",
        name: "Kids",
        enabled: true,
        subcategories: [
          {
            id: "kids-shorts",
            name: "Shorts",
            enabled: true,
            items: []
          }
        ]
      }
    ]
  },
  {
    id: "zara",
    name: "Zara",
    enabled: true,
    categories: [
      {
        id: "men",
        name: "Men",
        enabled: true,
        subcategories: [
          {
            id: "men-shirts",
            name: "Shirts",
            enabled: true,
            items: []
          },
          {
            id: "men-linen",
            name: "Linen",
            enabled: true,
            items: []
          },
          {
            id: "men-t-shirts",
            name: "T-Shirts",
            enabled: true,
            items: []
          },
          {
            id: "men-polos",
            name: "Polos",
            enabled: true,
            items: []
          },
          {
            id: "men-trousers",
            name: "Trousers",
            enabled: true,
            items: []
          },
          {
            id: "men-jeans",
            name: "Jeans",
            enabled: true,
            items: []
          },
          {
            id: "men-shorts",
            name: "Shorts",
            enabled: true,
            items: []
          }
        ]
      },
      {
        id: "women",
        name: "Women",
        enabled: true,
        subcategories: [
          {
            id: "women-tops",
            name: "Tops",
            enabled: true,
            items: []
          },
          {
            id: "women-shirts",
            name: "Shirts",
            enabled: true,
            items: []
          },
          {
            id: "women-t-shirts",
            name: "T-Shirts",
            enabled: true,
            items: []
          },
          {
            id: "women-dresses",
            name: "Dresses",
            enabled: true,
            items: []
          },
          {
            id: "women-jeans",
            name: "Jeans",
            enabled: true,
            items: []
          },
          {
            id: "women-trousers",
            name: "Trousers",
            enabled: true,
            items: []
          },
          {
            id: "women-skirts",
            name: "Skirts",
            enabled: true,
            items: []
          }
        ]
      },
      {
        id: "kids",
        name: "Kids",
        enabled: true,
        subcategories: [
          {
            id: "kids-shorts",
            name: "Shorts",
            enabled: true,
            items: []
          },
          {
            id: "kids-skirts",
            name: "Skirts",
            enabled: true,
            items: []
          }
        ]
      }
    ]
  }
]

export function ScraperConfigurator({ className }: { className?: string }) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [openSubcategories, setOpenSubcategories] = useState<string[]>([])
  const [sites, setSites] = useState<ScraperSite[]>(SCRAPER_SITES)
  const [isRunning, setIsRunning] = useState(false)
  const [siteProgress, setSiteProgress] = useState<Record<string, number>>({})

  // Calculate total progress
  const getTotalProgress = () => {
    if (!isRunning) return 0
    const totalSites = sites.length
    const completedProgress = Object.values(siteProgress).reduce((sum, progress) => sum + progress, 0)
    return Math.round((completedProgress / (totalSites * 100)) * 100)
  }

  const runScraper = useCallback(async () => {
    setIsRunning(true)
    setSiteProgress({})
    
    // Log the selected configuration
    console.log("Starting scraper with configuration:")
    
    // Process each site sequentially
    for (const site of sites) {
      // Skip disabled sites
      if (!site.enabled) {
        console.log(`Skipping disabled site: ${site.name}`)
        continue
      }
      
      // Get enabled categories and subcategories for this site
      const enabledCategories = site.categories
        .filter(cat => cat.enabled)
        .map(cat => cat.id)
      
      const enabledSubcategories = site.categories.flatMap(cat => 
        cat.subcategories
          .filter(sub => sub.enabled)
          .map(sub => sub.id)
      )
      
      console.log(`${site.name}:`)
      console.log(`- Enabled: ${site.enabled}`)
      console.log(`- Categories: ${enabledCategories.join(', ')}`)
      console.log(`- Subcategories: ${enabledSubcategories.join(', ')}`)
      console.log('-------------------')
      
      // Initialize progress for this site
      setSiteProgress(prev => ({ ...prev, [site.id]: 0 }))
      
      try {
        // Determine which API route to call based on site ID
        const apiRoute = `/api/scrape-${site.id}`
        
        // Create the request payload
        const payload = {
          categories: enabledCategories,
          subcategories: enabledSubcategories
        }
        
        // Start a progress update interval
        const progressInterval = setInterval(() => {
          setSiteProgress(prev => ({
            ...prev,
            [site.id]: prev[site.id] >= 95 ? 95 : prev[site.id] + 2
          }))
        }, 50)
        
        // Call the API route
        const response = await fetch(apiRoute, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        
        // Clear the progress interval
        clearInterval(progressInterval)
        
        if (!response.ok) {
          throw new Error(`Error scraping ${site.name}: ${response.statusText}`)
        }
        
        const result = await response.json()
        console.log(`${site.name} scraping completed:`, result)
        
        // Set progress to 100% when done
        setSiteProgress(prev => ({ ...prev, [site.id]: 100 }))
        
      } catch (error) {
        console.error(`Error scraping ${site.name}:`, error)
        // Set progress to indicate error
        setSiteProgress(prev => ({ ...prev, [site.id]: 100 }))
      }
    }

    // Keep completed state visible briefly
    setTimeout(() => {
      setIsRunning(false)
      setSiteProgress({})
      console.log("Scraper run completed")
    }, 1000)
  }, [sites])

  const toggleSite = (siteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSites(currentSites =>
      currentSites.map(site => {
        if (site.id !== siteId) return site
        
        const willBeEnabled = !site.enabled
        return {
          ...site,
          enabled: willBeEnabled,
          categories: site.categories.map(category => ({
            ...category,
            enabled: willBeEnabled
          }))
        }
      })
    )
  }

  const toggleCategory = (siteId: string, categoryId: string) => {
    setSites(currentSites =>
      currentSites.map(site => {
        if (site.id !== siteId) return site

        // Find if this is a parent category
        const parentCategory = site.categories.find(cat => cat.id === categoryId)
        
        if (parentCategory) {
          // This is a parent category - toggle it and all its subcategories
          const newEnabledState = !parentCategory.enabled
          
          return {
            ...site,
            categories: site.categories.map(category => {
              if (category.id === categoryId) {
                // Update the parent and all its subcategories
                return {
                  ...category,
                  enabled: newEnabledState,
                  subcategories: category.subcategories.map(sub => ({
                    ...sub,
                    enabled: newEnabledState
                  }))
                }
              }
              return category
            })
          }
        } else {
          // This is a subcategory - find its parent and update accordingly
          return {
            ...site,
            categories: site.categories.map(category => {
              // Check if this category contains our subcategory
              const subcategoryIndex = category.subcategories.findIndex(
                sub => sub.id === categoryId
              )

              if (subcategoryIndex >= 0) {
                // Found the parent category
                const updatedSubcategories = category.subcategories.map(sub =>
                  sub.id === categoryId ? { ...sub, enabled: !sub.enabled } : sub
                )

                // Check if all subcategories are enabled
                const allSubcategoriesEnabled = updatedSubcategories.every(sub => sub.enabled)
                // Check if any subcategories are enabled
                const anySubcategoriesEnabled = updatedSubcategories.some(sub => sub.enabled)

                return {
                  ...category,
                  // Parent is only enabled if ALL subcategories are enabled
                  enabled: allSubcategoriesEnabled,
                  // Keep track of partial selection through subcategories state
                  subcategories: updatedSubcategories
                }
              }
              return category
            })
          }
        }
      })
    )
  }

  const toggleAllCategories = (siteId: string) => {
    setSites(currentSites =>
      currentSites.map(site => {
        if (site.id !== siteId) return site
        
        const allEnabled = site.categories.every(cat => cat.enabled)
        const newEnabledState = !allEnabled

        return {
          ...site,
          enabled: newEnabledState,
          categories: site.categories.map(category => ({
            ...category,
            enabled: newEnabledState
          }))
        }
      })
    )
  }

  const toggleDropdown = (siteId: string) => {
    setOpenDropdown(openDropdown === siteId ? null : siteId)
  }

  const areAllCategoriesEnabled = (site: ScraperSite) => {
    return site.categories.every(category => category.enabled)
  }

  const hasEnabledCategories = (site: ScraperSite) => {
    return site.categories.some(category => category.enabled)
  }

  const getCategoryBadges = (site: ScraperSite) => {
    const enabledCategories = site.categories.filter(cat => cat.enabled)
    if (enabledCategories.length === 0) return null
    if (enabledCategories.length === site.categories.length) {
      return (
        <span className={cn(
          "px-2 py-0.5 text-xs font-medium rounded-full",
          "bg-emerald-100 text-emerald-700",
          "dark:bg-emerald-500/20 dark:text-emerald-400"
        )}>
          All
        </span>
      )
    }

    return (
      <div className="flex gap-1">
        {enabledCategories.map(cat => (
          <span
            key={cat.id}
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full",
              cat.id === "men" && "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
              cat.id === "women" && "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
              cat.id === "kids" && "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
            )}
          >
            {cat.name}
          </span>
        ))}
      </div>
    )
  }

  const getEnabledCategoriesSummary = (site: ScraperSite) => {
    const enabledCategories = site.categories.filter(cat => cat.enabled)
    if (enabledCategories.length === 0) return "No categories selected"
    if (enabledCategories.length === site.categories.length) return "All categories"
    
    const names = enabledCategories.map(cat => cat.name)
    if (names.length <= 2) return names.join(", ")
    return `${names[0]}, ${names[1]} +${names.length - 2}`
  }

  const toggleSubcategory = (categoryId: string) => {
    setOpenSubcategories(current => {
      if (current.includes(categoryId)) {
        return current.filter(id => id !== categoryId)
      }
      return [...current, categoryId]
    })
  }

  // Add a helper function to check for partial selection
  const isPartiallySelected = (category: { subcategories: { enabled: boolean }[] }) => {
    const enabledCount = category.subcategories.filter(sub => sub.enabled).length
    return enabledCount > 0 && enabledCount < category.subcategories.length
  }

  return (
    <div className={cn(
      "p-4 rounded-xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700",
      "w-full h-full",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">Scraper Configuration</span>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className={cn(
              "text-sm font-medium",
              getTotalProgress() === 100 
                ? "text-emerald-600 dark:text-emerald-500" 
                : "text-primary"
            )}>
              {getTotalProgress()}%
            </span>
          )}
          <button 
            onClick={runScraper}
            disabled={isRunning}
            className={cn(
              "px-3 py-1.5 text-xs font-medium",
              "rounded-lg",
              "transition-colors",
              isRunning 
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isRunning ? 'RUNNING...' : 'RUN'}
          </button>
        </div>
      </div>

      <div className="space-y-2 h-[calc(100%-48px)] overflow-y-auto">
        {sites.map((site, index) => (
          <div key={site.id} className={cn(
            "relative",
            // Higher z-index for open dropdowns
            openDropdown === site.id ? "z-30" : "z-10",
          )}>
            <div
              onClick={() => !isRunning && toggleDropdown(site.id)}
              className={cn(
                "flex items-center justify-between",
                "p-2 rounded-lg",
                "bg-zinc-50 dark:bg-zinc-800/50",
                "border border-zinc-200 dark:border-zinc-700",
                !hasEnabledCategories(site) && "opacity-50",
                !isRunning && "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50",
                "transition-all duration-200",
                "relative overflow-hidden"
              )}
            >
              {// Progress bar overlay
              isRunning && siteProgress[site.id] !== undefined && (
                <div 
                  className={cn(
                    "absolute inset-0 transition-all duration-100 ease-out opacity-30",
                    siteProgress[site.id] === 100 
                      ? "bg-emerald-600 dark:bg-emerald-500" 
                      : "bg-primary"
                  )}
                  style={{ width: `${siteProgress[site.id]}%` }}
                />
              )}

              <div className="flex items-center gap-2 relative z-10">
                <button
                  onClick={(e) => !isRunning && toggleSite(site.id, e)}
                  className={cn(
                    "w-4 h-4 rounded",
                    "flex items-center justify-center",
                    "border-2",
                    hasEnabledCategories(site)
                      ? "bg-primary border-primary" 
                      : "border-zinc-300 dark:border-zinc-600"
                  )}
                >
                  <Check className={cn(
                    "w-3 h-3",
                    hasEnabledCategories(site) ? "text-primary-foreground" : "text-transparent"
                  )} />
                </button>
                <span className="text-sm text-zinc-900 dark:text-zinc-100">
                  {site.name}
                </span>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                {getCategoryBadges(site)}
                <ChevronDown className={cn(
                  "w-4 h-4 text-zinc-400",
                  "transition-transform duration-200",
                  openDropdown === site.id && "transform rotate-180"
                )} />
              </div>
            </div>

            {openDropdown === site.id && (
              <div className={cn(
                "absolute left-0 right-0 mt-1",
                "bg-white dark:bg-zinc-800",
                "border border-zinc-200 dark:border-zinc-700",
                "rounded-lg shadow-lg",
                "py-1",
                "z-40" // Keep dropdown above other content
              )}>
                <div
                  onClick={() => toggleAllCategories(site.id)}
                  className={cn(
                    "flex items-center gap-2",
                    "px-3 py-2",
                    "border-b border-zinc-200 dark:border-zinc-700",
                    "hover:bg-zinc-50 dark:hover:bg-zinc-700/50",
                    "cursor-pointer"
                  )}
                >
                  <button
                    className={cn(
                      "w-4 h-4 rounded",
                      "flex items-center justify-center",
                      "border-2",
                      areAllCategoriesEnabled(site)
                        ? "bg-primary border-primary" 
                        : "border-zinc-300 dark:border-zinc-600"
                    )}
                  >
                    <Check className={cn(
                      "w-3 h-3",
                      areAllCategoriesEnabled(site) ? "text-primary-foreground" : "text-transparent"
                    )} />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      All Categories
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Toggle all categories for {site.name}
                    </span>
                  </div>
                </div>

                {site.categories.map((category) => (
                  <div key={category.id}>
                    <div
                      onClick={() => toggleCategory(site.id, category.id)}
                      className={cn(
                        "flex items-center justify-between",
                        "px-3 py-2",
                        "hover:bg-zinc-50 dark:hover:bg-zinc-700/50",
                        "cursor-pointer",
                        "border-b border-zinc-200 dark:border-zinc-700"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          className={cn(
                            "w-4 h-4 rounded",
                            "flex items-center justify-center",
                            "border-2",
                            category.enabled 
                              ? "bg-primary border-primary"
                              : isPartiallySelected(category)
                              ? "bg-primary/50 border-primary/50"  // New style for partial selection
                              : "border-zinc-300 dark:border-zinc-600"
                          )}
                        >
                          <Check className={cn(
                            "w-3 h-3",
                            category.enabled || isPartiallySelected(category)
                              ? "text-white"
                              : "text-transparent"
                          )} />
                        </button>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {category.name}
                        </span>
                      </div>
                      {category.subcategories.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSubcategory(category.id)
                          }}
                          className="p-1"
                        >
                          <ChevronDown className={cn(
                            "w-4 h-4 text-zinc-400",
                            "transition-transform duration-200",
                            openSubcategories.includes(category.id) && "transform rotate-180"
                          )} />
                        </button>
                      )}
                    </div>

                    {openSubcategories.includes(category.id) && (
                      <div className="pl-8">
                        {category.subcategories.map((subcategory) => (
                          <button
                            key={subcategory.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategory(site.id, subcategory.id)
                            }}
                            className={cn(
                              "flex items-center gap-2",
                              "px-2 py-1.5 rounded-md",
                              "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded",
                              "flex items-center justify-center",
                              "border-2",
                              subcategory.enabled
                                ? "bg-primary border-primary"
                                : "border-zinc-300 dark:border-zinc-600"
                            )}>
                              <Check className={cn(
                                "w-3 h-3",
                                subcategory.enabled ? "text-white" : "text-transparent"
                              )} />
                            </div>
                            <span className="text-sm">
                              {subcategory.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
