import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgent } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const user = await requireAgent(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { sessionId?: string; status?: "IDLE" | "RECORDING" | "PROCESSING" | "READY" | "FAILED" };
  if (!body.sessionId || !body.status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const recording = await prisma.recording.create({
    data: {
      sessionId: body.sessionId,
      status: body.status,
      startedAt: body.status === "RECORDING" ? new Date() : undefined,
      endedAt: body.status === "PROCESSING" ? new Date() : undefined
    }
  });
  await prisma.eventLog.create({ data: { sessionId: body.sessionId, type: `recording.${body.status.toLowerCase()}`, actorRole: "AGENT", actorName: user.name } });
  return NextResponse.json({ recording });
}
