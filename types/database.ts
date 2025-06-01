export interface Product {
  id?: string;
  productId: string
  name: string
  images: {
    main: string
    additional: string[]
  }
  features: string[]
  details: string
  materials: {
    fabric: string
    functionDetails: string
    washingInstructions: string
    additionalNotes: string
  }
  colors: string[]
  sizes: string[]
  price: {
    original: number
    discounted: number
    discountPercentage: number
    currency: string
  }
  store: {
    name: string
    region: string
  }
  category: string
  productType: string
  promotions: {
    current: string
    historical: string[]
  }
  stockStatus: string
  rating: number
  reviewCount: number
  url: string
  description?: string
}

export interface FilterState {
  priceRange: [number, number]  // [min, max]
  minRating: number
  sortBy: string
  category?: string
  store?: string
  stockStatus?: string
  hasDiscount?: boolean
  sizeCategories?: string[]  // Add this for the new size categorization
}

export interface Stats {
  totalProducts: number
  averagePrice: string
  searchResults: number
  lowestPrice: string
  highestPrice: string
  uniqueStores: number
  averageDiscount: string
  activePromotions: number
}

export interface FilterOption {
    id: string
    name: string
  }
  
  export const BRANDS: FilterOption[] = [
    { id: "zara", name: "Zara" },
    { id: "hm", name: "H&M" },
    { id: "uniqlo", name: "Uniqlo" },
    { id: "nike", name: "Nike" },
    { id: "adidas", name: "Adidas" }
  ]
  
  export const CATEGORIES = [
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
  
  export const SIZE_GROUPS: FilterOption[] = [
    { id: "xs", name: "XS" },
    { id: "s", name: "S" },
    { id: "m", name: "M" },
    { id: "l", name: "L" },
    { id: "xl", name: "XL" },
    { id: "xxl", name: "XXL" }
  ]
  
  export const COLORS = [
    { id: 'black/grey', name: 'Black/Grey' },
    { id: 'white/cream', name: 'White/Cream' },
    { id: 'red/pink', name: 'Red/Pink' },
    { id: 'blue', name: 'Blue' },
    { id: 'green', name: 'Green' },
    { id: 'yellow/gold', name: 'Yellow/Gold' },
    { id: 'orange', name: 'Orange' },
    { id: 'purple/lavender', name: 'Purple/Lavender' },
    { id: 'brown/beige/tan', name: 'Brown/Beige/Tan' },
    { id: 'other', name: 'Other' }
  ];
  
  export const STOCK_STATUS: FilterOption[] = [
    { id: "in-stock", name: "In Stock" },
    { id: "low-stock", name: "Low Stock" }
  ]
  
  export const PROMOTIONS: FilterOption[] = [
    { id: "available-soon", name: "Available Soon" },
    { id: "discount", name: "Discount" },
    { id: "new", name: "New" },
    { id: "no-promotions", name: "No Promotions" }
  ]
  
  export const FABRICS: FilterOption[] = [
    { id: "cotton", name: "Cotton" },
    { id: "polyester", name: "Polyester" },
    { id: "wool", name: "Wool" },
    { id: "linen", name: "Linen" },
    { id: "denim", name: "Denim" }
  ]

  export interface Filters {
    searchQuery: string
    selectedBrands: string[]
    selectedCategories: string[]
    selectedSizes: string[]
    selectedColors: string[]
    selectedAvailability: string[]
    selectedPromotions: string[]
    selectedFabrics: string[]
    priceRange: [number, number]
    ratingRange: [number, number]
  }

  // Add the size filter options type
  export interface SizeFilterOption {
    value: string
    label: string
  }

  export interface SizeFilterGroup {
    [key: string]: SizeFilterOption[]
  }

  // Export the size filter options
  export const SIZE_FILTER_OPTIONS: SizeFilterGroup = {
    "Children's Sizes": [
      { value: "children-age", label: "Age Based (e.g., 4-5A, 6-7A)" },
      { value: "children-years", label: "Years Based (e.g., 4-5Y, 6-7Y)" },
      { value: "children-height", label: "Height Based (e.g., 116cm, 128cm)" }
    ],
    "Standard Sizes": [
      { value: "standard-letter", label: "Regular (XXS-4XL)" },
      { value: "standard-combined", label: "Combined (e.g., S-M, M-L)" },
      { value: "standard-petite", label: "Petite (e.g., S/P, M/P)" },
      { value: "standard-tall", label: "Tall (e.g., S/T, M/T)" },
      { value: "standard-short", label: "Short (e.g., S/S, M/S)" }
    ],
    "Numeric Sizes": [
      { value: "numeric-waist", label: "Waist Size (e.g., 28, 30, 32)" },
      { value: "numeric-waist-length", label: "Waist/Length (e.g., 30/32, 32/34)" },
      { value: "numeric-waist-modified", label: "Modified (e.g., 32P, 34L)" },
      { value: "numeric-inches", label: "Inches (e.g., 21inch, 22inch)" }
    ],
    "International Sizes": [
      { value: "international-eu-us", label: "EU/US (e.g., EU 36/US 27)" },
      { value: "international-cm", label: "Centimeters (e.g., 58cm, 61cm)" }
    ],
    "Other": [
      { value: "other", label: "Uncategorized Sizes" }
    ]
  };

  // Define the fabric filter types
  export type FabricMaterial = 
    | "cotton" 
    | "linen" 
    | "wool" 
    | "silk" 
    | "viscose" 
    | "lyocell" 
    | "modal"
    | "polyester"
    | "polyamide"
    | "elastane"
    | "acrylic"
    | "polystyrene"
    | "polyurethane"
    | "other";

  export type FabricFilterGroup = Record<string, { value: FabricMaterial, label: string }[]>;

  // Export the fabric filter options
  export const FABRIC_FILTER_OPTIONS: FabricFilterGroup = {
    "Natural Fibers": [
      { value: "cotton", label: "Cotton" },
      { value: "linen", label: "Linen" },
      { value: "wool", label: "Wool & Animal Fibers" },
      { value: "silk", label: "Silk" },
      { value: "viscose", label: "Viscose/Rayon" },
      { value: "lyocell", label: "Lyocell" },
      { value: "modal", label: "Modal" }
    ],
    "Synthetic Fibers": [
      { value: "polyester", label: "Polyester" },
      { value: "polyamide", label: "Polyamide (Nylon)" },
      { value: "elastane", label: "Elastane (Spandex)" },
      { value: "acrylic", label: "Acrylic" },
      { value: "polystyrene", label: "Polystyrene" },
      { value: "polyurethane", label: "Polyurethane" }
    ],
    "Other": [
      { value: "other", label: "Other Materials" }
    ]
  };

  // Update getPrimaryMaterialCategory to handle "other"
  function getPrimaryMaterialCategory(fabric: string): string[] {
    const categories: string[] = [];
    let matched = false;
    
    Object.entries(FABRIC_CATEGORIES).forEach(([categoryKey, category]) => {
      Object.entries(category.materials).forEach(([materialKey, variants]) => {
        if (containsMaterial(fabric, variants)) {
          categories.push(materialKey);
          matched = true;
        }
      });
    });

    if (!matched) {
      categories.push("other");
    }

    return categories;
  }

  export const FABRIC_CATEGORIES = {
    natural: {
      label: "Natural Fibers",
      materials: {
        cotton: ["cotton"],
        linen: ["linen"],
        wool: ["wool", "yak", "goat", "cow"],
        silk: ["silk", "mulberrysilk"],
        viscose: ["viscose", "rayon"],
        lyocell: ["lyocell"],
        modal: ["modal"]
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
        polyurethane: ["polyurethane"]
      }
    }
  };

  function containsMaterial(fabric: string, variants: string[]): boolean {
    const lowerFabric = fabric.toLowerCase();
    return variants.some(variant => lowerFabric.includes(variant.toLowerCase()));
  }