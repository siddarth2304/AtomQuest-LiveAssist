import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgent } from "@/lib/auth/session";

const include = {
  participants: true,
  messages: { include: { file: true }, orderBy: { createdAt: "asc" as const } },
  files: { orderBy: { createdAt: "asc" as const } },
  recordings: { orderBy: { createdAt: "desc" as const } },
  events: { orderBy: { createdAt: "desc" as const }, take: 100 }
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAgent(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const session = await prisma.supportSession.findUnique({ where: { id }, include });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session });
}
