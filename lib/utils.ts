import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generatePDFSummary(content: string, fileName: string): Promise<string> {
  try {
    console.log('📝 Generating summary for PDF:', fileName);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise document summarizer. Create a concise but comprehensive summary that captures the key points and main ideas of the document. Focus on information that would be most relevant for future reference and searching."
        },
        {
          role: "user",
          content: `Please summarize the following PDF document (${fileName}):\n\n${content}`
        }
      ],
      temperature: 0, // Lower temperature for more focused/consistent output
      max_tokens: 500   // Limit summary length
    });

    const summary = response.choices[0]?.message?.content;
    if (!summary) throw new Error('Failed to generate summary');

    console.log('✅ Successfully generated summary for:', fileName);
    return summary;

  } catch (error) {
    console.error('❌ Error generating PDF summary:', error);
    throw error;
  }
}
