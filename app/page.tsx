"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("agent@atomquest.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (!response.ok) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_34%),linear-gradient(135deg,#f8fafc,#eef2f7)] lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex min-h-[42vh] items-end px-6 pb-10 lg:min-h-screen lg:px-12 lg:pb-16">
        <div className="max-w-2xl">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
            <Headphones className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-slate-950 md:text-6xl">AtomQuest Real-Time Support</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Demo-ready video support with owned SFU media routing, persistent chat, invite-only customer access, event logs, and recording upload.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-10">
        <form onSubmit={login} className="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl">
          <h2 className="text-2xl font-semibold">Agent login</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the seeded demo account to start a support session.</p>
          <label className="mt-6 block text-sm font-medium">Email</label>
          <Input className="mt-2" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          <label className="mt-4 block text-sm font-medium">Password</label>
          <Input className="mt-2" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <Button className="mt-6 w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Login
          </Button>
          <div className="mt-5 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Demo credentials: agent@atomquest.dev / password123
          </div>
        </form>
      </section>
    </main>
  );
}
