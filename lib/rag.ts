import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { ChatOpenAI } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";

// Types for our RAG system
interface RAGResponse {
  content: string;
  sourceMessages: any[]; // We'll type this properly later
}

let vectorStore: PineconeStore | null = null;

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY
});

// Initialize vector store
export async function initializeVectorStore() {
  if (vectorStore) return vectorStore;
  
  // Check environment variables
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const pineconeIndex = process.env.PINECONE_INDEX;
  const pineconeNamespace = process.env.PINECONE_NAMESPACE;

  if (!pineconeApiKey || !pineconeIndex || !pineconeNamespace) {
    console.error('Missing environment variables:', {
      hasPineconeApiKey: !!pineconeApiKey,
      hasPineconeIndex: !!pineconeIndex,
      hasPineconeNamespace: !!pineconeNamespace
    });
    throw new Error('Missing required Pinecone environment variables');
  }
  
  try {
    console.log('Initializing Pinecone client...');
    // Initialize the client with API key
    const pc = new Pinecone({
      apiKey: pineconeApiKey
    });
    
    console.log('Getting index:', pineconeIndex);
    // Initialize the index - now pineconeIndex is definitely string
    const index = pc.Index(pineconeIndex);

    console.log('Creating vector store with namespace:', pineconeNamespace);
    // Create the vector store - now pineconeNamespace is definitely string
    vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex: index,
        namespace: pineconeNamespace
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

// Basic test function
export async function testSimilaritySearch(query: string) {
  try {
    console.log('Initializing vector store for query:', query);
    const store = await initializeVectorStore();
    
    console.log('Performing similarity search...');
    const results = await store.similaritySearch(query, 5);
    
    console.log('Search results:', JSON.stringify(results, null, 2));
    return results;
  } catch (error) {
    console.error('Error in similarity search:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
} 