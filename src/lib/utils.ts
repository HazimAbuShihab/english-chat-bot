import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format seconds as m:ss. */
export function formatDuration(totalSeconds?: number | null): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return "0:00";
  const s = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Human-readable byte size. */
export function formatBytes(bytes?: number | null): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Initials from a name, for avatars. */
export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Round a numeric score for display, tolerating null. */
export function displayScore(score?: number | null, fallback = "—"): string {
  if (score == null) return fallback;
  return Number(score).toFixed(score % 1 === 0 ? 0 : 1);
}

/** Format an ISO timestamp for a <input type="datetime-local"> (local time). */
export function toLocalInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** Convert a datetime-local input value back to an ISO string (UTC). */
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** A datetime-local default `days` days from now, at the current time. */
export function defaultDeadlineInput(days: number): string {
  return toLocalInputValue(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString());
}

/** True if the ISO timestamp is in the past. */
export function isExpired(iso?: string | null): boolean {
  return !!iso && new Date(iso).getTime() < Date.now();
}
