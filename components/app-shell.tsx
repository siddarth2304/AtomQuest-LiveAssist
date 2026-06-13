import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <RadioTower className="h-5 w-5" />
            </span>
            <span>AtomQuest Support</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/admin" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
              Admin
            </Link>
            <form action="/api/auth/logout" method="post">
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </main>
  );
}
