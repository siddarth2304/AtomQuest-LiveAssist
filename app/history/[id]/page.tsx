"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DashboardSession } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export default function HistoryPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<DashboardSession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/sessions/${params.id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load session");
        return response.json();
      })
      .then((data) => setSession(data.session))
      .catch((err) => setError(err.message));
  }, [params.id]);

  return (
    <AppShell>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {!session ? <p className="text-sm text-muted-foreground">Loading session...</p> : (
        <div className="space-y-6">
          <section className="flex flex-wrap items-start justify-between gap-4">
            <div><h1 className="text-3xl font-semibold">{session.title}</h1><p className="mt-1 text-sm text-muted-foreground">Duration {formatDuration(session.startedAt || session.createdAt, session.endedAt)}</p></div>
            <Badge className="bg-muted">{session.status}</Badge>
          </section>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-4"><h2 className="font-semibold">Participants</h2><div className="mt-3 space-y-3">{session.participants.map((p) => <div key={p.id} className="rounded-md bg-muted p-3 text-sm"><div className="font-medium">{p.name} ({p.role})</div><div className="text-xs text-muted-foreground">{p.state} | joined {p.joinedAt ? new Date(p.joinedAt).toLocaleString() : "n/a"} | left {p.leftAt ? new Date(p.leftAt).toLocaleString() : "n/a"}</div></div>)}</div></Card>
            <Card className="p-4"><h2 className="font-semibold">Files</h2><div className="mt-3 space-y-2">{session.files.length === 0 ? <p className="text-sm text-muted-foreground">No shared files.</p> : session.files.map((file) => <a key={file.id} href={file.url} target="_blank" className="block rounded-md bg-muted p-3 text-sm text-teal-700 underline">{file.fileName}</a>)}</div></Card>
            <Card className="p-4"><h2 className="font-semibold">Recordings</h2><div className="mt-3 space-y-2">{session.recordings.length === 0 ? <p className="text-sm text-muted-foreground">No recordings.</p> : session.recordings.map((recording) => <div key={recording.id} className="rounded-md bg-muted p-3 text-sm"><Badge>{recording.status}</Badge>{recording.url ? <a className="mt-2 block text-teal-700 underline" href={recording.url} target="_blank">{recording.fileName || "Recording"}</a> : null}</div>)}</div></Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4"><h2 className="font-semibold">Chat history</h2><div className="mt-3 max-h-[480px] space-y-3 overflow-y-auto">{session.messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages.</p> : session.messages.map((m) => <div key={m.id} className="rounded-md border bg-white p-3 text-sm"><div className="text-xs font-medium text-muted-foreground">{m.senderName} - {m.senderRole} - {new Date(m.createdAt).toLocaleTimeString()}</div>{m.type === "FILE" && m.file ? <a href={m.file.url} target="_blank" className="text-teal-700 underline">{m.file.fileName}</a> : <p>{m.body}</p>}</div>)}</div></Card>
            <Card className="p-4"><h2 className="font-semibold">Event logs</h2><div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">{session.events.map((event) => <div key={event.id} className="rounded-md bg-muted p-3 text-sm"><div className="font-medium">{event.type}</div><div className="text-xs text-muted-foreground">{event.actorName || "system"} - {new Date(event.createdAt).toLocaleString()}</div></div>)}</div></Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
