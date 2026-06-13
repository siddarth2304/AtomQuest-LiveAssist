import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
  role: "AGENT" | "ADMIN";
};

const cookieName = "atomquest_session";

function secret() {
  return process.env.AUTH_SECRET || "dev-only-atomquest-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionCookie(session: AuthSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseSessionCookie(value?: string): AuthSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession;
  } catch {
    return null;
  }
}

export async function getServerSession() {
  const store = await cookies();
  return parseSessionCookie(store.get(cookieName)?.value);
}

export function getRequestSession(request: NextRequest) {
  return parseSessionCookie(request.cookies.get(cookieName)?.value);
}

export async function requireAgent(request: NextRequest) {
  const session = getRequestSession(request);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  return session;
}

export const authCookieName = cookieName;
