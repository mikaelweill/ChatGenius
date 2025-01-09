import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    console.log("Processing user:", email)

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Just update status - user creation is handled by Supabase trigger
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
