import { cn } from "@/lib/utils"
import { Search, ChevronDown, Check } from "lucide-react"
import { useState, Dispatch, SetStateAction, useEffect, useRef, useCallback } from "react"
import * as Slider from "@radix-ui/react-slider"
import { FilterDropdown } from "../ui/filter-dropdown"
import { SelectedFilters } from "./selected-filters"
import { SIZE_FILTER_OPTIONS, FabricMaterial, FABRIC_FILTER_OPTIONS } from "@/types/database"

// Define category structure with normalized types
interface Category {
  id: string
  name: string
  subcategories: { id: string; name: string }[]
}

export const CATEGORIES: Category[] = [
  {
    id: "men",
    name: "Men",
    subcategories: [
      { id: "men-tops", name: "Tops" },          // For general tops, tank tops
      { id: "men-tshirts", name: "T-Shirts" },   // For t-shirts, graphic tees
      { id: "men-shirts-polos", name: "Shirts & Polos" }, // For dress shirts, casual shirts, polos
      { id: "men-bottoms", name: "Bottoms" },    // For pants, trousers
      { id: "men-shorts", name: "Shorts" },      // For shorts, bermudas
      { id: "men-jeans", name: "Jeans" },        // For jeans, denim
    ]
  },
  {
    id: "women",
    name: "Women",
    subcategories: [
      { id: "women-tops", name: "Tops" },        // For general tops, blouses
      { id: "women-tshirts", name: "T-Shirts" }, // For t-shirts
      { id: "women-shirts", name: "Shirts & Blouses" },    // For shirts, blouses
      { id: "women-dresses", name: "Dresses & Jumpsuits" },  // For dresses, jumpsuits
      { id: "women-bottoms", name: "Bottoms" },  // For pants, trousers
      { id: "women-skirts", name: "Skirts" },    // For skirts
    ]
  },
  {
    id: "kids",
    name: "Kids",
    subcategories: [
      { id: "kids-shorts", name: "Shorts" },     // For shorts, bermudas
      { id: "kids-skirts", name: "Skirts" },     // For skirts (girls)
    ]
  },
  {
    id: "other",
    name: "Other",
    subcategories: [
      { id: "other-unknown", name: "Uncategorized" }, // For unknown product types
    ]
  }
] as const;

// Type mapping to handle different store variations
export const TYPE_MAPPINGS = {
  // T-Shirt variations
  "t_shirt": ["men-tshirts", "women-tshirts", "kids-tops"],
  "t-shirt": ["men-tshirts", "women-tshirts", "kids-tops"],
  "tshirt": ["men-tshirts", "women-tshirts", "kids-tops"],
  "tshirts": ["men-tshirts", "women-tshirts", "kids-tops"],
  
  // Shirt variations
  "shirt": ["men-shirts-polos", "women-shirts"],
  "shirts": ["men-shirts-polos", "women-shirts"],
  
  // Top variations
  "top": ["men-tops", "women-tops", "kids-tops"],
  "tops": ["men-tops", "women-tops", "kids-tops"],
  
  // Shorts
  "shorts": ["men-shorts", "kids-shorts"],
  "bermudas": ["men-shorts", "kids-shorts"],
  "bermuda": ["men-shorts", "kids-shorts"],
  "bottoms shorts": ["kids-shorts"],
  
  // Jeans
  "jeans": ["men-jeans", "women-jeans"],
  "denim": ["men-jeans", "women-jeans"],
  
  // Bottoms
  "bottoms": ["men-bottoms", "women-bottoms", "kids-bottoms"],
  "trousers": ["men-bottoms", "women-bottoms", "kids-bottoms"],
  "pants": ["men-bottoms", "women-bottoms", "kids-bottoms"],
  
  // Dress
  "dress": ["women-dresses", "kids-dresses"],
  "dresses": ["women-dresses", "kids-dresses"],
  "jumpsuit": ["women-dresses"],
  "jumpsuits": ["women-dresses"],
  
  // Skirt
  "skirt": ["women-skirts", "kids-skirts"],
  "skirts": ["women-skirts", "kids-skirts"],
  "girl skirts": ["kids-skirts"],
  
  // Special cases from your list
  "shirts and polo shirts": ["men-shirts-polos"],
  "dresses and jumpsuits": ["women-dresses"],
  "shirts and blouses": ["women-shirts"],
  
  // Zara types
  "boy bermudas": ["kids-shorts"],
  "polos": ["men-shirts-polos"],
} as const;

export const SORT_OPTIONS = [
  { id: "relevance", name: "Relevance" },
  { id: "price-asc", name: "Price: Low to High" },
  { id: "price-desc", name: "Price: High to Low" },
  { id: "rating", name: "Highest Rated" },
  { id: "newest", name: "Newest First" },
] as const

export const BRANDS = [
  { id: "uniqlo", name: "UNIQLO" },
  { id: "hm", name: "H&M" },
  { id: "zara", name: "ZARA" },
] as const

export const PRICE_RANGES = [
  { id: "0-25", name: "Under $25" },
  { id: "25-50", name: "$25 to $50" },
  { id: "50-100", name: "$50 to $100" },
  { id: "100-plus", name: "Over $100" }
] as const;

export const SIZE_GROUPS = [
  { id: "xs", name: "XS" },
  { id: "s", name: "S" },
  { id: "m", name: "M" },
  { id: "l", name: "L" },
  { id: "xl", name: "XL" },
  { id: "xxl", name: "XXL" }
] as const;

export const STOCK_STATUS = [
  { id: "in-stock", name: "In Stock" },
  { id: "low-stock", name: "Low Stock" },
] as const;

// Add new constants for the filters
export const RATINGS = [
  { id: "4-plus", name: "4★ & up" },
  { id: "3-plus", name: "3★ & up" },
  { id: "2-plus", name: "2★ & up" },
  { id: "1-plus", name: "1★ & up" }
] as const;

export const PROMOTIONS = [
  { id: "available-soon", name: "Available Soon" },
  { id: "discount", name: "Discount" },
  { id: "new", name: "New" },
  { id: "no-promotions", name: "No Promotions" }
] as const;

export const COLORS = [
  { id: 'black/grey', name: 'Black & Grey' },
  { id: 'white/cream', name: 'White & Cream' },
  { id: 'red/pink', name: 'Red & Pink' },
  { id: 'blue', name: 'Blue' },
  { id: 'green', name: 'Green' },
  { id: 'yellow/gold', name: 'Yellow & Gold' },
  { id: 'orange', name: 'Orange' },
  { id: 'purple/lavender', name: 'Purple & Lavender' },
  { id: 'brown/beige/tan', name: 'Brown, Beige & Tan' },
  { id: 'other', name: 'Other' }
] as const;

export const FABRICS = [
  { id: "cotton", name: "Cotton" },
  { id: "polyester", name: "Polyester" },
  { id: "linen", name: "Linen" },
  { id: "wool", name: "Wool" },
  { id: "denim", name: "Denim" },
  { id: "silk", name: "Silk" }
] as const;

interface ConfiguratorProps {
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  selectedBrands: string[]
  setSelectedBrands: Dispatch<SetStateAction<string[]>>
  filters: any // Replace with proper type
  setFilters: Dispatch<SetStateAction<any>>
  isLoading: boolean
  className?: string
  selectedCategories: string[]
  setSelectedCategories: Dispatch<SetStateAction<string[]>>
  selectedSizes: string[]
  setSelectedSizes: Dispatch<SetStateAction<string[]>>
  selectedColors: string[]
  setSelectedColors: Dispatch<SetStateAction<string[]>>
  selectedAvailability: string[]
  setSelectedAvailability: Dispatch<SetStateAction<string[]>>
  selectedPromotions: string[]
  setSelectedPromotions: Dispatch<SetStateAction<string[]>>
  selectedFabrics: string[]
  setSelectedFabrics: Dispatch<SetStateAction<string[]>>
  priceRangeLimits: [number, number]
  priceRange: [number, number]
  setPriceRange: Dispatch<SetStateAction<[number, number]>>
  ratingRange: [number, number]
  setRatingRange: Dispatch<SetStateAction<[number, number]>>
  onRemoveBrand: (brandId: string) => void
  onRemoveCategory: (categoryId: string) => void
  onRemoveColor: (colorId: string) => void
  onRemoveAvailability: (status: string) => void
  onRemovePromotion: (promo: string) => void
  onRemoveFabric: (fabric: string) => void
}

const categoryMap = {
  // Main categories
  "men": ["uniqlo", "hm", "zara"],
  "women": ["uniqlo", "hm", "zara"],
  "kids": ["uniqlo", "hm", "zara"],
  "other": ["uniqlo", "hm", "zara"],

  // Men's subcategories
  "men-tops": ["uniqlo", "hm", "zara"],
  "men-tshirts": ["uniqlo", "hm", "zara"],
  "men-shirts-polos": ["uniqlo", "hm", "zara"],
  "men-bottoms": ["uniqlo", "hm"],
  "men-shorts": ["uniqlo", "hm", "zara"],
  "men-jeans": ["uniqlo", "hm", "zara"],

  // Women's subcategories
  "women-tops": ["uniqlo", "hm", "zara"],
  "women-tshirts": ["uniqlo", "hm", "zara"],
  "women-shirts": ["uniqlo", "hm", "zara"],
  "women-dresses": ["hm", "zara"],
  "women-bottoms": ["uniqlo", "hm"],
  "women-skirts": ["hm", "zara"],
  "women-jeans": ["uniqlo", "hm", "zara"],

  // Kids subcategories
  "kids-tops": ["uniqlo", "hm", "zara"],
  "kids-bottoms": ["uniqlo", "hm", "zara"],
  "kids-shorts": ["uniqlo", "hm", "zara"],
  "kids-skirts": ["zara"],
  
  // Other subcategories
  "other-unknown": ["uniqlo", "hm", "zara"]
} as const;

type CategoryMapKey = keyof typeof categoryMap;
type BrandId = (typeof categoryMap)[CategoryMapKey][number];

// Helper function to check if a category is available for selected brands
const isCategoryAvailable = (categoryId: string, selectedBrands: string[]): boolean => {
  // Remove the check for empty selectedBrands
  // if (selectedBrands.length === 0) return false;
  
  const category = categoryMap[categoryId as CategoryMapKey];
  if (!category) return false;
  
  // If no brands are selected, return true to enable all categories
  if (selectedBrands.length === 0) return true;
  
  return selectedBrands.some(brand => (category as readonly string[]).includes(brand));
};

const getBrandBadgeStyle = (brandId: string) => {
  switch(brandId) {
    case 'zara':
      return 'bg-zinc-900 text-white dark:bg-zinc-800';
    case 'hm':
      return 'bg-red-600 text-white';
    case 'uniqlo':
      return 'bg-red-700 text-white';
    default:
      return 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400';
  }
};

export function DatabaseConfigurator({ className, ...props }: ConfiguratorProps) {
  const [showCategories, setShowCategories] = useState(false)
  const [showPriceRange, setShowPriceRange] = useState(false)
  const [showSizes, setShowSizes] = useState(false)
  const [showStock, setShowStock] = useState(false)
  const [showPromotions, setShowPromotions] = useState(false)
  const [showFabrics, setShowFabrics] = useState(false)
  const [ratingRange, setRatingRange] = useState([0, 5])

  const allBrandsSelected = BRANDS.every(brand => props.selectedBrands.includes(brand.id))
  
  // Update the useEffect to handle brand changes
  useEffect(() => {
    if (props.selectedBrands.length === 0) {
      props.setSelectedCategories([]);
    } else {
      // Check if any currently selected categories are no longer available
      props.setSelectedCategories(current => {
        // First, remove any categories that are no longer available
        const newSelection = current.filter(categoryId => {
          // If it's a subcategory, keep only if it's available
          const isSubcategory = !CATEGORIES.some(cat => cat.id === categoryId);
          if (isSubcategory) {
            return isCategoryAvailable(categoryId, props.selectedBrands);
          }
          return true; // Keep parent categories for now
        });

        // Then update parent categories based on their available subcategories
        CATEGORIES.forEach(category => {
          const availableSubcategoryIds = category.subcategories
            .filter(sub => isCategoryAvailable(sub.id, props.selectedBrands))
            .map(sub => sub.id);

          const allAvailableSelected = availableSubcategoryIds.length > 0 && 
            availableSubcategoryIds.every(id => newSelection.includes(id));

          const parentIndex = newSelection.indexOf(category.id);
          
          if (allAvailableSelected && parentIndex === -1) {
            // Add parent if all available subcategories are selected
            newSelection.push(category.id);
          } else if (!allAvailableSelected && parentIndex > -1) {
            // Remove parent if not all available subcategories are selected
            newSelection.splice(parentIndex, 1);
          }
        });

        return newSelection;
      });
    }
  }, [props.selectedBrands]);

  const toggleBrand = (brandId: string) => {
    if (brandId === 'all') {
      props.setSelectedBrands(BRANDS.map(brand => brand.id));
    } else {
      props.setSelectedBrands((current: string[]) => {
        return current.includes(brandId)
          ? current.filter(id => id !== brandId)
          : [...current, brandId];
      });
    }
  };

  const toggleCategory = (categoryId: string) => {
    props.setSelectedCategories(current => {
      // Check if this is a parent category
      const isParentCategory = CATEGORIES.some(cat => cat.id === categoryId);
      
      if (isParentCategory) {
        const category = CATEGORIES.find(cat => cat.id === categoryId);
        if (!category) return current;
        
        // Get available subcategories for the selected brands
        const availableSubcategories = category.subcategories
          .filter(sub => isCategoryAvailable(sub.id, props.selectedBrands))
          .map(sub => sub.id);
        
        if (current.includes(categoryId)) {
          // If parent is selected, remove parent and all its subcategories
          return current.filter(id => 
            id !== categoryId && !availableSubcategories.includes(id)
          );
        } else {
          // If parent is not selected, add parent and all its available subcategories
          const newSelection = [...current];
          
          // Add parent
          if (!newSelection.includes(categoryId)) {
            newSelection.push(categoryId);
          }
          
          // Add all available subcategories
          availableSubcategories.forEach(subId => {
            if (!newSelection.includes(subId)) {
              newSelection.push(subId);
            }
          });
          
          return newSelection;
        }
      } else {
        // This is a subcategory
        // Find the parent category
        let parentCategory = null;
        for (const cat of CATEGORIES) {
          if (cat.subcategories.some(sub => sub.id === categoryId)) {
            parentCategory = cat;
            break;
          }
        }
        
        if (!parentCategory) return current;
        
        const newSelection = [...current];
        
        if (newSelection.includes(categoryId)) {
          // If subcategory is selected, remove it
          const index = newSelection.indexOf(categoryId);
          if (index !== -1) {
            newSelection.splice(index, 1);
          }
          
          // Also remove parent if it was selected
          const parentIndex = newSelection.indexOf(parentCategory.id);
          if (parentIndex !== -1) {
            newSelection.splice(parentIndex, 1);
          }
        } else {
          // If subcategory is not selected, add it
          if (!newSelection.includes(categoryId)) {
            newSelection.push(categoryId);
          }
          
          // Check if all available subcategories are now selected
          const availableSubcategories = parentCategory.subcategories
            .filter(sub => isCategoryAvailable(sub.id, props.selectedBrands))
            .map(sub => sub.id);
          
          const allAvailableSelected = availableSubcategories.length > 0 && 
            availableSubcategories.every(id => newSelection.includes(id));
          
          // If all available subcategories are selected, also select the parent
          if (allAvailableSelected && !newSelection.includes(parentCategory.id)) {
            newSelection.push(parentCategory.id);
          }
        }
        
        return newSelection;
      }
    });
  };

  // Update the areAllSubcategoriesSelected helper to handle no brands selected
  const areAllSubcategoriesSelected = (categoryId: string) => {
    if (props.selectedBrands.length === 0) return false;
    
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return false;
    
    const availableSubcategories = category.subcategories.filter(sub => 
      isCategoryAvailable(sub.id, props.selectedBrands)
    );
    
    return availableSubcategories.length > 0 && availableSubcategories.every(sub => 
      props.selectedCategories.includes(sub.id)
    );
  };

  // Refs for dropdowns
  const dropdownRefs = {
    categories: useRef<HTMLDivElement>(null),
    priceRange: useRef<HTMLDivElement>(null),
    sizes: useRef<HTMLDivElement>(null),
    stock: useRef<HTMLDivElement>(null),
    promotions: useRef<HTMLDivElement>(null),
    colors: useRef<HTMLDivElement>(null),
    fabrics: useRef<HTMLDivElement>(null),
  };

  // Create a ref to track the current state of dropdowns
  const dropdownState = useRef({
    showCategories,
    showPriceRange,
    showSizes,
    showStock,
    showPromotions,
    showFabrics
  });

  // Update ref when state changes
  useEffect(() => {
    dropdownState.current = {
      showCategories,
      showPriceRange,
      showSizes,
      showStock,
      showPromotions,
      showFabrics
    };
  }, [
    showCategories,
    showPriceRange,
    showSizes,
    showStock,
    showPromotions,
    showFabrics
  ]);

  const closeAllDropdowns = useCallback(() => {
    setShowCategories(false);
    setShowPriceRange(false);
    setShowSizes(false);
    setShowStock(false);
    setShowPromotions(false);
    setShowFabrics(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If any dropdown is open
      const isAnyDropdownOpen = Object.values(dropdownState.current).some(Boolean);
      
      if (!isAnyDropdownOpen) return;

      // Check if click is outside all dropdown refs
      const isOutsideAllDropdowns = Object.values(dropdownRefs).every(ref => 
        ref.current && !ref.current.contains(event.target as Node)
      );

      if (isOutsideAllDropdowns) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeAllDropdowns]);

  const handleResetFilters = () => {
    props.setSelectedCategories([]);
    props.setSelectedSizes([]);
    props.setSelectedAvailability([]);
    props.setSelectedPromotions([]);
    props.setSelectedColors([]);
    props.setSelectedFabrics([]);
    // Reset price range to full range
    props.setPriceRange([props.priceRangeLimits[0], props.priceRangeLimits[1]]);
    // Reset rating range to full range
    props.setRatingRange([0, 5]);
    props.setSelectedBrands([]);
    props.setSearchQuery('');
  };

  // Create a ref for the categories dropdown
  const categoriesRef = useRef<HTMLDivElement>(null);
  
  // Add click-away handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setShowCategories(false);
      }
    };
    
    // Add event listener when dropdown is open
    if (showCategories) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategories]);

  return (
    <div className={cn(
      "flex flex-col gap-4 relative",
      "max-w-[750px]",
      className
    )}>
      <div className={cn(
        "w-[750px]",
        "p-4",
        "bg-card",
        "border border-border",
        "rounded-2xl shadow-sm backdrop-blur-xl",
        "relative z-[9999]"
      )}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {/* Combined Search Bar */}
            <div className="w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={props.searchQuery}
                  onChange={(e) => props.setSearchQuery(e.target.value)}
                  placeholder="Search by ID or product name..."
                  className={cn(
                    "w-full pl-10 pr-4 py-2",
                    "bg-background",
                    "border border-input",
                    "rounded-xl",
                    "text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2",
                    "focus:ring-ring"
                  )}
                />
              </div>
            </div>

            <div className="w-[130px] relative" ref={categoriesRef}>
              <button
                onClick={() => {
                  closeAllDropdowns();
                  setShowCategories(!showCategories);
                }}
                className={cn(
                  "flex items-center justify-between w-full",
                  "px-3 py-2 rounded-lg",
                  "bg-background",
                  "border border-input",
                  "text-sm text-foreground",
                  "hover:bg-accent hover:text-accent-foreground",
                  "transition-colors duration-200"
                )}
              >
                <span>Categories</span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  showCategories && "transform rotate-180"
                )} />
              </button>
              {showCategories && (
                <div className={cn(
                  "absolute left-0 top-full mt-1",
                  "w-[500px]",
                  "bg-card",
                  "border border-border",
                  "rounded-lg shadow-lg",
                  "z-[9999]",
                  "fixed-dropdown"
                )}>
                  <div className="p-2 max-h-[400px] overflow-y-auto">
                    {CATEGORIES.map((category) => (
                      <div key={category.id} className="space-y-1">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          disabled={!isCategoryAvailable(category.id, props.selectedBrands)}
                          className={cn(
                            "group flex items-center justify-between w-full",
                            "px-2 py-1.5 rounded-md",
                            "text-sm",
                            "transition-colors duration-200",
                            !isCategoryAvailable(category.id, props.selectedBrands) && "opacity-50 cursor-not-allowed",
                            isCategoryAvailable(category.id, props.selectedBrands) && "hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-4 h-4 rounded",
                              "flex items-center justify-center",
                              "border-2 transition-colors",
                              (props.selectedCategories.includes(category.id) || areAllSubcategoriesSelected(category.id))
                                ? "border-primary bg-primary"
                                : "border-zinc-400 dark:border-zinc-600",
                              "group-hover:border-primary"
                            )}>
                              <Check className={cn(
                                "w-3 h-3",
                                (props.selectedCategories.includes(category.id) || areAllSubcategoriesSelected(category.id))
                                  ? "text-primary-foreground"
                                  : "text-transparent",
                                "group-hover:text-primary"
                              )} />
                            </div>
                            <span className={cn(
                              (props.selectedCategories.includes(category.id) || areAllSubcategoriesSelected(category.id))
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}>
                              {category.name}
                            </span>
                          </div>

                          {/* Main category badges */}
                          <div className="flex gap-1">
                            {props.selectedBrands
                              .filter(brandId => isCategoryAvailable(category.id, [brandId]))
                              .map(brandId => (
                                <span
                                  key={brandId}
                                  className={cn(
                                    "px-1.5 py-0.5 text-xs rounded-full",
                                    getBrandBadgeStyle(brandId)
                                  )}
                                >
                                  {BRANDS.find(b => b.id === brandId)?.name}
                                </span>
                              ))}
                          </div>
                        </button>

                        {/* Subcategories */}
                        <div className="ml-6 space-y-1">
                          {category.subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => toggleCategory(sub.id)}
                              disabled={!isCategoryAvailable(sub.id, props.selectedBrands)}
                              className={cn(
                                "group flex items-center justify-between w-full",
                                "px-2 py-1.5 rounded-md",
                                "text-sm",
                                "transition-colors duration-200",
                                !isCategoryAvailable(sub.id, props.selectedBrands) && "opacity-50 cursor-not-allowed",
                                isCategoryAvailable(sub.id, props.selectedBrands) && "hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-4 h-4 rounded",
                                  "flex items-center justify-center",
                                  "border-2 transition-colors",
                                  props.selectedCategories.includes(sub.id)
                                    ? "border-primary bg-primary"
                                    : "border-zinc-400 dark:border-zinc-600",
                                  "group-hover:border-primary"
                                )}>
                                  <Check className={cn(
                                    "w-3 h-3",
                                    props.selectedCategories.includes(sub.id)
                                      ? "text-primary-foreground"
                                      : "text-transparent",
                                    "group-hover:text-primary"
                                  )} />
                                </div>
                                <span className={cn(
                                  props.selectedCategories.includes(sub.id)
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}>
                                  {sub.name}
                                </span>
                              </div>

                              {/* Subcategory badges */}
                              <div className="flex gap-1">
                                {props.selectedBrands
                                  .filter(brandId => isCategoryAvailable(sub.id, [brandId]))
                                  .map(brandId => (
                                    <span
                                      key={brandId}
                                      className={cn(
                                        "px-1.5 py-0.5 text-xs rounded-full",
                                        getBrandBadgeStyle(brandId)
                                      )}
                                    >
                                      {BRANDS.find(b => b.id === brandId)?.name}
                                    </span>
                                  ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sizes */}
            <div className="w-[110px] relative">
              <FilterDropdown
                label="Sizes"
                options={Object.entries(SIZE_FILTER_OPTIONS).map(([group, options]) => ({
                  group,
                  options: options.map(opt => ({
                    id: opt.value,
                    name: opt.label
                  }))
                }))}
                selectedValues={props.selectedSizes}
                onChange={props.setSelectedSizes}
                width="w-[110px]"
                menuWidth="w-[280px]"
                grouped={true}
              />
            </div>

            {/* Colors */}
            <div className="w-[120px] relative" ref={dropdownRefs.colors}>
              <FilterDropdown
                label="Colors"
                options={Array.from(COLORS)}
                selectedValues={props.selectedColors}
                onChange={(values) => {
                  props.setSelectedColors(values);
                }}
                width="w-[120px]"
                menuWidth="w-[180px]"
              />
            </div>

            <div className="w-[120px] relative" ref={dropdownRefs.stock}>
              <FilterDropdown
                label="Availability"
                options={Array.from(STOCK_STATUS)}
                selectedValues={props.selectedAvailability}
                onChange={(values) => {
                  props.setSelectedAvailability(values);
                }}
                width="w-[120px]"
                menuWidth="w-[180px]"
              />
            </div>
          </div>

          {/* Second row of filters */}
          <div className="flex items-center gap-2">
            {/* Promotions */}
            <div className="w-[140px] relative" ref={dropdownRefs.promotions}>
              <FilterDropdown
                label="Promotions"
                options={Array.from(PROMOTIONS)}
                selectedValues={props.selectedPromotions}
                onChange={(values) => {
                  props.setSelectedPromotions(values);
                }}
                width="w-[140px]"
                menuWidth="w-[160px]" 
              />
            </div>

            {/* Fabrics */}
            <div className="w-[140px] relative" ref={dropdownRefs.fabrics}>
              <FilterDropdown
                label="Fabric"
                options={Object.entries(FABRIC_FILTER_OPTIONS).map(([group, options]) => ({
                  group,
                  options: options.map(opt => ({
                    id: opt.value,
                    name: opt.label
                  }))
                }))}
                selectedValues={props.selectedFabrics}
                onChange={(values) => props.setSelectedFabrics(values as FabricMaterial[])}
                grouped={true}
              />
            </div>

            {/* Add the sliders here, right after the fabrics dropdown */}
            <div className="flex items-center gap-0 ml-2">
              {/* Price Range Slider */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm whitespace-nowrap text-right",
                  "min-w-[90px] mr-2",
                  props.isLoading ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-400"
                )}>
                  ฿{props.priceRange[0].toFixed(0)} - ฿{props.priceRange[1].toFixed(0)}
                </span>
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-[100px] h-5"
                  value={props.priceRange}
                  min={props.priceRangeLimits[0]}
                  max={props.priceRangeLimits[1]}
                  step={10}
                  disabled={props.isLoading}
                  onValueChange={(value) => props.setPriceRange(value as [number, number])}
                >
                  <Slider.Track className={cn(
                    "relative grow rounded-full h-[3px]",
                    props.isLoading ? "bg-muted" : "bg-muted dark:bg-muted"
                  )}>
                    <Slider.Range className={cn(
                      "absolute rounded-full h-full",
                      props.isLoading ? "bg-muted" : "bg-primary"
                    )} />
                  </Slider.Track>
                  <Slider.Thumb
                    className={cn(
                      "block w-5 h-5 shadow-lg rounded-full",
                      "border-2 transition-colors duration-200",
                      props.isLoading 
                        ? "bg-muted border-input cursor-not-allowed"
                        : "bg-background border-input hover:border-ring hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                    aria-label="Price minimum"
                  />
                  <Slider.Thumb
                    className={cn(
                      "block w-5 h-5 shadow-lg rounded-full",
                      "border-2 transition-colors duration-200",
                      props.isLoading 
                        ? "bg-muted border-input cursor-not-allowed"
                        : "bg-background border-input hover:border-ring hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                    aria-label="Price maximum"
                  />
                </Slider.Root>
              </div>

              {/* Rating Slider */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm whitespace-nowrap min-w-[70px] text-right",
                  props.isLoading ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-400"
                )}>
                  {props.ratingRange[0]} - {props.ratingRange[1]} ★
                </span>
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-[120px] h-5"
                  value={props.ratingRange}
                  min={0}
                  max={5}
                  step={0.5}
                  disabled={props.isLoading}
                  onValueChange={(value) => props.setRatingRange(value as [number, number])}
                >
                  <Slider.Track className={cn(
                    "relative grow rounded-full h-[3px]",
                    props.isLoading ? "bg-muted" : "bg-muted dark:bg-muted"
                  )}>
                    <Slider.Range className={cn(
                      "absolute rounded-full h-full",
                      props.isLoading ? "bg-muted" : "bg-primary"
                    )} />
                  </Slider.Track>
                  <Slider.Thumb
                    className={cn(
                      "block w-5 h-5 shadow-lg rounded-full",
                      "border-2 transition-colors duration-200",
                      props.isLoading 
                        ? "bg-muted border-input cursor-not-allowed"
                        : "bg-background border-input hover:border-ring hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                    aria-label="Rating minimum"
                  />
                  <Slider.Thumb
                    className={cn(
                      "block w-5 h-5 shadow-lg rounded-full",
                      "border-2 transition-colors duration-200",
                      props.isLoading 
                        ? "bg-muted border-input cursor-not-allowed"
                        : "bg-background border-input hover:border-ring hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                    aria-label="Rating maximum"
                  />
                </Slider.Root>
              </div>
            </div>
          </div>

          {/* Third row with brands and reset button */}
          <div className="flex items-center justify-end">
            {/* Reset Filters button */}
            <button
              onClick={handleResetFilters}
              className={cn(
                "px-4 py-2",
                "bg-primary hover:bg-primary/90",
                "text-primary-foreground",
                "text-sm font-medium",
                "rounded-lg",
                "transition-colors duration-200",
                "flex items-center gap-2"
              )}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Selected Filters Display */}
      <SelectedFilters
        selectedBrands={props.selectedBrands}
        selectedCategories={props.selectedCategories}
        selectedSizes={props.selectedSizes}
        selectedColors={props.selectedColors}
        selectedAvailability={props.selectedAvailability}
        selectedPromotions={props.selectedPromotions}
        selectedFabrics={props.selectedFabrics}
        onRemoveBrand={props.onRemoveBrand}
        onRemoveCategory={props.onRemoveCategory}
        onRemoveSize={(size) => props.setSelectedSizes(prev => prev.filter(s => s !== size))}
        onRemoveColor={props.onRemoveColor}
        onRemoveAvailability={(status) => props.setSelectedAvailability(prev => prev.filter(s => s !== status))}
        onRemovePromotion={(promo) => props.setSelectedPromotions(prev => prev.filter(p => p !== promo))}
        onRemoveFabric={(fabric) => props.setSelectedFabrics(prev => prev.filter(f => f !== fabric))}
      />
    </div>
  )
}