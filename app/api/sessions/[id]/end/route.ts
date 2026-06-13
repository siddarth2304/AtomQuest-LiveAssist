import { NextRequest, NextResponse } from "next/server";
import { SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAgent } from "@/lib/auth/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAgent(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const session = await prisma.supportSession.update({
    where: { id },
    data: {
      status: SessionStatus.ENDED,
      endedAt: new Date(),
      events: { create: { type: "session.ended", actorRole: "AGENT", actorName: user.name } }
    }
  });
  return NextResponse.json({ session });
}
