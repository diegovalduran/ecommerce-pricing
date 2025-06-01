import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { BRANDS, CATEGORIES, COLORS, STOCK_STATUS, PROMOTIONS } from "@/types/database"
import { SIZE_FILTER_OPTIONS } from "@/types/database"
import { FABRIC_FILTER_OPTIONS } from "@/types/database"

interface SelectedFiltersProps {
  selectedBrands: string[]
  selectedCategories: string[]
  selectedSizes: string[]
  selectedColors: string[]
  selectedAvailability: string[]
  selectedPromotions: string[]
  selectedFabrics: string[]
  onRemoveBrand: (brandId: string) => void
  onRemoveCategory: (categoryId: string) => void
  onRemoveSize: (size: string) => void
  onRemoveColor: (color: string) => void
  onRemoveAvailability: (status: string) => void
  onRemovePromotion: (promo: string) => void
  onRemoveFabric: (fabric: string) => void
  className?: string
}

export function SelectedFilters({
  selectedBrands,
  selectedCategories,
  selectedSizes,
  selectedColors,
  selectedAvailability,
  selectedPromotions,
  selectedFabrics,
  onRemoveBrand,
  onRemoveCategory,
  onRemoveSize,
  onRemoveColor,
  onRemoveAvailability,
  onRemovePromotion,
  onRemoveFabric,
  className
}: SelectedFiltersProps) {

  // Helper function to get parent category name and subcategory
  const getCategoryInfo = (categoryId: string) => {
    for (const category of CATEGORIES) {
      // Check if it's a parent category
      if (category.id === categoryId) {
        return {
          parentId: category.id,
          parentName: category.name,
          subcategoryName: null
        };
      }
      
      // Check subcategories
      for (const subcategory of category.subcategories) {
        if (subcategory.id === categoryId) {
          return {
            parentId: category.id,
            parentName: category.name,
            subcategoryName: subcategory.name
          };
        }
      }
    }
    
    return null;
  };

  // Group selected categories by parent
  const groupedCategories = selectedCategories.reduce((acc, categoryId) => {
    const info = getCategoryInfo(categoryId);
    if (!info) return acc;
    
    if (!acc[info.parentId]) {
      acc[info.parentId] = {
        parentName: info.parentName,
        subcategories: []
      };
    }
    
    // Only add subcategory if it's not the parent itself
    if (info.subcategoryName) {
      acc[info.parentId].subcategories.push({
        id: categoryId,
        name: info.subcategoryName
      });
    }
    
    return acc;
  }, {} as Record<string, { parentName: string, subcategories: { id: string, name: string }[] }>);

  // Check if all subcategories of a parent are selected
  const isAllSubcategoriesSelected = (parentId: string) => {
    const parent = CATEGORIES.find(c => c.id === parentId);
    if (!parent) return false;
    
    const selectedSubcategoryIds = selectedCategories
      .filter(id => id.startsWith(`${parentId}-`))
      .map(id => id);
    
    return parent.subcategories.length === selectedSubcategoryIds.length;
  };

  // Check if any filters are selected
  const hasFilters = selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    selectedAvailability.length > 0 ||
    selectedPromotions.length > 0 ||
    selectedFabrics.length > 0;

  return (
    <div className={cn(
      "w-full px-4 py-4 rounded-xl",
      "bg-card",
      "border border-border",
      className
    )}>
      {!hasFilters ? (
        <div className="flex items-center justify-center h-12">
          <span className="text-sm text-muted-foreground">
            No Filters Selected
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {/* Brand Tags */}
          {selectedBrands.map(brandId => {
            const brand = BRANDS.find(b => b.id === brandId);
            if (!brand) return null;
            return (
              <button
                key={brandId}
                onClick={() => onRemoveBrand(brandId)}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1 rounded-lg",
                  "bg-background",
                  "border border-input",
                  "text-sm text-foreground",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>Brand: {brand.name}</span>
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            );
          })}

          {/* Category Tags */}
          {Object.entries(groupedCategories).map(([parentId, { parentName, subcategories }]) => {
            // If parent category is directly selected or all subcategories are selected
            if (selectedCategories.includes(parentId) || isAllSubcategoriesSelected(parentId)) {
              return (
                <button
                  key={parentId}
                  onClick={() => {
                    // Remove parent and all subcategories
                    onRemoveCategory(parentId);
                    subcategories.forEach(sub => onRemoveCategory(sub.id));
                  }}
                  className={cn(
                    "group flex items-center gap-1 px-2 py-1 rounded-lg",
                    "bg-background",
                    "border border-input",
                    "text-sm text-foreground",
                    "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span>Category: {parentName}</span>
                  <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                </button>
              );
            }
            
            // Otherwise show individual subcategories
            return subcategories.map(sub => (
              <button
                key={sub.id}
                onClick={() => onRemoveCategory(sub.id)}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1 rounded-lg",
                  "bg-background",
                  "border border-input",
                  "text-sm text-foreground",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>Category: {parentName} - {sub.name}</span>
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            ));
          })}

          {/* Size Tags */}
          {selectedSizes.map(sizeId => {
            const size = Object.values(SIZE_FILTER_OPTIONS)
              .flat()
              .find(s => s.value === sizeId);
            if (!size) return null;
            return (
              <button
                key={sizeId}
                onClick={() => onRemoveSize(sizeId)}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1 rounded-lg",
                  "bg-background",
                  "border border-input",
                  "text-sm text-foreground",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>Size: {size.label}</span>
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            );
          })}

          {/* Color Tags */}
          {selectedColors.map(colorId => {
            const color = COLORS.find(c => c.id === colorId);
            if (!color) return null;
            return (
              <button
                key={colorId}
                onClick={() => onRemoveColor(colorId)}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1 rounded-lg",
                  "bg-background",
                  "border border-input",
                  "text-sm text-foreground",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>Color: {color.name}</span>
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            );
          })}

          {/* Availability Tags */}
          {selectedAvailability.map(statusId => {
            const status = STOCK_STATUS.find(s => s.id === statusId);
            if (!status) return null;
            return (
              <button
                key={statusId}
                onClick={() => onRemoveAvailability(statusId)}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1 rounded-lg",
                  "bg-background",
                  "border border-input",
                  "text-sm text-foreground",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>Availability: {status.name}</span>
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            );
          })}

          {/* Promotion Tags */}
          {selectedPromotions.map(promoId => {
            const promo = PROMOTIONS.find(p => p.id === promoId);
            if (!promo) return null;
            return (
              <button
                key={promoId}
                onClick={() => onRemovePromotion(promoId)}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1 rounded-lg",
                  "bg-background",
                  "border border-input",
                  "text-sm text-foreground",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>Promotion: {promo.name}</span>
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            );
          })}

          {/* Fabric Tags */}
          {selectedFabrics.map(fabricId => {
            const fabric = Object.values(FABRIC_FILTER_OPTIONS)
              .flat()
              .find(f => f.value === fabricId);
            if (!fabric) return null;
            return (
              <button
                key={fabricId}
                onClick={() => onRemoveFabric(fabricId)}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1 rounded-lg",
                  "bg-background",
                  "border border-input",
                  "text-sm text-foreground",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>Fabric: {fabric.label}</span>
                <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}