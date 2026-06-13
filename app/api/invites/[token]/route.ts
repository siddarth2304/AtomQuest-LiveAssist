import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await prisma.supportSession.findUnique({
    where: { inviteToken: token },
    select: { id: true, title: true, status: true, inviteToken: true }
  });
  if (!session || session.status === "ENDED") return NextResponse.json({ error: "Invite is invalid or expired" }, { status: 404 });
  return NextResponse.json({ session });
}
