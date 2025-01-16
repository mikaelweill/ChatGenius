import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { ChatOpenAI } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "langchain/document";
import { config } from './config';

// Types for our RAG system
interface RAGResponse {
  content: string;
  sourceMessages: any[]; // We'll type this properly later
}

interface SearchResult {
  pageContent: string;
  metadata: Record<string, any>;
  score?: number;
}

let vectorStore: PineconeStore | null = null;

// Initialize embeddings and chat model
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY
});

const chat = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  openAIApiKey: process.env.OPENAI_API_KEY
});

// Generate multiple search queries for better coverage
async function generateQueries(originalQuery: string): Promise<string[]> {
  try {
    const response = await chat.invoke([
      { role: "system", content: "Please come up with a few different way to phrase the following prompt. For context this is a question asked to a specific individula in a messaging app."},
      { role: "user", content: originalQuery },
      { role: "user", content: "OUTPUT (3 queries):" }
    ]);

    // Get generated queries
    const content = typeof response.content === 'string' 
      ? response.content 
      : Array.isArray(response.content) 
        ? response.content.map(c => typeof c === 'string' ? c : '').join('\n')
        : '';

    const generatedQueries = content
      .split('\n')
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 0)
      .slice(0, 3); // Reduced to 3 to make room for original

    // Combine original query with generated ones
    return [originalQuery, ...generatedQueries];
  } catch (error) {
    console.error('Error generating queries:', error);
    // If query generation fails, return just the original query
    return [originalQuery];
  }
}

// Reciprocal Rank Fusion to combine multiple search results
function reciprocalRankFusion(results: SearchResult[][], k: number = 60): SearchResult[] {
  const fusedScores = new Map<string, { score: number; result: SearchResult }>();

  // Process each list of results
  results.forEach(docs => {
    docs.forEach((doc, rank) => {
      const key = doc.pageContent; // Use content as key
      const currentScore = (fusedScores.get(key)?.score || 0);
      const newScore = currentScore + 1 / (rank + k);
      
      fusedScores.set(key, {
        score: newScore,
        result: doc
      });
    });
  });

  // Sort by score and return results
  const sortedResults = Array.from(fusedScores.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      ...item.result,
      score: item.score
    }));

  // Log top 5 results with scores and metadata
  console.log('Top 5 fused results:', 
    sortedResults.slice(0, 5).map(result => ({
      score: result.score,
      content: result.pageContent,
      metadata: {
        author: result.metadata.author_name,
        timestamp: result.metadata.timestamp,
        channel: result.metadata.channel_name || result.metadata.direct_chat_id
      }
    }))
  );

  return sortedResults;
}

// Initialize vector store
export async function initializeVectorStore() {
  if (vectorStore) return vectorStore;
  
  // Check environment variables
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const pineconeIndex = process.env.PINECONE_INDEX;

  if (!pineconeApiKey || !pineconeIndex) {
    console.error('Missing environment variables:', {
      hasPineconeApiKey: !!pineconeApiKey,
      hasPineconeIndex: !!pineconeIndex
    });
    throw new Error('Missing required Pinecone environment variables');
  }
  
  try {
    console.log('Initializing Pinecone client...');
    const pc = new Pinecone({
      apiKey: pineconeApiKey
    });
    
    console.log('Getting index:', pineconeIndex);
    const index = pc.Index(pineconeIndex);

    console.log('Creating vector store...');
    // Remove namespace from PineconeStore initialization
    vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex: index
      }
    );
    
    console.log('Vector store initialized successfully');
    return vectorStore;
  } catch (error) {
    console.error('Failed to initialize vector store:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

// Enhanced test function with query generation and rank fusion
export async function testSimilaritySearch(
  query: string,
  isDM: boolean = false,
  username?: string
) {
  try {
    console.log('Starting similarity search:', {
      query,
      isDM,
      username,
      timestamp: new Date().toISOString()
    });
    
    const store = await initializeVectorStore();
    const queries = await generateQueries(query);
    
    console.log('Performing similarity searches...');
    const searchResults = await Promise.all(
      queries.map(async q => {
        const filter = username ? { author_name: username } : undefined;
        console.log('Search with filter:', {
          query: q,
          filter,
          isDM
        });
        
        const results = await store.similaritySearch(q, 10, filter);
        
        // Log first result's metadata for debugging
        if (results.length > 0) {
          console.log('Sample result metadata:', {
            query: q,
            metadata: results[0].metadata,
            content: results[0].pageContent
          });
        }
        
        const filtered = results.filter(result => {
          const metadata = result.metadata;
          return isDM 
            ? metadata.direct_chat_id && metadata.direct_chat_id !== ""
            : metadata.channel_id && metadata.channel_id !== "";
        }).slice(0, 5);

        console.log(`Found ${filtered.length} results after filtering for query: ${q}`);
        return filtered;
      })
    );

    // Only search PDFs if it's the general AI (no username)
    if (!username) {
      const pdfSummaries = await searchPDFSummaries(query);
      if (pdfSummaries.length > 0) {
        const [topSummary, relevanceScore] = pdfSummaries[0];
        
        if (relevanceScore > config.rag.minPdfScore) {
          console.log(`📚 Found relevant PDF summary (score: ${relevanceScore} > ${config.rag.minPdfScore})`);
          const pdfChunks = await searchPDFChunks(query, topSummary.metadata.pdf_id);
          searchResults.push([
            ...pdfSummaries.map(([doc]) => doc),
            ...pdfChunks.map(([doc]) => doc)
          ]);
        } else {
          console.log(`📚 PDF summaries below relevance threshold (${relevanceScore} < ${config.rag.minPdfScore})`);
        }
      }
    }

    const fusedResults = reciprocalRankFusion(searchResults);
    console.log('Final fused results:', JSON.stringify(fusedResults, null, 2));
    
    return fusedResults;

  } catch (error) {
    console.error('Error in similarity search:', error);
    throw error;
  }
}

// Update search function to use metadata filtering instead of namespace
export async function similaritySearch(
  query: string,
  k: number = 4,
  filter?: { [key: string]: any }
): Promise<SearchResult[]> {
  const store = await initializeVectorStore();
  
  try {
    // Use metadata filter instead of namespace
    const results = await store.similaritySearch(query, k, filter);
    return results.map(doc => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata,
      score: doc.metadata.score
    }));
  } catch (error) {
    console.error('Error in similarity search:', error);
    return [];
  }
}

// 1. RAG for PDF summaries
export async function searchPDFSummaries(query: string): Promise<[Document, number][]> {
  const store = await initializeVectorStore();
  
  console.log('🔍 Checking PDF metadata in Pinecone...');
  const filter = { source: 'pdf_summary' };
  console.log('Using filter:', filter);
  
  try {
    const summaryResults = await store.similaritySearchWithScore(query, 10, filter);
    
    // Log what we found with scores
    summaryResults.forEach(([doc, score], i) => {
      console.log(`PDF Summary ${i} metadata:`, {
        metadata: doc.metadata,
        content_preview: doc.pageContent.slice(0, 50),
        score: score
      });
    });

    console.log('📚 Found PDF summaries:', summaryResults.length);
    return summaryResults;
  } catch (error) {
    console.error('❌ Error searching PDF summaries:', error);
    return [];
  }
}

// 2. RAG for PDF chunks
export async function searchPDFChunks(query: string, pdfId: string): Promise<[Document, number][]> {
  const store = await initializeVectorStore();

  const filter = {
    "metadata.source": 'pdf_content',
    "metadata.pdf_id": pdfId
  };

  console.log('Using chunks filter:', filter);
  const chunkResults = await store.similaritySearchWithScore(query, 5, filter);

  console.log(`📄 Found PDF chunks for ${pdfId}:`, chunkResults.length);
  return chunkResults;
} 