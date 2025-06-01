import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

interface FilterOption {
  readonly id: string;
  readonly name: string;
}

interface FilterGroup {
  group: string;
  options: FilterOption[];
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[] | FilterGroup[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  width?: string;
  menuWidth?: string;
  disabled?: (id: string) => boolean;
  getBadgeStyle?: (id: string) => string;
  showBadges?: boolean;
  badgeData?: string[];
  grouped?: boolean;
}

// Define the main fabric categories and their variations
const FABRIC_CATEGORIES = {
  natural: {
    label: "Natural Fibers",
    materials: {
      cotton: ["cotton"],
      linen: ["linen"],
      wool: ["wool", "yak", "goat", "cow"],
      silk: ["silk", "mulberrysilk"],
      viscose: ["viscose", "rayon"],
      lyocell: ["lyocell"],
      modal: ["modal"],
    }
  },
  synthetic: {
    label: "Synthetic Fibers",
    materials: {
      polyester: ["polyester"],
      polyamide: ["polyamide", "nylon"],
      elastane: ["elastane", "spandex"],
      acrylic: ["acrylic"],
      polystyrene: ["polystyrene"],
      polyurethane: ["polyurethane"],
    }
  }
};

// Helper function to check if a fabric contains a material
function containsMaterial(fabric: string, materialVariants: string[]): boolean {
  const fabricLower = fabric.toLowerCase();
  return materialVariants.some(variant => 
    fabricLower.includes(variant.toLowerCase()) &&
    // Ensure we're matching whole words or percentages
    (fabricLower.includes(`${variant.toLowerCase()} `) || 
     fabricLower.includes(`${variant.toLowerCase()}%`) ||
     fabricLower.includes(`${variant.toLowerCase()},`))
  );
}

// Function to determine the primary material category
function getPrimaryMaterialCategory(fabric: string): string[] {
  const categories: string[] = [];
  
  // Check each category and its materials
  Object.entries(FABRIC_CATEGORIES).forEach(([categoryKey, category]) => {
    Object.entries(category.materials).forEach(([materialKey, variants]) => {
      if (containsMaterial(fabric, variants)) {
        categories.push(materialKey);
      }
    });
  });

  return categories;
}

// Filter function for fabrics
function filterFabrics(fabrics: string[], selectedMaterials: string[]): string[] {
  if (selectedMaterials.length === 0) return fabrics;
  
  return fabrics.filter(fabric => {
    const fabricCategories = getPrimaryMaterialCategory(fabric);
    return selectedMaterials.some(material => fabricCategories.includes(material));
  });
}

export function FilterDropdown({
  label,
  options,
  selectedValues,
  onChange,
  width = "w-[120px]",
  menuWidth = "w-[180px]",
  disabled,
  getBadgeStyle,
  showBadges = false,
  badgeData = [],
  grouped = false
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionToggle = (optionId: string) => {
    const newSelected = selectedValues.includes(optionId)
      ? selectedValues.filter(id => id !== optionId)
      : [...selectedValues, optionId];
    
    onChange(newSelected);
  };

  return (
    <div className={cn("relative", width)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
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
        <span>{label}</span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform duration-200",
          isOpen && "transform rotate-180"
        )} />
      </button>
      
      {isOpen && (
        <div className={cn(
          "absolute left-0 top-full mt-1",
          menuWidth,
          "bg-card",
          "border border-border",
          "rounded-lg shadow-lg",
          "z-[9999]"
        )}>
          <div className="p-2 max-h-[400px] overflow-y-auto">
            {grouped ? (
              (options as FilterGroup[]).map((group) => (
                <div key={group.group} className="mb-3 last:mb-1">
                  <div className={cn(
                    "px-2 py-1.5 mb-1",
                    "text-sm font-semibold",
                    "text-foreground",
                    "border-b border-border",
                    "sticky top-0 bg-card/95 backdrop-blur-sm"
                  )}>
                    {group.group}
                  </div>
                  {group.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionToggle(option.id)}
                      className={cn(
                        "group flex items-center justify-between w-full",
                        "px-2 py-1.5 rounded-md",
                        "text-sm",
                        "transition-colors duration-200",
                        disabled && disabled(option.id) && "opacity-50 cursor-not-allowed",
                        !disabled?.call(null, option.id) && "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded",
                          "flex items-center justify-center",
                          "border-2 transition-colors",
                          selectedValues.includes(option.id)
                            ? "border-primary bg-primary"
                            : "border-zinc-400 dark:border-zinc-600",
                          "group-hover:border-primary"
                        )}>
                          <Check className={cn(
                            "w-3 h-3",
                            selectedValues.includes(option.id)
                              ? "text-primary-foreground"
                              : "text-transparent",
                            "group-hover:text-primary"
                          )} />
                        </div>
                        <span className={cn(
                          selectedValues.includes(option.id)
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}>
                          {option.name}
                        </span>
                      </div>

                      {showBadges && getBadgeStyle && (
                        <div className="flex gap-1">
                          {badgeData
                            .filter(id => getBadgeStyle(id))
                            .map(id => (
                              <span
                                key={id}
                                className={cn(
                                  "px-1.5 py-0.5 text-xs rounded-full",
                                  getBadgeStyle(id)
                                )}
                              >
                                {(options as FilterOption[]).find(o => o.id === id)?.name || 
                                 (options as FilterGroup[]).flatMap(g => g.options).find(o => o.id === id)?.name}
                              </span>
                            ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              (options as FilterOption[]).map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionToggle(option.id)}
                  className={cn(
                    "group flex items-center justify-between w-full",
                    "px-2 py-1.5 rounded-md",
                    "text-sm",
                    "transition-colors duration-200",
                    disabled && disabled(option.id) && "opacity-50 cursor-not-allowed",
                    !disabled?.call(null, option.id) && "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-4 h-4 rounded",
                      "flex items-center justify-center",
                      "border-2 transition-colors",
                      selectedValues.includes(option.id)
                        ? "border-primary bg-primary"
                        : "border-zinc-400 dark:border-zinc-600",
                      "group-hover:border-primary"
                    )}>
                      <Check className={cn(
                        "w-3 h-3",
                        selectedValues.includes(option.id)
                          ? "text-primary-foreground"
                          : "text-transparent",
                        "group-hover:text-primary"
                      )} />
                    </div>
                    <span className={cn(
                      selectedValues.includes(option.id)
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}>
                      {option.name}
                    </span>
                  </div>

                  {showBadges && getBadgeStyle && (
                    <div className="flex gap-1">
                      {badgeData
                        .filter(id => getBadgeStyle(id))
                        .map(id => (
                          <span
                            key={id}
                            className={cn(
                              "px-1.5 py-0.5 text-xs rounded-full",
                              getBadgeStyle(id)
                            )}
                          >
                            {(options as FilterOption[]).find(o => o.id === id)?.name || 
                             (options as FilterGroup[]).flatMap(g => g.options).find(o => o.id === id)?.name}
                          </span>
                        ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}