import { NextResponse } from "next/server"
import { getAPIUser } from '@/lib/auth'
import { cookies } from "next/headers"
import { getChatCompletion } from '@/lib/openai'

export async function POST(req: Request) {
  try {
    // Authenticate user
    const cookieStore = cookies()
    const { user, error } = await getAPIUser(() => cookieStore)
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await req.json()
    const { prompt, channelId, isDM } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Get AI response
    const aiContent = await getChatCompletion(prompt)

    const aiResponse = {
      content: aiContent,
      authorId: "AI_SYSTEM",
      channelId: channelId,
      isDM: isDM
    }

    return NextResponse.json(aiResponse)
  } catch (error) {
    console.error('AI processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI command' },
      { status: 500 }
    )
  }
} 