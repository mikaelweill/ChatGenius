import OpenAI from 'openai';
import { testSimilaritySearch } from './rag';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create an enhanced prompt using RAG context
async function createEnhancedPrompt(message: string): Promise<string> {
  try {
    // Get relevant context using RAG
    const relevantResults = await testSimilaritySearch(message);
    
    // Format context messages
    const contextText = relevantResults
      .map(result => `Previous Message: "${result.pageContent}"`)
      .join('\n\n');

    // Create the enhanced prompt
    return `You are an AI assistant in a chat application. You have access to previous messages that provide context for the current query.

RELEVANT CONTEXT:
${contextText}

CURRENT MESSAGE: "${message}"

Please provide a response that incorporates the context while maintaining a natural flow of conversation.`;
  } catch (error) {
    console.error('Error creating enhanced prompt:', error);
    // If RAG fails, return a basic prompt
    return `You are an AI assistant in a chat application. Please provide a helpful response to: "${message}"`;
  }
}

export async function getChatCompletion(message: string): Promise<string> {
  try {
    // Get enhanced prompt with context
    const enhancedPrompt = await createEnhancedPrompt(message);
    
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: enhancedPrompt },
        { role: "user", content: message }
      ],
      model: "gpt-4o-mini",
    });

    return completion.choices[0]?.message?.content || "I couldn't generate a response.";
  } catch (error) {
    console.error('Error in chat completion:', error);
    throw error;
  }
} 