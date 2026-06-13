import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { MessageType, ParticipantRole, ParticipantState, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const reconnectTimers = new Map<string, NodeJS.Timeout>();

async function logError(error: unknown) {
  console.error(error);
  await prisma.metricCounter.upsert({
    where: { key: "errorCount" },
    update: { value: { increment: 1 } },
    create: { key: "errorCount", value: 1 }
  });
}

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    cors: { origin: process.env.APP_URL || "http://localhost:3000", credentials: true }
  });

  io.on("connection", (socket) => {
    socket.on("session:join", async (payload: { sessionId: string; role: ParticipantRole; name: string }) => {
      try {
        const role = payload.role === "AGENT" ? ParticipantRole.AGENT : ParticipantRole.CUSTOMER;
        const name = payload.name?.trim() || (role === ParticipantRole.AGENT ? "Agent" : "Customer");
        socket.data.sessionId = payload.sessionId;
        socket.data.role = role;
        socket.data.name = name;
        socket.join(payload.sessionId);

        const timerKey = `${payload.sessionId}:${role}:${name}`;
        const timer = reconnectTimers.get(timerKey);
        if (timer) {
          clearTimeout(timer);
          reconnectTimers.delete(timerKey);
        }

        await prisma.supportSession.update({
          where: { id: payload.sessionId },
          data: {
            status: SessionStatus.ACTIVE,
            startedAt: { set: new Date() }
          }
        }).catch(async () => {
          await prisma.supportSession.update({
            where: { id: payload.sessionId },
            data: { status: SessionStatus.ACTIVE }
          });
        });

        await prisma.participant.upsert({
          where: { id: `${payload.sessionId}-${role}-${name}` },
          update: {
            socketId: socket.id,
            state: ParticipantState.JOINED,
            lastSeenAt: new Date(),
            joinedAt: new Date(),
            leftAt: null
          },
          create: {
            id: `${payload.sessionId}-${role}-${name}`,
            sessionId: payload.sessionId,
            role,
            name,
            socketId: socket.id,
            state: ParticipantState.JOINED,
            joinedAt: new Date(),
            lastSeenAt: new Date()
          }
        });

        await prisma.eventLog.create({
          data: { sessionId: payload.sessionId, type: "participant.joined", actorRole: role, actorName: name }
        });

        const participants = await prisma.participant.findMany({ where: { sessionId: payload.sessionId } });
        io.to(payload.sessionId).emit("presence:update", participants);
      } catch (error) {
        await logError(error);
        socket.emit("error:event", "Could not join session presence");
      }
    });

    socket.on("chat:send", async (payload: { sessionId: string; body: string; role: ParticipantRole; name: string }) => {
      try {
        const body = payload.body?.trim();
        if (!body) return;
        const message = await prisma.message.create({
          data: {
            sessionId: payload.sessionId,
            senderRole: payload.role === "AGENT" ? ParticipantRole.AGENT : ParticipantRole.CUSTOMER,
            senderName: payload.name || "Guest",
            type: MessageType.TEXT,
            body
          }
        });
        io.to(payload.sessionId).emit("chat:message", message);
      } catch (error) {
        await logError(error);
        socket.emit("error:event", "Could not send message");
      }
    });

    socket.on("chat:file", async (payload: { sessionId: string; message: unknown }) => {
      io.to(payload.sessionId).emit("chat:message", payload.message);
    });

    socket.on("recording:status", async (payload: { sessionId: string; status: string }) => {
      io.to(payload.sessionId).emit("recording:status", payload.status);
    });

    socket.on("session:end", async (payload: { sessionId: string; name: string }) => {
      try {
        await prisma.supportSession.update({
          where: { id: payload.sessionId },
          data: { status: SessionStatus.ENDED, endedAt: new Date() }
        });
        await prisma.eventLog.create({
          data: { sessionId: payload.sessionId, type: "session.ended", actorRole: ParticipantRole.AGENT, actorName: payload.name }
        });
        io.to(payload.sessionId).emit("session:ended");
      } catch (error) {
        await logError(error);
      }
    });

    socket.on("disconnect", async () => {
      const sessionId = socket.data.sessionId as string | undefined;
      const role = socket.data.role as ParticipantRole | undefined;
      const name = socket.data.name as string | undefined;
      if (!sessionId || !role || !name) return;
      const id = `${sessionId}-${role}-${name}`;
      const timerKey = id;
      try {
        await prisma.participant.update({
          where: { id },
          data: { state: ParticipantState.RECONNECTING, lastSeenAt: new Date() }
        });
        await prisma.eventLog.create({
          data: { sessionId, type: "participant.reconnecting", actorRole: role, actorName: name }
        });
        io.to(sessionId).emit("presence:update", await prisma.participant.findMany({ where: { sessionId } }));
      } catch (error) {
        await logError(error);
      }

      reconnectTimers.set(
        timerKey,
        setTimeout(async () => {
          try {
            await prisma.participant.update({
              where: { id },
              data: { state: ParticipantState.LEFT, leftAt: new Date(), socketId: null }
            });
            await prisma.eventLog.create({
              data: { sessionId, type: "participant.left", actorRole: role, actorName: name }
            });
            io.to(sessionId).emit("presence:update", await prisma.participant.findMany({ where: { sessionId } }));
          } catch (error) {
            await logError(error);
          }
        }, 30_000)
      );
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`AtomQuest ready on http://localhost:${port}`);
  });
});
