"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, PhoneCall, Plus, Square, Timer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { DashboardSession } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [title, setTitle] = useState("Priority customer support");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const response = await fetch("/api/sessions");
    if (response.status === 401) {
      window.location.href = "/";
      return;
    }
    const data = await response.json();
    setSessions(data.sessions);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  async function createSession() {
    setCreating(true);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    setCreating(false);
    const data = await response.json();
    setSessions((current) => [data.session, ...current]);
  }

  async function endSession(id: string) {
    await fetch(`/api/sessions/${id}/end`, { method: "POST" });
    await load();
  }

  const active = useMemo(() => sessions.filter((session) => session.status !== "ENDED"), [sessions]);
  const history = useMemo(() => sessions.filter((session) => session.status === "ENDED"), [sessions]);

  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-[1fr_0.7fr]">
        <section>
          <h1 className="text-3xl font-semibold">Agent dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create invite-only customer sessions and monitor active calls.</p>
        </section>
        <Card className="p-4">
          <div className="flex gap-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            <Button onClick={createSession} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </Card>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Live sessions</h2>
        {loading ? <p className="text-sm text-muted-foreground">Loading sessions...</p> : null}
        {!loading && active.length === 0 ? <EmptyState title="No live sessions" body="Create a session to generate a customer invite link." /> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((session) => {
            const invite = `${appUrl}/join/${session.inviteToken}`;
            return (
              <Card key={session.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{session.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={session.status === "ACTIVE" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"}>{session.status}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="h-3.5 w-3.5" />
                        {formatDuration(session.startedAt || session.createdAt, session.endedAt)}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(invite)} title="Copy invite">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 break-all rounded-md bg-muted p-3 text-xs text-muted-foreground">{invite}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/call/${session.id}?role=AGENT`}><Button size="sm"><PhoneCall className="h-4 w-4" />Join call</Button></Link>
                  <Button size="sm" variant="destructive" onClick={() => endSession(session.id)}><Square className="h-4 w-4" />End</Button>
                  <Link href={`/history/${session.id}`} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Details</Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">History</h2>
        {history.length === 0 ? <EmptyState title="No completed sessions" body="Ended sessions will appear here with chat, files, recordings, and event logs." /> : null}
        <div className="grid gap-3">
          {history.map((session) => (
            <Link key={session.id} href={`/history/${session.id}`} className="rounded-lg border bg-white p-4 hover:bg-muted/40">
              <div className="flex items-center justify-between">
                <span className="font-medium">{session.title}</span>
                <span className="text-sm text-muted-foreground">{formatDuration(session.startedAt || session.createdAt, session.endedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
