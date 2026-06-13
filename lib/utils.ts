import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(start?: string | Date | null, end?: string | Date | null) {
  if (!start) return "0m";
  const started = new Date(start).getTime();
  const ended = end ? new Date(end).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.floor((ended - started) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function absoluteUrl(path: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return `${appUrl}${path}`;
}
