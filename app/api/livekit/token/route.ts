import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { getRequestSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    sessionId?: string;
    inviteToken?: string;
    role?: "AGENT" | "CUSTOMER";
    name?: string;
  };
  const session = await prisma.supportSession.findUnique({ where: { id: body.sessionId || "" } });
  if (!session || session.status === "ENDED") return NextResponse.json({ error: "Session unavailable" }, { status: 404 });

  if (body.role === "AGENT") {
    const auth = getRequestSession(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else if (session.inviteToken !== body.inviteToken) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 403 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
  const identity = `${body.role || "CUSTOMER"}-${body.name || "Guest"}-${Date.now()}`;
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: body.name || (body.role === "AGENT" ? "Agent" : "Customer")
  });
  token.addGrant({
    room: session.livekitRoom,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return NextResponse.json({
    token: await token.toJwt(),
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880",
    room: session.livekitRoom
  });
}
