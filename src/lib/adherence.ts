// Adherence engine — pure functions, no I/O. Unit-tested in adherence.test.ts.
//
// Principles (see README → "Adherence calculation"):
// 1. Missing data ≠ non-adherence. A planned meal with no log is "not_logged" and is
//    excluded from the adherence score; it is reported separately as logging coverage.
// 2. Score = weighted mean over LOGGED meals only:
//      followed 1 · partial 0.5 · substituted 0.5 · skipped 0
//    A substitution still means the client ate; we can't judge its nutritional fit, so
//    it counts half and is always surfaced explicitly rather than hidden in the score.
// 3. Today is never part of the weekly window (the day isn't over); it's shown live.
// 4. A number is never shown alone: every score carries "based on X of Y logged".

import { isWeekend, lastNDays, timeToMinutes } from "./dates";
import type { ClientBundle, LogStatus, MealLog, PlanItem, Reason, SlotState } from "./types";

export const STATUS_WEIGHT: Record<LogStatus, number> = {
  followed: 1,
  partial: 0.5,
  substituted: 0.5,
  skipped: 0,
};

/** A planned meal becomes "due" (ready to log) this many minutes before its time. */
export const DUE_LEAD_MIN = 30;
export const WINDOW_DAYS = 7;

export interface Cell {
  date: string;
  item: PlanItem;
  state: SlotState;
  log?: MealLog;
}

export interface Counts {
  planned: number; // past planned slots
  logged: number;
  followed: number;
  partial: number;
  substituted: number;
  skipped: number;
  notLogged: number;
}

export const emptyCounts = (): Counts => ({
  planned: 0,
  logged: 0,
  followed: 0,
  partial: 0,
  substituted: 0,
  skipped: 0,
  notLogged: 0,
});

export function logKey(planItemId: string, date: string) {
  return `${planItemId}|${date}`;
}

export function indexLogs(logs: MealLog[]): Map<string, MealLog> {
  return new Map(logs.map((l) => [logKey(l.plan_item_id, l.log_date), l]));
}

export function slotState(
  item: PlanItem,
  date: string,
  log: MealLog | undefined,
  today: string,
  nowMin: number,
): SlotState {
  if (log) return log.status;
  if (date < today) return "not_logged";
  if (date > today) return "upcoming";
  return nowMin >= timeToMinutes(item.planned_time) - DUE_LEAD_MIN ? "due" : "upcoming";
}

/** Count only cells that are "in the past" (logged or not_logged). */
export function countCells(cells: Cell[]): Counts {
  const c = emptyCounts();
  for (const cell of cells) {
    if (cell.state === "upcoming" || cell.state === "due") continue;
    c.planned++;
    if (cell.state === "not_logged") {
      c.notLogged++;
      continue;
    }
    c.logged++;
    c[cell.state]++;
  }
  return c;
}

export function adherenceScore(c: Counts): number | null {
  if (c.logged === 0) return null;
  const sum = c.followed * 1 + c.partial * 0.5 + c.substituted * 0.5;
  return sum / c.logged;
}

export function loggingCoverage(c: Counts): number | null {
  return c.planned === 0 ? null : c.logged / c.planned;
}

export function sortedPlan(plan: PlanItem[]) {
  return [...plan].sort((a, b) => a.sort_order - b.sort_order);
}

// ───────────────────────────── Weekly analysis ─────────────────────────────

export interface MealPattern {
  item: PlanItem;
  cells: Cell[];
  counts: Counts;
  score: number | null;
  weekday: Counts;
  weekend: Counts;
  reasons: Partial<Record<Reason, number>>;
  lowHunger: number; // logs with hunger ≤ 2
  substitutes: string[];
  /** Mean (actual − planned) minutes over logs that recorded a time. */
  avgDeviationMin: number | null;
  timeRange: [number, number] | null; // minutes
}

export interface DaySummary {
  date: string;
  counts: Counts;
  score: number | null;
}

export interface WeeklyAnalysis {
  days: string[];
  perMeal: MealPattern[];
  perDay: DaySummary[];
  totals: Counts;
  score: number | null;
  coverage: number | null;
  daysWithNoLogs: string[];
  lastLogDate: string | null;
  trend: { earlier: number | null; recent: number | null };
}

export function analyseWeek(bundle: ClientBundle, today: string, windowDays = WINDOW_DAYS): WeeklyAnalysis {
  const days = lastNDays(today, windowDays);
  const plan = sortedPlan(bundle.plan);
  const idx = indexLogs(bundle.logs);

  const perMeal: MealPattern[] = plan.map((item) => {
    const cells: Cell[] = days.map((date) => {
      const log = idx.get(logKey(item.id, date));
      return { date, item, log, state: slotState(item, date, log, today, 0) };
    });
    const logs = cells.flatMap((c) => (c.log ? [c.log] : []));
    const reasons: Partial<Record<Reason, number>> = {};
    for (const l of logs) if (l.reason && l.status !== "followed") reasons[l.reason] = (reasons[l.reason] ?? 0) + 1;

    const deviations = logs
      .filter((l) => l.actual_time && l.status !== "skipped")
      .map((l) => timeToMinutes(l.actual_time!) - timeToMinutes(item.planned_time));
    const times = logs
      .filter((l) => l.actual_time && l.status !== "skipped")
      .map((l) => timeToMinutes(l.actual_time!));

    const counts = countCells(cells);
    return {
      item,
      cells,
      counts,
      score: adherenceScore(counts),
      weekday: countCells(cells.filter((c) => !isWeekend(c.date))),
      weekend: countCells(cells.filter((c) => isWeekend(c.date))),
      reasons,
      lowHunger: logs.filter((l) => l.hunger != null && l.hunger <= 2).length,
      substitutes: logs.filter((l) => l.status === "substituted" && l.substitute_text).map((l) => l.substitute_text!),
      avgDeviationMin: deviations.length ? deviations.reduce((a, b) => a + b, 0) / deviations.length : null,
      timeRange: times.length ? [Math.min(...times), Math.max(...times)] : null,
    };
  });

  const allCells = perMeal.flatMap((m) => m.cells);
  const perDay: DaySummary[] = days.map((date) => {
    const counts = countCells(allCells.filter((c) => c.date === date));
    return { date, counts, score: adherenceScore(counts) };
  });
  const totals = countCells(allCells);

  const half = Math.floor(days.length / 2);
  const earlier = countCells(allCells.filter((c) => days.indexOf(c.date) < half));
  const recent = countCells(allCells.filter((c) => days.indexOf(c.date) >= half));

  const loggedDates = bundle.logs.map((l) => l.log_date).filter((d) => d <= today).sort();

  return {
    days,
    perMeal,
    perDay,
    totals,
    score: adherenceScore(totals),
    coverage: loggingCoverage(totals),
    daysWithNoLogs: perDay.filter((d) => d.counts.logged === 0).map((d) => d.date),
    lastLogDate: loggedDates.length ? loggedDates[loggedDates.length - 1] : null,
    trend: { earlier: adherenceScore(earlier), recent: adherenceScore(recent) },
  };
}

// ───────────────────────────── Today (client view) ─────────────────────────────

export function todayCells(bundle: ClientBundle, today: string, nowMin: number): Cell[] {
  const idx = indexLogs(bundle.logs);
  return sortedPlan(bundle.plan).map((item) => {
    const log = idx.get(logKey(item.id, today));
    return { date: today, item, log, state: slotState(item, today, log, today, nowMin) };
  });
}

/** Consecutive days (ending yesterday or today) with at least one log. Rewards logging, not compliance. */
export function loggingStreak(logs: MealLog[], today: string): number {
  const dates = new Set(logs.map((l) => l.log_date));
  let streak = dates.has(today) ? 1 : 0;
  const d = new Date(today + "T00:00:00");
  for (;;) {
    d.setDate(d.getDate() - 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dates.has(iso)) break;
    streak++;
  }
  return streak;
}

// ───────────────────────────── Attention signals ─────────────────────────────

export type Severity = "high" | "medium" | "low";
export interface Signal {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

const SEVERITY_POINTS: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
export const MIN_LOGS_FOR_PATTERN = 3;
/** Mean deviation from planned time that counts as a timing pattern. */
export const TIMING_DRIFT_MIN = 60;

/**
 * Rules that decide whether a practitioner should look at this client.
 * Each rule is evidence-based and explains itself, so the dashboard can show WHY.
 */
export function attentionSignals(a: WeeklyAnalysis, bundle: ClientBundle): Signal[] {
  const out: Signal[] = [];

  for (const m of a.perMeal) {
    const { logged, skipped, substituted } = m.counts;
    if (logged < MIN_LOGS_FOR_PATTERN) continue;
    const label = m.item.label;
    if (skipped / logged >= 0.5) {
      out.push({
        id: `skip-${m.item.meal_type}`,
        severity: skipped >= 4 ? "high" : "medium",
        title: `${label} skipped on ${skipped} of ${logged} logged days`,
        detail: "Recurring pattern over the last 7 days.",
      });
    } else if (substituted / logged >= 0.5) {
      out.push({
        id: `sub-${m.item.meal_type}`,
        severity: "medium",
        title: `${label} swapped on ${substituted} of ${logged} logged days`,
        detail: m.substitutes.length ? `e.g. ${m.substitutes.slice(0, 2).join(", ")}` : "Substitutions recurring.",
      });
    }
    if (m.avgDeviationMin != null && Math.abs(m.avgDeviationMin) >= TIMING_DRIFT_MIN) {
      out.push({
        id: `time-${m.item.meal_type}`,
        severity: "low",
        title: `${label} eaten ~${Math.round(Math.abs(m.avgDeviationMin))} min ${m.avgDeviationMin > 0 ? "later" : "earlier"} than planned`,
        detail: "Planned timing may not match the client's routine.",
      });
    }
  }

  const lowHunger = a.perMeal.reduce((s, m) => s + m.lowHunger, 0);
  if (lowHunger >= 2) {
    out.push({
      id: "hunger",
      severity: "medium",
      title: `Hunger reported on ${lowHunger} occasions`,
      detail: "Client rated themselves 'very hungry' or 'still hungry'.",
    });
  }

  const open = bundle.feedback.filter((f) => f.status === "open");
  if (open.length) {
    out.push({
      id: "feedback",
      severity: "high",
      title: `${open.length} unanswered message${open.length > 1 ? "s" : ""} from client`,
      detail: `"${open[0].message.slice(0, 80)}${open[0].message.length > 80 ? "…" : ""}"`,
    });
  }

  if (a.lastLogDate == null || a.lastLogDate < a.days[a.days.length - 2]) {
    out.push({
      id: "silent",
      severity: "high",
      title: a.lastLogDate ? "No meals logged in the last 2+ days" : "Client has not logged any meals",
      detail: "Missing data. Check in before assuming non-adherence.",
    });
  } else if (a.coverage != null && a.coverage < 0.8) {
    out.push({
      id: "coverage",
      severity: "low",
      title: `${a.totals.notLogged} planned meals not logged`,
      detail: `${a.daysWithNoLogs.length ? `${a.daysWithNoLogs.length} day(s) with no logs at all. ` : ""}Treated as missing data, not as skipped.`,
    });
  }

  const reviewed = bundle.client.last_reviewed_at?.slice(0, 10);
  if (!reviewed || reviewed < a.days[0]) {
    out.push({
      id: "review",
      severity: "low",
      title: reviewed ? "Not reviewed in the last 7 days" : "Adherence not yet reviewed",
      detail: "",
    });
  }

  const order: Severity[] = ["high", "medium", "low"];
  return out.sort((x, y) => order.indexOf(x.severity) - order.indexOf(y.severity));
}

export function attentionScore(signals: Signal[]): number {
  return signals.reduce((s, x) => s + SEVERITY_POINTS[x.severity], 0);
}
