import type { EventCategory } from "./constants";

export type EventStatus = "DRAFT" | "PUBLISHED";

export type ScheduleEvent = {
  id: number;
  title: string;
  category: EventCategory;
  dept: string;
  startDate: string;
  endDate: string;
  location: string | null;
  contact: string | null;
  description: string | null;
  status: EventStatus;
  createdById?: string | null;
  createdByName?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function toDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isDateInRange(
  target: string,
  start: string,
  end: string
): boolean {
  const t = toDateKey(target);
  const s = toDateKey(start);
  const e = toDateKey(end);
  return t >= s && t <= e;
}

export function formatPeriod(start: string, end: string): string {
  const s = toDateKey(start).slice(5);
  const e = toDateKey(end).slice(5);
  return s === e ? s : `${s} ~ ${e}`;
}
