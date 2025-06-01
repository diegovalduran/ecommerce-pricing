import { Product, Filters, FABRIC_CATEGORIES } from "@/types/database"
import { getProductSizeCategory } from "@/utils/size-categories"
import { TYPE_MAPPINGS } from "@/components/datahub/database-configurator"

const COLOR_CATEGORIES = {
  'black/grey': [
    'black', 'grey', 'gray', 'charcoal', 'anthracite',
    'dark grey', 'light grey', 'silver', 'steel',
  ],
  'white/cream': [
    'white', 'cream', 'ivory', 'natural white', 'off-white',
    'ecru', 'oyster-white',
  ],
  'red/pink': [
    'red', 'pink', 'rose', 'burgundy', 'maroon', 'coral', 'wine',
    'raspberry', 'cerise', 'fuchsia', 'magenta', 'bordeaux',
  ],
  'blue': [
    'blue', 'navy', 'navy blue', 'light blue', 'dark blue',
    'cornflower blue', 'sky blue', 'steel blue', 'ocean blue',
    'midnight blue', 'duck blue', 'petrol blue',
  ],
  'green': [
    'green', 'olive', 'sage', 'mint', 'forest green',
    'emerald green', 'bottle green', 'hunter green',
    'moss green', 'pistachio green', 'sea green',
  ],
  'yellow/gold': [
    'yellow', 'gold', 'mustard', 'lemon', 'straw',
    'butter', 'vanilla',
  ],
  'orange': [
    'orange', 'peach', 'rust', 'terracotta', 'coral',
    'apricot',
  ],
  'purple/lavender': [
    'purple', 'lavender', 'violet', 'mauve', 'plum',
    'aubergine', 'lilac',
  ],
  'brown/beige/tan': [
    'brown', 'beige', 'tan', 'khaki', 'camel', 'taupe',
    'mink', 'chocolate', 'coffee', 'toffee', 'tobacco',
    'caramel', 'biscuit', 'sand',
  ],
  'other': [] // Will catch anything not matching above categories
} as const;

// Map availability statuses to standardized categories - make these more explicit
const AVAILABILITY_MAPPING: Record<string, string[]> = {
  'in-stock': ['in stock', 'in Stock'],
  'low-stock': ['low stock', 'few pieces left', 'Few pieces left']
};

// Map promotion texts to standardized categories
const PROMOTION_MAPPING: Record<string, string[]> = {
  'available-soon': [
    'available mid-mar',
    'available mid-may',
    'available early apr',
    'available early jun',
    'available early mar',
    'available late apr',
    'available late feb',
    'available late mar',
    'available mid',
    'available early',
    'available late'
  ],
  'discount': [
    'limited offer',
    'limited store',
    'member price',
    'online discount',
    'online only',
    'online/member price',
    'price down',
    'limited'
  ],
  'new': [
    'new',
    'new color',
    'made with recycled materials'
  ],
  'no-promotions': [
    'no active promotions',
    'no current promotions',
    'no promotions',
    ''
  ]
};

// Helper function to determine a product's availability category
const getProductAvailabilityCategory = (product: Product): string => {
  if (!product.stockStatus) return 'in-stock'; // Default to in-stock if no status
  
  const stockStatus = product.stockStatus.toLowerCase().trim();
  
  // Check for low stock indicators first
  if (stockStatus.includes('few pieces') || 
      stockStatus.includes('low stock') || 
      stockStatus.includes('limited stock')) {
    return 'low-stock';
  }
  
  // Otherwise consider it in stock
  return 'in-stock';
};

// Helper function to determine a product's promotion categories
const getProductPromotionCategories = (product: Product): string[] => {
  const categories = new Set<string>();
  
  // Check current promotions
  if (product.promotions?.current) {
    const currentText = product.promotions.current.toLowerCase().trim();
    let matched = false;
    
    // Check for available-soon, discount, and new categories first
    if (PROMOTION_MAPPING['available-soon'].some(pattern => currentText.includes(pattern.toLowerCase()))) {
      categories.add('available-soon');
      matched = true;
    }
    if (PROMOTION_MAPPING['discount'].some(pattern => currentText.includes(pattern.toLowerCase()))) {
      categories.add('discount');
      matched = true;
    }
    if (PROMOTION_MAPPING['new'].some(pattern => currentText.includes(pattern.toLowerCase()))) {
      categories.add('new');
      matched = true;
    }
    
    // If no other category matched, it's "no-promotions"
    if (!matched) {
      categories.add('no-promotions');
    }
  } else {
    categories.add('no-promotions');
  }
  
  // Check historical promotions
  if (product.promotions?.historical) {
    product.promotions.historical.forEach(historicalText => {
      const text = historicalText.toLowerCase().trim();
      let matched = false;
      
      if (PROMOTION_MAPPING['available-soon'].some(pattern => text.includes(pattern.toLowerCase()))) {
        categories.add('available-soon');
        matched = true;
      }
      if (PROMOTION_MAPPING['discount'].some(pattern => text.includes(pattern.toLowerCase()))) {
        categories.add('discount');
        matched = true;
      }
      if (PROMOTION_MAPPING['new'].some(pattern => text.includes(pattern.toLowerCase()))) {
        categories.add('new');
        matched = true;
      }
    });
  }
  
  return Array.from(categories);
};

// Add debug logging to see unmatched fabrics
const getProductFabricCategories = (product: Product): string[] => {
  const fabric = product.materials?.fabric;
  if (!fabric) return ["other"];
  
  const categories = new Set<string>();
  let matched = false;
  
  Object.entries(FABRIC_CATEGORIES).forEach(([categoryKey, category]) => {
    Object.entries(category.materials).forEach(([materialKey, variants]) => {
      if (containsMaterial(fabric, variants)) {
        categories.add(materialKey);
        matched = true;
      }
    });
  });

  if (!matched) {
    categories.add("other");
  }

  return Array.from(categories);
};

const containsMaterial = (fabric: string, variants: string[]): boolean => {
  const lowerFabric = fabric.toLowerCase();
  return variants.some(variant => lowerFabric.includes(variant.toLowerCase()));
};

// Add debug logging for unmatched brands
const getProductBrandCategory = (product: Product): string => {
  const storeName = product.store?.name?.toLowerCase();
  if (!storeName) {
    return 'other';
  }
  
  // Handle special cases
  if (storeName.includes('h&m')) {
    return 'hm';
  }
  
  return storeName;
};

// Add this function to map product types to our category structure
export const mapProductTypeToCategory = (productType: string, productCategory?: string): string[] => {
  if (!productType) return ["other-unknown", "other"];
  
  const normalizedType = productType.toLowerCase().trim();
  const categories: string[] = [];
  
  // First determine if this is men's, women's or kids' product
  const gender = productCategory?.toLowerCase() || '';
  const isMens = gender.includes('men') && !gender.includes('women');
  const isWomens = gender.includes('women');
  const isKids = gender.includes('kid') || gender.includes('child');
  
  // Handle exact matches first
  if (normalizedType === 'bermudas') {
    if (isMens) categories.push('men-shorts');
    if (isKids) categories.push('kids-shorts');
    if (!isMens && !isKids) categories.push('men-shorts', 'kids-shorts');
    return addParentCategories(categories);
  }
  
  if (normalizedType === 'dress' || normalizedType === 'dresses' || 
      normalizedType === 'dresses and jumpsuits') {
    if (isWomens) categories.push('women-dresses');
    if (isKids) categories.push('kids-dresses');
    if (!isWomens && !isKids) categories.push('women-dresses');
    return addParentCategories(categories);
  }
  
  if (normalizedType === 'skirts') {
    if (isWomens) categories.push('women-skirts');
    if (isKids) categories.push('kids-skirts');
    if (!isWomens && !isKids) categories.push('women-skirts', 'kids-skirts');
    return addParentCategories(categories);
  }
  
  if (normalizedType === 'unknown') {
    categories.push('other-unknown');
    categories.push('other');
    return categories;
  }
  
  // Continue with partial matches
  if (normalizedType.includes('t_shirt') || normalizedType.includes('t-shirt') || normalizedType.includes('tshirt')) {
    if (isMens) categories.push('men-tshirts');
    if (isWomens) categories.push('women-tshirts');
    if (isKids) categories.push('kids-tops');
    if (!isMens && !isWomens && !isKids) categories.push('men-tshirts', 'women-tshirts', 'kids-tops');
  }
  
  else if (normalizedType.includes('shirt') || normalizedType.includes('polo')) {
    if (isMens) categories.push('men-shirts-polos');
    if (isWomens) categories.push('women-shirts');
    if (!isMens && !isWomens) categories.push('men-shirts-polos', 'women-shirts');
  }
  
  else if (normalizedType.includes('top')) {
    if (isMens) categories.push('men-tops');
    if (isWomens) categories.push('women-tops');
    if (isKids) categories.push('kids-tops');
    if (!isMens && !isWomens && !isKids) categories.push('men-tops', 'women-tops', 'kids-tops');
  }
  
  else if (normalizedType.includes('skirt')) {
    if (isWomens) categories.push('women-skirts');
    if (isKids) categories.push('kids-skirts');
    if (!isWomens && !isKids) categories.push('women-skirts', 'kids-skirts');
  }
  
  else if (normalizedType.includes('dress') || normalizedType.includes('jumpsuit')) {
    if (isWomens) categories.push('women-dresses');
    if (isKids) categories.push('kids-dresses');
    if (!isWomens && !isKids) categories.push('women-dresses');
  }
  
  else if (normalizedType.includes('short') || normalizedType.includes('bermuda')) {
    if (isMens) categories.push('men-shorts');
    if (isKids) categories.push('kids-shorts');
    if (!isMens && !isKids) categories.push('men-shorts', 'kids-shorts');
  }
  
  else if (normalizedType.includes('jean') || normalizedType.includes('denim')) {
    if (isMens) categories.push('men-jeans');
    if (isWomens) categories.push('women-jeans');
    if (!isMens && !isWomens) categories.push('men-jeans', 'women-jeans');
  }
  
  else if (normalizedType.includes('bottom') || normalizedType.includes('trouser') || normalizedType.includes('pant')) {
    if (isMens) categories.push('men-bottoms');
    if (isWomens) categories.push('women-bottoms');
    if (isKids) categories.push('kids-bottoms');
    if (!isMens && !isWomens && !isKids) categories.push('men-bottoms', 'women-bottoms', 'kids-bottoms');
  }
  
  // If no categories were found, categorize as unknown
  if (categories.length === 0) {
    categories.push('other-unknown');
    categories.push('other');
  }
  
  return addParentCategories(categories);
};

// Helper function to add parent categories
function addParentCategories(categories: string[]): string[] {
  if (categories.some(cat => cat.startsWith('men-'))) {
    categories.push('men');
  }
  if (categories.some(cat => cat.startsWith('women-'))) {
    categories.push('women');
  }
  if (categories.some(cat => cat.startsWith('kids-'))) {
    categories.push('kids');
  }
  return categories;
}

export const filterProducts = (products: Product[], filters: Filters) => {
  if (!products || !Array.isArray(products)) return [];

  try {
    let filtered = [...products];

    // Apply combined search filter (for both product ID and name)
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const searchTerms = filters.searchQuery.toLowerCase().trim().split(' ');
      filtered = filtered.filter(product => {
        const productName = product.name?.toLowerCase() || '';
        const productId = product.productId?.toLowerCase() || '';
        
        // Match if all search terms are found in either the product name or ID
        return searchTerms.every(term => 
          productName.includes(term) || productId.includes(term)
        );
      });
    }

    // Apply brand filter
    if (filters.selectedBrands && filters.selectedBrands.length > 0) {
      filtered = filtered.filter(product => {
        const brandCategory = getProductBrandCategory(product);
        if (brandCategory === 'other') {
        }
        return filters.selectedBrands.includes(brandCategory);
      });
    }

    // Apply category filter
    if (filters.selectedCategories && filters.selectedCategories.length > 0) {
      filtered = filtered.filter(product => {
        // Get potential categories for this product
        const productCategories = mapProductTypeToCategory(product.productType || '', product.category);
        
        // Check if any of the product's categories match any of the selected categories
        return filters.selectedCategories.some(selectedCategory => 
          productCategories.includes(selectedCategory)
        );
      });
    }

    // Apply size filter
    if (filters.selectedSizes && filters.selectedSizes.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.sizes || !Array.isArray(product.sizes)) {
          return false;
        }
        
        // Check if any of the product's sizes match any of the selected size categories
        return product.sizes.some(size => {
          const sizeCategories = getProductSizeCategory(size);
          return filters.selectedSizes.some(selectedSize => 
            sizeCategories.includes(selectedSize)
          );
        });
      });
    }

    // Apply color filtering
    if (filters.selectedColors && filters.selectedColors.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.colors || !Array.isArray(product.colors) || product.colors.length === 0) {
          return false;
        }
        return product.colors.some(productColor => {
          const colorLower = productColor.toLowerCase().trim();
          return filters.selectedColors.some(selectedCategory => {
            if (selectedCategory === 'other') {
              return !Object.entries(COLOR_CATEGORIES)
                .filter(([category]) => category !== 'other')
                .some(([_, variations]) => 
                  variations.some(variation => 
                    colorLower.includes(variation.toLowerCase())
                  )
                );
            }
            const categoryColors = COLOR_CATEGORIES[selectedCategory as keyof typeof COLOR_CATEGORIES];
            return categoryColors.some(categoryColor => 
              colorLower.includes(categoryColor.toLowerCase())
            );
          });
        });
      });
    }

    // Apply availability filtering
    if (filters.selectedAvailability && filters.selectedAvailability.length > 0) {
      filtered = filtered.filter(product => {
        const productCategory = getProductAvailabilityCategory(product);
        return filters.selectedAvailability.includes(productCategory);
      });
    }

    // Apply promotion filter
    if (filters.selectedPromotions && filters.selectedPromotions.length > 0) {
      const allPromotionTypes = ['available-soon', 'discount', 'new', 'no-promotions'];
      const hasAllPromotions = allPromotionTypes.every(type => 
        filters.selectedPromotions.includes(type)
      );

      if (!hasAllPromotions) {
        filtered = filtered.filter(product => {
          const productCategories = getProductPromotionCategories(product);
          const hasNoPromotions = filters.selectedPromotions.includes('no-promotions');
          const hasOtherCategories = filters.selectedPromotions.some(filter => filter !== 'no-promotions');
          
          return hasNoPromotions && hasOtherCategories
            ? productCategories.includes('no-promotions') || 
              filters.selectedPromotions.some(selected => 
                selected !== 'no-promotions' && productCategories.includes(selected)
              )
            : filters.selectedPromotions.some(selected => 
                productCategories.includes(selected)
              );
        });
      }
    }

    // Apply fabric filter
    if (filters.selectedFabrics && filters.selectedFabrics.length > 0) {
      filtered = filtered.filter(product => {
        const fabricCategories = getProductFabricCategories(product);
        return filters.selectedFabrics.some(selected => 
          fabricCategories.includes(selected)
        );
      });
    }

    // Apply rating filter, but only if not at default values
    if (filters.ratingRange && 
        (filters.ratingRange[0] > 0 || filters.ratingRange[1] < 5)) {
      filtered = filtered.filter(product => {
        const rating = product.rating;
        
        // If no rating and range starts at 0, include product
        if (!rating && filters.ratingRange[0] === 0) return true;
        
        // If has rating, check if within range
        if (rating) {
          return rating >= filters.ratingRange[0] && 
                 rating <= filters.ratingRange[1];
        }
        
        return false;
      });
    }

    // Apply price filter
    if (filters.priceRange && filters.priceRange.length === 2) {
      const [min, max] = filters.priceRange;
      const excludedProducts = products.filter(product => {
        const price = product.price?.discounted || product.price?.original;
        if (!price) {
          return true;
        }
        if (price < min || price > max) {
          return true;
        }
        return false;
      });
      
      filtered = filtered.filter(product => {
        const price = product.price?.discounted || product.price?.original;
        if (!price) return false;
        return price >= min && price <= max;
      });
    }

    return filtered;
  } catch (error) {
    console.error('Error in filterProducts:', error);
    return products;
  }
};