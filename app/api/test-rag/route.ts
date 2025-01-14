import { NextResponse } from 'next/server';
import { testSimilaritySearch } from '@/lib/rag';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('Processing query:', query);
    const results = await testSimilaritySearch(query);
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error('Error in RAG test:', error);
    let errorMessage = 'Failed to process query';
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 