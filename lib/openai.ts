import OpenAI from 'openai';
import { testSimilaritySearch } from './rag';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Claude, a helpful AI assistant. You have access to two types of information sources:

1. Chat Messages (source: 'chat_messages'): Previous conversations in the chat
2. PDF Documents:
   - PDF Summaries (source: 'pdf_summary'): High-level document overviews
   - PDF Content (source: 'pdf_content'): Specific document sections

Instructions for using sources:
- Check the 'source' field in metadata to identify the type of information
- If PDF content is relevant to the question, prioritize it and cite the document: "According to [document title]..."
- For technical details, prefer PDF chunks over summaries
- Maintain a conversational tone even when citing documents
- If combining chat history and PDF content, clearly distinguish between them
- Only reference PDFs when they're directly relevant to the question

Remember to:
- Be concise and clear
- Stay within the context provided
- Acknowledge when information comes from different sources
- Maintain a helpful and friendly tone`;

// Create an enhanced prompt using RAG context
async function createEnhancedPrompt(message: string, isDM: boolean = false): Promise<string> {
  try {
    // Get relevant context using RAG, passing isDM parameter
    const relevantResults = await testSimilaritySearch(message, isDM);
    
    // Format context messages
    const contextText = relevantResults
      .map(result => `Previous Message: "${result.pageContent}"`)
      .join('\n\n');

    // Create the enhanced prompt
    return `You are an AI assistant in a chat application. You have access to previous messages that provide context for the current query.

RELEVANT CONTEXT:
${contextText}

CURRENT MESSAGE: "${message}"

INSTRUCTIONS:
1. Use the provided context to inform your response
2. Maintain a natural, conversational tone
3. If the context doesn't provide enough information, provide a reasonable response based on general knowledge
4. Keep responses concise but informative
5. Stay focused on the current topic
${isDM ? "6. This is a direct message conversation, so keep the context personal and specific to this chat." : "6. This is a channel conversation, so consider the broader channel context."}

Please provide a response that incorporates the context while maintaining a natural flow of conversation.`;
  } catch (error) {
    console.error('Error creating enhanced prompt:', error);
    // If RAG fails, return a basic prompt
    return `You are an AI assistant in a chat application. Please provide a helpful response to: "${message}"`;
  }
}

export async function getChatCompletion(message: string, isDM: boolean = false): Promise<string> {
  try {
    // Get enhanced prompt with context, passing isDM parameter
    const enhancedPrompt = await createEnhancedPrompt(message, isDM);
    
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

export async function getUserSpecificCompletion(
  prompt: string,
  username: string,
  isDM: boolean = false
): Promise<string> {
  try {
    // Pass username to filter at the search level
    const relevantResults = await testSimilaritySearch(prompt, isDM, username);
    
    // No need to filter here anymore since results are pre-filtered
    const userMessages = relevantResults
      .map(result => result.pageContent)
      .join('\n');

    // Convert username to display format (replace underscores with spaces)
    const displayName = username.split('_').join(' ');

    const systemPrompt = `You are now impersonating ${displayName}. Based on their previous messages, respond in their exact style and try to answer the question correctly:

Previous messages from ${displayName}:
${userMessages}

Key instructions:
1. Match their exact writing style, including:
   - Emoji usage patterns
   - Capitalization habits
   - Technical vocabulary level
   - Slang and expressions
2. Maintain their personality traits
3. Reference their known interests
4. Keep consistent with their expertise areas
5. Use similar sentence structures

Respond to this prompt: "${prompt}"

Remember: Your response should be indistinguishable from how ${displayName} would actually write it.`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      model: "gpt-4",
      temperature: 0.9,  // Higher temperature for more personality
      max_tokens: 500
    });

    return completion.choices[0]?.message?.content || "I couldn't generate a response.";
  } catch (error) {
    console.error('Error in user-specific chat completion:', error);
    throw error;
  }
} 