import { NextResponse } from "next/server";
import { ParticipantState, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [activeSessions, connectedParticipants, totalSessions, totalMessages, errorCounter] = await Promise.all([
    prisma.supportSession.count({ where: { status: { in: [SessionStatus.CREATED, SessionStatus.ACTIVE] } } }),
    prisma.participant.count({ where: { state: { in: [ParticipantState.JOINED, ParticipantState.RECONNECTING] } } }),
    prisma.supportSession.count(),
    prisma.message.count(),
    prisma.metricCounter.findUnique({ where: { key: "errorCount" } })
  ]);
  return NextResponse.json({
    activeSessions,
    connectedParticipants,
    totalSessions,
    totalMessages,
    errorCount: errorCounter?.value || 0
  });
}
