// Date helpers that work on local calendar dates as "YYYY-MM-DD" strings.
// Using strings (not Date objects) avoids timezone drift between client,
// practitioner and Postgres `date` columns.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Inclusive list of `count` days ending the day BEFORE `today` (completed days only). */
export function lastNDays(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - count));
}

export function isWeekend(iso: string): boolean {
  const dow = parseISODate(iso).getDay();
  return dow === 0 || dow === 6;
}

export function weekdayShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", { weekday: "short" });
}

export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "13:00:00" → 780 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "13:00:00" → "1:00 PM" */
export function formatTime(t: string): string {
  const min = timeToMinutes(t);
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / 86_400_000);
}

export function relativeTime(iso: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
