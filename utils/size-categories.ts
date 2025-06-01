export const SIZE_CATEGORIES = {
    children: {
      age: [
        // Age ranges with 'A' suffix
        '1½-2A', '2-3A', '2-4A', '3-4A', '4-5A', '4-6A', '5-6A', '6-7A', 
        '7-8A', '8-9A', '8-10A', '9-10A', '10-11A', '10-12A', '11-12A', 
        '12-13A', '12-14A', '13-14A', '14A+'
      ],
      years: [
        // Year ranges with 'Y' suffix
        '1½-2Y', '2-3Y', '2-4Y', '3-4Y', '4-5Y', '4-6Y', '5-6Y', '6-7Y',
        '7-8Y', '8-9Y', '8-10Y', '9-10Y', '10-11Y', '11-12Y', '12-13Y',
        '13-14Y', '14Y+'
      ],
      height: [
        // Sizes with height measurements
        '4-5Y(110cm)', '6-7Y(120cm)', '8-9Y(130cm)', '10-11Y(140cm)',
        '12-13Y(150cm)', '14Y(160cm)',
        '6 years (116 cm)', '7-8 years (128 cm)', '9-10 years (140 cm)',
        '11-12 years (152 cm)', '13-14 years (164 cm)'
      ]
    },
    standard: {
      letter: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
      combined: ['XS-S', 'S-M', 'M-L', 'L-XL', 'XL-XXL'],
      modified: {
        petite: ['XXS/P', 'XS/P', 'S/P', 'M/P', 'L/P', 'XL/P', 'XXL/P'],
        tall: ['XS/T', 'S/T', 'M/T', 'L/T', 'XL/T', 'XXL/T', '4XL/T'],
        short: ['XS/S', 'S/S', 'M/S', 'L/S', 'XL/S', 'XXL/S']
      }
    },
    numeric: {
      waist: {
        regular: ['28', '29', '30', '31', '32', '34', '36', '38', '40', '42', '44', '46', '48'],
        length: ['28/30', '28/32', '29/30', '29/32', '30/30', '30/32', '31/30', '31/32',
                 '32/30', '32/32', '33/30', '33/32', '34/30', '34/32', '36/30', '38/30', '40/30'],
        modified: ['28S', '29S', '30S', '31S', '32S', '33S', '32P', '34P', '36P', '38P',
                  '40P', '42P', '44P', '46P', '48P', '44L', '46L', '48L', '50L', '52L',
                  '54L', '56L', '58L']
      },
      inches: ['21inch', '22inch', '23inch', '24inch', '25inch', '26inch',
               '27inch', '28inch', '29inch', '30inch', '31inch', '32inch',
               '33inch', '34inch', '35inch', '36inch', '38inch']
    },
    international: {
      eu_us: [
        'EU 32 (US 25)', 'EU 34 (US 26)', 'EU 34 (US 28)',
        'EU 36 (US 27)', 'EU 36 (US 29)', 'EU 38 (US 28)',
        'EU 38 (US 30)', 'EU 40 (US 29)', 'EU 40 (US 31)',
        'EU 42 (US 30)', 'EU 42 (US 32)', 'EU 44 (US 31)',
        'EU 44 (US 34)', 'EU 46 (US 32)', 'EU 46 (US 36)',
        'EU 48 (US 33)', 'EU 48 (US 38)'
      ],
      centimeters: [
        '58cm', '61cm', '64cm', '67cm', '70cm', '73cm',
        '76cm', '79cm', '82cm', '85cm', '88cm', '91cm', '95cm'
      ]
    }
  };
  
  export const getProductSizeCategory = (size: string): string[] => {
    const categories: string[] = [];
    const sizeLower = size.toLowerCase();
  
    // Helper function to check if size matches any in category
    const matchesCategory = (categoryItems: string[]) => 
      categoryItems.some(item => sizeLower === item.toLowerCase());
  
    // Check children's sizes
    if (sizeLower.includes('y') || sizeLower.includes('a') || sizeLower.includes('cm')) {
      if (matchesCategory(SIZE_CATEGORIES.children.age)) categories.push('children-age');
      if (matchesCategory(SIZE_CATEGORIES.children.years)) categories.push('children-years');
      if (matchesCategory(SIZE_CATEGORIES.children.height)) categories.push('children-height');
    }
  
    // Check standard letter sizes
    if (matchesCategory(SIZE_CATEGORIES.standard.letter)) categories.push('standard-letter');
    if (matchesCategory(SIZE_CATEGORIES.standard.combined)) categories.push('standard-combined');
    if (matchesCategory(SIZE_CATEGORIES.standard.modified.petite)) categories.push('standard-petite');
    if (matchesCategory(SIZE_CATEGORIES.standard.modified.tall)) categories.push('standard-tall');
    if (matchesCategory(SIZE_CATEGORIES.standard.modified.short)) categories.push('standard-short');
  
    // Check numeric sizes
    if (matchesCategory(SIZE_CATEGORIES.numeric.waist.regular)) categories.push('numeric-waist');
    if (matchesCategory(SIZE_CATEGORIES.numeric.waist.length)) categories.push('numeric-waist-length');
    if (matchesCategory(SIZE_CATEGORIES.numeric.waist.modified)) categories.push('numeric-waist-modified');
    if (matchesCategory(SIZE_CATEGORIES.numeric.inches)) categories.push('numeric-inches');
  
    // Check international sizes
    if (matchesCategory(SIZE_CATEGORIES.international.eu_us)) categories.push('international-eu-us');
    if (matchesCategory(SIZE_CATEGORIES.international.centimeters)) categories.push('international-cm');
  
    // If no categories matched, return 'other'
    return categories.length ? categories : ['other'];
  };