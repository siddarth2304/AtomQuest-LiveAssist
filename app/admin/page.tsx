"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, MessageSquare, Users, Video } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSession } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState<DashboardSession[]>([]);

  async function load() {
    const [metricsResponse, sessionsResponse] = await Promise.all([fetch("/api/metrics"), fetch("/api/sessions")]);
    if (metricsResponse.ok) setMetrics(await metricsResponse.json());
    if (sessionsResponse.ok) setSessions((await sessionsResponse.json()).sessions);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const cards = [
    ["Active sessions", metrics.activeSessions || 0, Video],
    ["Participants", metrics.connectedParticipants || 0, Users],
    ["Total sessions", metrics.totalSessions || 0, Activity],
    ["Messages", metrics.totalMessages || 0, MessageSquare]
  ] as const;

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Admin dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">{cards.map(([label, value, Icon]) => <Card key={label} className="p-4"><Icon className="h-5 w-5 text-teal-700" /><div className="mt-4 text-2xl font-semibold">{value}</div><div className="text-sm text-muted-foreground">{label}</div></Card>)}</div>
      <Card className="mt-6 p-4"><h2 className="font-semibold">Sessions and event logs</h2><div className="mt-4 space-y-3">{sessions.map((session) => <Link key={session.id} href={`/history/${session.id}`} className="block rounded-lg border p-4 hover:bg-muted/40"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium">{session.title}</div><div className="text-xs text-muted-foreground">{session.participants.length} participants | {formatDuration(session.startedAt || session.createdAt, session.endedAt)}</div></div><Badge>{session.status}</Badge></div><div className="mt-3 flex flex-wrap gap-2">{session.events.slice(0, 4).map((event) => <span key={event.id} className="rounded-full bg-muted px-2 py-1 text-xs">{event.type}</span>)}</div></Link>)}</div></Card>
    </AppShell>
  );
}
