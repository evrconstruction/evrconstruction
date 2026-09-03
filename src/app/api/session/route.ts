import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const ALLOWED_ADMIN_EMAIL = "contact@evrconstructions.com";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const email = (decoded.email ?? "").toLowerCase();
    if (email !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized user email" }, { status: 403 });
    }

    let sessionCookie: string;
    try {
      sessionCookie = await adminAuth.createSessionCookie(token, {
        expiresIn: SESSION_MAX_AGE * 1000,
      });
    } catch (err) {
      console.error("Failed to create session cookie:", err);
      return NextResponse.json(
        { error: "Session creation failed" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ status: "ok", email });
  } catch (err) {
    console.error("Session creation error:", err);
    return NextResponse.json({ error: "Invalid session request" }, { status: 400 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set("__session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return NextResponse.json({ status: "ok" });
}
