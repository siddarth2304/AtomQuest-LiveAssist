import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAgent } from "@/lib/auth/session";

const include = {
  participants: true,
  messages: { include: { file: true }, orderBy: { createdAt: "asc" as const } },
  files: { orderBy: { createdAt: "asc" as const } },
  recordings: { orderBy: { createdAt: "desc" as const } },
  events: { orderBy: { createdAt: "desc" as const }, take: 50 }
};

export async function GET(request: NextRequest) {
  const user = await requireAgent(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await prisma.supportSession.findMany({
    include,
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const user = await requireAgent(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const title = body.title?.trim() || `Support Session ${new Date().toLocaleTimeString()}`;
  const inviteToken = randomBytes(24).toString("base64url");
  const livekitRoom = `atomquest-${randomBytes(10).toString("hex")}`;

  const session = await prisma.supportSession.create({
    data: {
      title,
      inviteToken,
      livekitRoom,
      status: SessionStatus.CREATED,
      createdById: user.userId,
      recordings: { create: { status: "IDLE" } },
      events: { create: { type: "session.created", actorRole: "AGENT", actorName: user.name } }
    },
    include
  });

  return NextResponse.json({ session });
}
