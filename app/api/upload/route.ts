import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { MessageType, ParticipantRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequestSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const sessionId = String(form.get("sessionId") || "");
  const role = String(form.get("role") || "CUSTOMER") === "AGENT" ? ParticipantRole.AGENT : ParticipantRole.CUSTOMER;
  const uploaderName = String(form.get("name") || "Guest");
  const inviteToken = String(form.get("inviteToken") || "");
  const kind = String(form.get("kind") || "file");

  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const session = await prisma.supportSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status === "ENDED") return NextResponse.json({ error: "Session unavailable" }, { status: 404 });
  if (role === ParticipantRole.AGENT && !getRequestSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role === ParticipantRole.CUSTOMER && session.inviteToken !== inviteToken) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 403 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", sessionId);
  await mkdir(uploadDir, { recursive: true });
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await writeFile(path.join(uploadDir, safeName), bytes);
  const url = `/uploads/${sessionId}/${safeName}`;

  if (kind === "recording") {
    const recording = await prisma.recording.create({
      data: {
        sessionId,
        status: "READY",
        url,
        fileName: file.name,
        size: bytes.length,
        endedAt: new Date()
      }
    });
    await prisma.eventLog.create({ data: { sessionId, type: "recording.ready", actorRole: role, actorName: uploaderName } });
    return NextResponse.json({ recording });
  }

  const fileShare = await prisma.fileShare.create({
    data: {
      sessionId,
      uploaderRole: role,
      uploaderName,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: bytes.length,
      url
    }
  });
  const message = await prisma.message.create({
    data: {
      sessionId,
      senderRole: role,
      senderName: uploaderName,
      type: MessageType.FILE,
      body: file.name,
      fileId: fileShare.id
    },
    include: { file: true }
  });
  await prisma.eventLog.create({ data: { sessionId, type: "file.shared", actorRole: role, actorName: uploaderName } });
  return NextResponse.json({ file: fileShare, message });
}
