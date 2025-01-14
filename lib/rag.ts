import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { ChatOpenAI } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";

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
      { role: "system", content: "You are a helpful assistant that generates multiple search queries based on a single input query. Generate 4 different but related queries that will help find relevant context." },
      { role: "user", content: originalQuery },
      { role: "user", content: "OUTPUT (4 queries):" }
    ]);

    // Ensure response.content is a string and split into queries
    const content = typeof response.content === 'string' 
      ? response.content 
      : Array.isArray(response.content) 
        ? response.content.map(c => typeof c === 'string' ? c : '').join('\n')
        : '';

    // Split response into individual queries
    const queries = content
      .split('\n')
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 0)
      .slice(0, 4); // Ensure we only get 4 queries

    console.log('Generated queries:', queries);
    return queries;
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
  return Array.from(fusedScores.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      ...item.result,
      score: item.score
    }));
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
export async function testSimilaritySearch(query: string, isDM: boolean = false) {
  try {
    console.log('Initializing vector store for query:', query);
    const store = await initializeVectorStore();
    
    console.log('Generating multiple queries...');
    const queries = await generateQueries(query);
    
    console.log('Performing similarity searches...');
    const searchResults = await Promise.all(
      queries.map(async q => {
        const results = await store.similaritySearch(q, 10);
        // Log the first result's metadata to debug
        if (results.length > 0) {
          console.log('Sample metadata:', results[0].metadata);
        }
        return results.filter(result => {
          const metadata = result.metadata;
          return isDM 
            ? metadata.direct_chat_id && metadata.direct_chat_id !== ""
            : metadata.channel_id && metadata.channel_id !== "";
        }).slice(0, 5);
      })
    );
    
    console.log('Combining results with reciprocal rank fusion...');
    const rankedResults = reciprocalRankFusion(searchResults);
    
    console.log('Final results:', JSON.stringify(rankedResults, null, 2));
    return rankedResults;
  } catch (error) {
    console.error('Error in similarity search:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
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