import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: session });
}
