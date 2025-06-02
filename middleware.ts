import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of API routes that should bypass authentication
const PUBLIC_API_ROUTES = [
  '/api/search',
  '/api/collections',
  '/api/price-recommendation',
  '/api/analyze-image',
  '/api/image-search',
  '/api/recommendations/price',
  '/api/batch-scrape',
  '/api/collect-links',
  '/api/recent-scrapes',
  '/api/collections/[name]'
]

export function middleware(request: NextRequest) {
  // Check if the request is for one of our public API routes
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // If it's a public API route, bypass authentication
  if (isPublicApiRoute) {
    return NextResponse.next({
      headers: {
        'x-middleware-skip': '1'
      }
    })
  }

  // For all other routes, continue with normal authentication
  return NextResponse.next()
}

// Configure which routes this middleware should run on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and other assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 