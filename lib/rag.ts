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
  modelName: "text-embedding-3-small"
});

// Initialize vector store
export async function initializeVectorStore() {
  if (vectorStore) return vectorStore;
  
  try {
    const pc = new Pinecone();
    const index = pc.index(process.env.PINECONE_INDEX!);
    
    vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex: index }
    );
    
    return vectorStore;
  } catch (error) {
    console.error("Failed to initialize vector store:", error);
    throw error;
  }
}

// Basic test function
export async function testSimilaritySearch(query: string) {
  const store = await initializeVectorStore();
  
  try {
    // Get 5 most similar messages
    const results = await store.similaritySearch(query, 5);
    return results;
  } catch (error) {
    console.error("Failed to perform similarity search:", error);
    throw error;
  }
} 