export type DashboardSession = {
  id: string;
  title: string;
  inviteToken: string;
  livekitRoom: string;
  status: "CREATED" | "ACTIVE" | "ENDED";
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  participants: Array<{
    id: string;
    role: "AGENT" | "CUSTOMER";
    name: string;
    state: "JOINED" | "RECONNECTING" | "LEFT";
    joinedAt: string | null;
    leftAt: string | null;
  }>;
  messages: Array<ChatMessage>;
  files: Array<FileItem>;
  recordings: Array<RecordingItem>;
  events: Array<EventItem>;
};

export type ChatMessage = {
  id: string;
  senderRole: "AGENT" | "CUSTOMER";
  senderName: string;
  type: "TEXT" | "FILE" | "SYSTEM";
  body: string;
  fileId: string | null;
  createdAt: string;
  file?: FileItem | null;
};

export type FileItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  uploaderName: string;
  uploaderRole: "AGENT" | "CUSTOMER";
  createdAt: string;
};

export type RecordingItem = {
  id: string;
  status: "IDLE" | "RECORDING" | "PROCESSING" | "READY" | "FAILED";
  url: string | null;
  fileName: string | null;
  size: number | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type EventItem = {
  id: string;
  type: string;
  actorRole: "AGENT" | "CUSTOMER" | null;
  actorName: string | null;
  createdAt: string;
  metadata: unknown;
};
