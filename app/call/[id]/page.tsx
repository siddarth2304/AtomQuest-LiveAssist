"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { LiveKitRoom, ControlBar, GridLayout, ParticipantTile, RoomAudioRenderer, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { FileUp, Loader2, MessageSquare, Radio, Send, Square, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/lib/types";

function VideoGrid() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
  return <GridLayout tracks={tracks} className="h-full"><ParticipantTile /></GridLayout>;
}

function CallPageInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const role = search.get("role") === "AGENT" ? "AGENT" : "CUSTOMER";
  const inviteToken = search.get("token") || "";
  const displayName = search.get("name") || (role === "AGENT" ? "Agent" : "Customer");
  const [lk, setLk] = useState<{ token: string; url: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; role: string; state: string }>>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [recordingStatus, setRecordingStatus] = useState("idle");
  const socketRef = useRef<Socket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const name = useMemo(() => displayName.trim() || (role === "AGENT" ? "Agent" : "Customer"), [displayName, role]);

  useEffect(() => {
    async function boot() {
      if (role === "AGENT") {
        const sessionResponse = await fetch(`/api/sessions/${params.id}`);
        if (sessionResponse.ok) {
          const data = await sessionResponse.json();
          setMessages(data.session.messages || []);
        }
      }
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: params.id, inviteToken, role, name })
      });
      if (!response.ok) {
        setError((await response.json()).error || "Could not join call");
        return;
      }
      setLk(await response.json());
    }
    boot();
  }, [inviteToken, name, params.id, role]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    socket.emit("session:join", { sessionId: params.id, role, name });
    socket.on("chat:message", (message: ChatMessage) => setMessages((current) => [...current, message]));
    socket.on("presence:update", setParticipants);
    socket.on("recording:status", setRecordingStatus);
    socket.on("session:ended", () => router.push(role === "AGENT" ? `/history/${params.id}` : "/"));
    return () => {
      socket.disconnect();
    };
  }, [name, params.id, role, router]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    socketRef.current?.emit("chat:send", { sessionId: params.id, role, name, body });
    setBody("");
  }

  async function uploadFile(file: File, kind = "file") {
    const form = new FormData();
    form.append("file", file);
    form.append("sessionId", params.id);
    form.append("role", role);
    form.append("name", name);
    form.append("inviteToken", inviteToken);
    form.append("kind", kind);
    const response = await fetch("/api/upload", { method: "POST", body: form });
    const data = await response.json();
    if (data.message) socketRef.current?.emit("chat:file", { sessionId: params.id, message: data.message });
    if (data.recording) setRecordingStatus("ready");
  }

  async function startRecording() {
    if (role !== "AGENT") return;
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      setRecordingStatus("processing");
      socketRef.current?.emit("recording:status", { sessionId: params.id, status: "processing" });
      await fetch("/api/recordings/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: params.id, status: "PROCESSING" }) });
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      await uploadFile(new File([blob], `atomquest-recording-${Date.now()}.webm`, { type: "video/webm" }), "recording");
      stream.getTracks().forEach((track) => track.stop());
      socketRef.current?.emit("recording:status", { sessionId: params.id, status: "ready" });
    };
    recorder.start();
    setRecordingStatus("recording");
    socketRef.current?.emit("recording:status", { sessionId: params.id, status: "recording" });
    await fetch("/api/recordings/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: params.id, status: "RECORDING" }) });
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function endCall() {
    if (role === "AGENT") {
      await fetch(`/api/sessions/${params.id}/end`, { method: "POST" });
      socketRef.current?.emit("session:end", { sessionId: params.id, name });
    }
    router.push(role === "AGENT" ? `/history/${params.id}` : "/");
  }

  if (error) return <main className="flex min-h-screen items-center justify-center text-red-700">{error}</main>;
  if (!lk) return <main className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing secure room...</main>;

  return (
    <main className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[1fr_380px]">
      <section className="flex min-h-[60vh] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3"><Video className="h-5 w-5 text-teal-300" /><div><h1 className="font-semibold">Live support room</h1><p className="text-xs text-slate-400">Media routed through self-hosted LiveKit</p></div></div>
          <div className="flex items-center gap-2">
            <Badge className="border-teal-400/40 bg-teal-400/10 text-teal-200"><Radio className="mr-1 h-3 w-3" />{recordingStatus}</Badge>
            {role === "AGENT" && recordingStatus !== "recording" ? <Button size="sm" onClick={startRecording}>Start recording</Button> : null}
            {role === "AGENT" && recordingStatus === "recording" ? <Button size="sm" variant="destructive" onClick={stopRecording}>Stop recording</Button> : null}
            <Button size="sm" variant={role === "AGENT" ? "destructive" : "outline"} onClick={endCall}><Square className="h-4 w-4" />{role === "AGENT" ? "End" : "Leave"}</Button>
          </div>
        </header>
        <div className="min-h-0 flex-1 bg-black">
          <LiveKitRoom token={lk.token} serverUrl={lk.url} connect audio video className="h-full">
            <VideoGrid />
            <RoomAudioRenderer />
            <ControlBar className="border-t border-white/10 bg-slate-950" />
          </LiveKitRoom>
        </div>
      </section>
      <aside className="flex min-h-[40vh] flex-col border-l border-white/10 bg-white text-slate-950">
        <div className="border-b p-4"><h2 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" />Session chat</h2><p className="mt-1 text-xs text-muted-foreground">{participants.length} participant records, reconnect grace enabled</p></div>
        <div className="border-b p-3">
          <div className="flex flex-wrap gap-2">{participants.map((p) => <Badge key={p.id} className="bg-muted">{p.name} - {p.state.toLowerCase()}</Badge>)}</div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : null}
          {messages.map((message) => <div key={message.id} className="rounded-lg border bg-slate-50 p-3"><div className="text-xs font-medium text-muted-foreground">{message.senderName} - {message.senderRole}</div>{message.type === "FILE" && message.file ? <a className="mt-1 block text-sm font-medium text-teal-700 underline" href={message.file.url} target="_blank">{message.file.fileName}</a> : <p className="mt-1 text-sm">{message.body}</p>}</div>)}
        </div>
        <form onSubmit={sendMessage} className="border-t p-3">
          <div className="mb-2 flex gap-2"><Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Type a message" /><Button size="icon"><Send className="h-4 w-4" /></Button></div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"><FileUp className="h-4 w-4" />Share file<input className="hidden" type="file" onChange={(event) => event.target.files?.[0] && uploadFile(event.target.files[0])} /></label>
        </form>
      </aside>
    </main>
  );
}

export default function CallPage() {
  return <Suspense><CallPageInner /></Suspense>;
}
