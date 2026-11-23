// Rules-based practitioner insight. Pure + deterministic + unit-tested.
//
// Every statement is tagged with its epistemic status:
//   observed  → directly counted from logs or quoted from the client
//   possible  → an inference linking observations; explicitly NOT confirmed
//   consider  → a suggested next step for the practitioner (never a prescription)
// The engine never produces clinical conclusions (no diagnoses, no nutrient claims).

import { type MealPattern, type WeeklyAnalysis, MIN_LOGS_FOR_PATTERN, TIMING_DRIFT_MIN } from "./adherence";
import { formatTime, minutesToTime, weekdayShort } from "./dates";
import { REASON_LABEL } from "./labels";
import type { Feedback, Reason } from "./types";

export interface Statement {
  text: string;
  evidence?: string;
}
export interface Insight {
  observed: Statement[];
  possible: Statement[];
  consider: Statement[];
  basis: string;
  sufficient: boolean;
}

const WORK_REASONS: Reason[] = ["no_time", "at_work"];
const WORK_WORDS = /\b(work|office|meeting|time|busy|desk)\b/i;

const pct = (n: number, d: number) => `${n} of ${d}`;

function topReason(m: MealPattern): [Reason, number] | null {
  const entries = Object.entries(m.reasons) as [Reason, number][];
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0];
}

function workRelated(m: MealPattern): number {
  return WORK_REASONS.reduce((s, r) => s + (m.reasons[r] ?? 0), 0);
}

export function generateInsight(a: WeeklyAnalysis, feedback: Feedback[]): Insight {
  const observed: Statement[] = [];
  const possible: Statement[] = [];
  const consider: Statement[] = [];
  const { logged, planned } = a.totals;
  const basis = `Based on ${logged} logged of ${planned} planned meals over the last ${a.days.length} days.`;

  if (logged < 6) {
    return {
      observed: [{ text: `Only ${logged} meals logged in the last ${a.days.length} days. That’s not enough to identify patterns.` }],
      possible: [],
      consider: [{ text: "Check in with the client about logging before drawing conclusions about adherence." }],
      basis,
      sufficient: false,
    };
  }

  const problem: MealPattern[] = [];

  for (const m of a.perMeal) {
    const c = m.counts;
    const label = m.item.label;
    if (c.logged < MIN_LOGS_FOR_PATTERN) {
      observed.push({ text: `${label}: too few logs (${c.logged}) to judge.` });
      continue;
    }
    const missed = c.skipped + c.substituted;
    if (c.followed / c.logged >= 0.75) {
      observed.push({ text: `${label} followed consistently: ${pct(c.followed, c.logged)} logged days.` });
    } else if (missed / c.logged >= 0.5) {
      problem.push(m);
      const parts: string[] = [];
      if (c.substituted) parts.push(`swapped ${c.substituted}×`);
      if (c.skipped) parts.push(`skipped ${c.skipped}×`);
      if (c.partial) parts.push(`partly followed ${c.partial}×`);
      const wd = m.weekday.skipped + m.weekday.substituted;
      const onWeekdays = wd === missed && m.weekend.logged > 0 ? " All on weekdays." : wd > 0 && wd >= missed * 0.75 ? ` ${wd} of ${missed} on weekdays.` : "";
      const tr = topReason(m);
      observed.push({
        text: `${label} ${parts.join(", ")} out of ${c.logged} logged days.${onWeekdays}`,
        evidence: [
          tr ? `Most common reason: "${REASON_LABEL[tr[0]]}" (${tr[1]}×)` : null,
          m.substitutes.length ? `Swaps: ${[...new Set(m.substitutes)].slice(0, 3).join("; ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      });
    } else {
      observed.push({ text: `${label} mixed: followed ${pct(c.followed, c.logged)}, partial ${c.partial}, swapped ${c.substituted}, skipped ${c.skipped}.` });
    }

    if (m.avgDeviationMin != null && Math.abs(m.avgDeviationMin) >= TIMING_DRIFT_MIN && m.timeRange) {
      observed.push({
        text: `${label} eaten on average ${Math.round(Math.abs(m.avgDeviationMin))} min ${m.avgDeviationMin > 0 ? "later" : "earlier"} than the planned ${formatTime(m.item.planned_time)}.`,
        evidence: `Range ${formatTime(minutesToTime(m.timeRange[0]))} – ${formatTime(minutesToTime(m.timeRange[1]))}`,
      });
    }
  }

  const hungerMeals = a.perMeal.filter((m) => m.lowHunger > 0);
  const hungerTotal = hungerMeals.reduce((s, m) => s + m.lowHunger, 0);
  if (hungerTotal >= 2) {
    observed.push({
      text: `Client reported feeling very hungry / still hungry ${hungerTotal} times.`,
      evidence: hungerMeals.map((m) => `${m.item.label}: ${m.lowHunger}×`).join(" · "),
    });
  }

  if (a.totals.notLogged > 0) {
    observed.push({
      text: `${a.totals.notLogged} planned meals were not logged${a.daysWithNoLogs.length ? ` (no logs at all on ${a.daysWithNoLogs.map(weekdayShort).join(", ")})` : ""}. These are treated as missing data, not as skipped.`,
    });
  }

  const relevantFeedback = feedback.filter((f) => f.status !== "resolved");
  for (const f of relevantFeedback.slice(0, 3)) {
    observed.push({ text: `Client said: “${f.message}”` });
  }

  // ── Possible explanations (inferences — always flagged) ──
  const workProblems = problem.filter((m) => {
    const missed = m.counts.skipped + m.counts.substituted;
    return workRelated(m) >= Math.ceil(missed / 2) || m.weekday.skipped + m.weekday.substituted >= missed * 0.75;
  });
  const feedbackMentionsWork = relevantFeedback.some((f) => WORK_WORDS.test(f.message));
  if (workProblems.length) {
    possible.push({
      text: `${workProblems.map((m) => m.item.label).join(" and ")} difficulties may be linked to workday time constraints.`,
      evidence: `Supported by: logged reasons (${workProblems.map((m) => `${workRelated(m)} work/time-related for ${m.item.label.toLowerCase()}`).join(", ")})${feedbackMentionsWork ? " and the client's own feedback" : ""}. Not confirmed with client.`,
    });
  }
  const snack = a.perMeal.find((m) => m.item.meal_type === "snack");
  if (snack && problem.includes(snack) && hungerTotal >= 2) {
    possible.push({
      text: "Missed afternoon snacks may be contributing to the hunger the client reports later in the day.",
      evidence: "Co-occurrence only; causation not established.",
    });
  }
  const lateMeal = [...a.perMeal]
    .filter((m) => (m.avgDeviationMin ?? 0) >= TIMING_DRIFT_MIN)
    .sort((x, y) => (y.avgDeviationMin ?? 0) - (x.avgDeviationMin ?? 0))[0];
  if (lateMeal) {
    possible.push({
      text: `The planned ${lateMeal.item.label.toLowerCase()} time (${formatTime(lateMeal.item.planned_time)}) may not fit the client's current routine.`,
      evidence: "Based on recorded meal times only.",
    });
  }

  // ── Suggested considerations ──
  if (snack && problem.includes(snack)) {
    consider.push({ text: "Review snack options for portability and zero preparation (e.g. options that can be kept at a desk)." });
  }
  const lunch = a.perMeal.find((m) => m.item.meal_type === "lunch");
  if (lunch && problem.includes(lunch)) {
    consider.push({ text: "Discuss realistic workday lunch options, including guidance for choosing from what is available at the office." });
  }
  if (lateMeal) consider.push({ text: `Consider aligning the planned ${lateMeal.item.label.toLowerCase()} time with the client's actual routine.` });
  if (a.totals.notLogged > 0) consider.push({ text: "Confirm unlogged days with the client before treating them as non-adherence." });
  if (relevantFeedback.some((f) => f.status === "open")) consider.push({ text: "Respond to the client's open message so they know it was heard." });
  if (!problem.length && !lateMeal) consider.push({ text: "No recurring issues detected. Positive reinforcement may be appropriate." });

  return { observed, possible, consider, basis, sufficient: true };
}
