import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SignJWT } from "jose"
// import { emitSocketEvent } from '@/lib/serverSocket'

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    console.log("Signing in with email:", email);

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    let isNewUser = false;

    

    if (!user) {
      // Create new user
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
        },
      });
    }

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const token = await new SignJWT({
      email: user.email,
      id: user.id,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    // Set cookie with more permissive options for testing
    const cookieStore = cookies();
    await cookieStore.set("session-token", token, {
      httpOnly: false, // Allow JavaScript access for debugging
      secure: false, // Allow HTTP for local testing
      sameSite: "lax",
      path: "/",
    });

    // // Emit `user_signup` event only if new user
    // if (isNewUser) {
    //   console.log("Emitting user_signup event for new user:", user.id);
    //   emitSocketEvent("user_signup", { userId: user.id, email: user.email });
    // }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
