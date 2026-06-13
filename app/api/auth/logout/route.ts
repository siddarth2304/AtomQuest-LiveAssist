import { NextResponse } from "next/server";
import { authCookieName } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.redirect(new URL("/", process.env.APP_URL || "http://localhost:3000"));
  response.cookies.set(authCookieName, "", { path: "/", maxAge: 0 });
  return response;
}
