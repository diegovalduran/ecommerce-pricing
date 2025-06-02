// Collection categories and their mappings
const COLLECTION_CATEGORIES = {
  // Gender categories
  men: ['men', 'man'],
  women: ['women', 'woman'],
  kids: ['kids', 'boy', 'girl'],

  // Product categories
  tops: ['top', 'tops', 't_shirt', 'tshirts', 'shirt', 'shirts', 'blouse', 'blouses', 'polo', 'polos'],
  bottoms: ['bottom', 'bottoms', 'jeans', 'trousers', 'shorts', 'bermudas', 'skirt', 'skirts'],
  dresses: ['dress', 'dresses', 'jumpsuit', 'jumpsuits'],
  cutouts: ['cut out', 'cutout', 'cut-out'],

  // Brand categories
  hm: ['hm-'],
  uniqlo: ['uniqlo-'],
  zara: ['zara-']
} as const

// Collection name patterns and their components
const COLLECTION_PATTERNS = [
  // H&M patterns
  { pattern: /^hm-(men|women|kids)-(.*?)(?:-thailand)?$/, components: ['hm', 'gender', 'category'] },
  // Uniqlo patterns
  { pattern: /^uniqlo-(men|women|kids)-(.*?)$/, components: ['uniqlo', 'gender', 'category'] },
  // Zara patterns
  { pattern: /^zara-(man|woman|kids)-(.*?)$/, components: ['zara', 'gender', 'category'] },
  { pattern: /^zara-(man|woman)-(.*?)$/, components: ['zara', 'gender', 'category'] }
] as const

// Valid collection names
export const VALID_COLLECTIONS = [
  'hm-kids-shorts',
  'hm-men-jeans',
  'hm-men-shirt',
  'hm-men-shorts',
  'hm-men-t_shirt',
  'hm-men-top',
  'hm-women-cut out tops-thailand',
  'hm-women-dress',
  'hm-women-shirt-thailand',
  'hm-women-skirt',
  'hm-women-t_shirt',
  'hm-women-top',
  'hm-women-trousers',
  'uniqlo-kids-bottoms-shorts',
  'uniqlo-men-bottoms',
  'uniqlo-men-shirts-and-polo-shirts',
  'uniqlo-men-tops',
  'uniqlo-women-bottoms',
  'uniqlo-women-dresses-and-jumpsuits',
  'uniqlo-women-shirts-and-blouses',
  'uniqlo-women-tops',
  'zara-kids-boy-bermudas',
  'zara-kids-girl-skirts',
  'zara-man',
  'zara-man-bermudas',
  'zara-man-jeans',
  'zara-man-polos',
  'zara-man-shirts',
  'zara-man-trousers',
  'zara-man-tshirts',
  'zara-woman-dresses',
  'zara-woman-jeans',
  'zara-woman-shirts',
  'zara-woman-skirts',
  'zara-woman-tops',
  'zara-woman-trousers',
  'zara-woman-tshirts'
] as const

export type ValidCollection = typeof VALID_COLLECTIONS[number]

interface CollectionMatch {
  collection: ValidCollection
  score: number
  matchedTerms: string[]
}

/**
 * Maps a search query to relevant collections based on the query terms
 * @param query The search query string
 * @returns Array of collection matches with relevance scores
 */
export function mapQueryToCollections(query: string): CollectionMatch[] {
  // Normalize query
  const normalizedQuery = query.toLowerCase().trim()
  const queryTerms = normalizedQuery.split(/\s+/)

  // Track matched collections and their scores
  const collectionMatches = new Map<ValidCollection, { score: number, matchedTerms: string[] }>()

  // Helper function to add or update a collection match
  const addMatch = (collection: ValidCollection, score: number, term: string) => {
    const existing = collectionMatches.get(collection)
    if (existing) {
      existing.score += score
      existing.matchedTerms.push(term)
    } else {
      collectionMatches.set(collection, { score, matchedTerms: [term] })
    }
  }

  // Process each query term
  for (const term of queryTerms) {
    // Check gender matches
    for (const [gender, keywords] of Object.entries(COLLECTION_CATEGORIES)) {
      if (keywords.some(keyword => term.includes(keyword))) {
        // Find collections matching this gender
        VALID_COLLECTIONS.forEach(collection => {
          if (collection.includes(`-${gender}-`) || collection.includes(`-${gender}s-`)) {
            addMatch(collection, 2, term) // Higher score for gender matches
          }
        })
      }
    }

    // Check product category matches
    for (const [category, keywords] of Object.entries(COLLECTION_CATEGORIES)) {
      const matchingKeyword = keywords.find(k => term.includes(k))
      if (matchingKeyword) {
        // Find collections matching this category
        VALID_COLLECTIONS.forEach(collection => {
          if (collection.includes(matchingKeyword)) {
            addMatch(collection, 1.5, term) // Good score for category matches
          }
        })
      }
    }

    // Check brand matches
    for (const [brand, prefixes] of Object.entries(COLLECTION_CATEGORIES)) {
      const matchingPrefix = prefixes.find(p => term.includes(p))
      if (matchingPrefix) {
        // Find collections for this brand
        VALID_COLLECTIONS.forEach(collection => {
          if (collection.startsWith(matchingPrefix)) {
            addMatch(collection, 1, term) // Base score for brand matches
          }
        })
      }
    }

    // Direct collection name matches
    VALID_COLLECTIONS.forEach(collection => {
      if (collection.includes(term)) {
        addMatch(collection, 3, term) // Highest score for direct matches
      }
    })
  }

  // Convert to array and sort by score
  return Array.from(collectionMatches.entries())
    .map(([collection, { score, matchedTerms }]) => ({
      collection,
      score,
      matchedTerms: [...new Set(matchedTerms)] // Remove duplicates
    }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Gets the most relevant collections for a search query
 * @param query The search query string
 * @param minScore Optional minimum score threshold (default: 1)
 * @returns Array of collection names sorted by relevance
 */
export function getRelevantCollections(query: string, minScore: number = 1): ValidCollection[] {
  const matches = mapQueryToCollections(query)
  return matches
    .filter(match => match.score >= minScore)
    .map(match => match.collection)
}

/**
 * Checks if a collection is relevant to a search query
 * @param collection The collection name to check
 * @param query The search query string
 * @param minScore Optional minimum score threshold (default: 1)
 * @returns boolean indicating if the collection is relevant
 */
export function isCollectionRelevant(
  collection: ValidCollection,
  query: string,
  minScore: number = 1
): boolean {
  const matches = mapQueryToCollections(query)
  return matches.some(match => match.collection === collection && match.score >= minScore)
} 