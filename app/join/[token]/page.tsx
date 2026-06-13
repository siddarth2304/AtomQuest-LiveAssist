"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CustomerJoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [name, setName] = useState("Customer");
  const [session, setSession] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invites/${params.token}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error);
        return response.json();
      })
      .then((data) => setSession(data.session))
      .catch((err) => setError(err.message || "Invite unavailable"))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validating invite...</main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#e0f2fe)] px-4">
      <section className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-xl">
        {error ? (
          <><h1 className="text-2xl font-semibold">Invite unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p></>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{session?.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your display name to join the secure support room.</p>
            <label className="mt-6 block text-sm font-medium">Name</label>
            <Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} />
            <Button className="mt-6 w-full" onClick={() => router.push(`/call/${session?.id}?role=CUSTOMER&token=${params.token}&name=${encodeURIComponent(name)}`)}>
              <LogIn className="h-4 w-4" />Join support call
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
