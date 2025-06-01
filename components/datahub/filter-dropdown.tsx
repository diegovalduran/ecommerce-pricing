import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

interface FilterOption {
  id: string;
  name: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  width?: string;
  disabled?: (id: string) => boolean;
  getBadgeStyle?: (id: string) => string;
  showBadges?: boolean;
  badgeData?: string[];
}

export function FilterDropdown({
  label,
  options,
  selectedValues,
  onChange,
  width = "w-[130px]",
  disabled,
  getBadgeStyle,
  showBadges = false,
  badgeData = []
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

  const toggleOption = (id: string) => {
    if (disabled && disabled(id)) return;
    
    onChange(
      selectedValues.includes(id)
        ? selectedValues.filter(v => v !== id)
        : [...selectedValues, id]
    );
  };

  return (
    <div className={cn(width, "relative")} ref={dropdownRef}>
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
          "w-[600px]",
          "bg-card",
          "border border-border",
          "rounded-lg shadow-lg",
          "z-[9999]"
        )}>
          <div className="p-2 w-full bg-background">
            {options.map((option) => (
              <button
                key={option.id}
                className={cn(
                  "group flex items-center justify-between w-full",
                  "px-2 py-1.5 rounded-md",
                  "text-sm",
                  "transition-colors duration-200",
                  disabled && disabled(option.id) && "opacity-50 cursor-not-allowed",
                  !disabled?.call(null, option.id) && "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => toggleOption(option.id)}
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
                          {options.find(o => o.id === id)?.name}
                        </span>
                      ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}