import { NextResponse } from 'next/server';
import { performSearch } from '@/lib/search/search-service';

export async function POST(req: Request) {
  try {
    console.log('Search API called');
    const body = await req.json();
    const { query, analyzedDescription, imageSearch } = body;
    
    const searchResults = await performSearch({
      query,
      analyzedDescription,
      imageSearch
    });
    
    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
