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

IMPORTANT: When using PDF content, you MUST:
1. Start your response with "According to [document title]..."
2. Only use information that's directly from the provided context
3. If combining multiple sources, clearly indicate which parts come from where

Instructions for using sources:
- Always cite the document title when using PDF content
- For technical details, prefer PDF chunks over summaries
- Maintain a conversational tone while being accurate
- If information isn't in the provided context, say so
- Be concise and clear`;

// Helper to format context based on source
function formatContextBySource(result: any): string {
  const source = result.metadata?.source;
  const title = result.metadata?.title || 'Unknown Document';
  
  if (source === 'pdf_content' || source === 'pdf_summary') {
    return `PDF Content (${title}): "${result.pageContent}"`;
  }
  return `Chat Message: "${result.pageContent}"`;
}

// Create an enhanced prompt using RAG context
async function createEnhancedPrompt(message: string, isDM: boolean = false): Promise<string> {
  try {
    const relevantResults = await testSimilaritySearch(message, isDM);
    
    // Separate and format context by source
    const contextText = relevantResults
      .map(formatContextBySource)
      .join('\n\n');

    return `${SYSTEM_PROMPT}

RELEVANT CONTEXT:
${contextText}

CURRENT MESSAGE: "${message}"

Remember: If using PDF content, ALWAYS start with "According to [document title]..." and stay within the provided context.`;
  } catch (error) {
    console.error('Error creating enhanced prompt:', error);
    return `You are an AI assistant. Please provide a helpful response to: "${message}"`;
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
      temperature: 0.8,  // Higher temperature for more personality
      max_tokens: 500
    });

    return completion.choices[0]?.message?.content || "I couldn't generate a response.";
  } catch (error) {
    console.error('Error in user-specific chat completion:', error);
    throw error;
  }
} 