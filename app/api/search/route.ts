import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { performSearch } from '@/lib/search/search-service';

export async function POST(req: NextRequest) {
  console.log('Search API called');
  let body: any;
  
  try {
    body = await req.json();
    console.log('Search request body:', body);
    
    const { query, analyzedDescription, imageSearch } = body;
    
    const results = await performSearch({
      query,
      analyzedDescription,
      imageSearch,
      request: req
    });
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred during search',
        query: body?.query || 'unknown'
      },
      { status: 500 }
    );
  }
}
