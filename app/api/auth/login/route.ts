import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authCookieName, createSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };
  const user = await prisma.user.findUnique({ where: { email: body.email?.toLowerCase().trim() || "" } });
  if (!user || !verifyPassword(body.password || "", user.passwordHash)) {
    await prisma.metricCounter.upsert({
      where: { key: "errorCount" },
      update: { value: { increment: 1 } },
      create: { key: "errorCount", value: 1 }
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    authCookieName,
    createSessionCookie({ userId: user.id, email: user.email, name: user.name, role: user.role }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    }
  );
  return response;
}
