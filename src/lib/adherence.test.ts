import { describe, expect, it } from "vitest";
import {
  adherenceScore,
  analyseWeek,
  attentionSignals,
  countCells,
  loggingStreak,
  slotState,
  type Cell,
} from "./adherence";
import { addDays } from "./dates";
import { generateInsight } from "./insights";
import { GAP_DAY_OFFSET, seedActions, seedClient, seedFeedback, seedLogs, seedPlan } from "./seed";
import type { ClientBundle, MealLog } from "./types";

// 2026-11-23 is a Monday → the window is Mon 16 … Sun 22 (5 workdays + weekend).
const TODAY = "2026-11-23";

function bundle(overrides: Partial<ClientBundle> = {}): ClientBundle {
  return {
    client: seedClient(TODAY),
    plan: seedPlan(),
    logs: seedLogs(TODAY),
    feedback: seedFeedback(TODAY),
    actions: seedActions(TODAY),
    ...overrides,
  };
}

describe("slotState", () => {
  const item = seedPlan()[2]; // snack 16:30
  it("treats a past day with no log as not_logged, never skipped", () => {
    expect(slotState(item, "2026-11-20", undefined, TODAY, 0)).toBe("not_logged");
  });
  it("marks today's meals upcoming until 30 min before, then due", () => {
    expect(slotState(item, TODAY, undefined, TODAY, 15 * 60)).toBe("upcoming");
    expect(slotState(item, TODAY, undefined, TODAY, 16 * 60)).toBe("due");
  });
  it("uses the logged status when present", () => {
    const log = { status: "skipped" } as MealLog;
    expect(slotState(item, TODAY, log, TODAY, 0)).toBe("skipped");
  });
});

describe("adherenceScore", () => {
  const cell = (state: Cell["state"]) => ({ state }) as Cell;
  it("excludes not-logged meals from the denominator", () => {
    const c = countCells([cell("followed"), cell("skipped"), cell("not_logged"), cell("not_logged")]);
    expect(c.planned).toBe(4);
    expect(c.logged).toBe(2);
    expect(adherenceScore(c)).toBe(0.5);
  });
  it("weights partial and substituted at half", () => {
    expect(adherenceScore(countCells([cell("partial"), cell("substituted")]))).toBe(0.5);
  });
  it("returns null (not 0%) when nothing is logged", () => {
    expect(adherenceScore(countCells([cell("not_logged")]))).toBeNull();
  });
  it("ignores upcoming/due slots", () => {
    expect(countCells([cell("upcoming"), cell("due")]).planned).toBe(0);
  });
});

describe("analyseWeek on the Ananya scenario", () => {
  const a = analyseWeek(bundle(), TODAY);
  const meal = (t: string) => a.perMeal.find((m) => m.item.meal_type === t)!;

  it("covers the last 7 completed days, excluding today", () => {
    expect(a.days).toHaveLength(7);
    expect(a.days).not.toContain(TODAY);
    expect(a.days[6]).toBe(addDays(TODAY, -1));
  });
  it("has one day with no logs, reported as a gap", () => {
    expect(a.daysWithNoLogs).toEqual([addDays(TODAY, GAP_DAY_OFFSET)]);
    expect(a.totals.notLogged).toBe(5); // 4 on gap day + 1 missing dinner
  });
  it("finds breakfast consistent, lunch substituted, snack skipped", () => {
    expect(meal("breakfast").counts.followed).toBeGreaterThanOrEqual(5);
    expect(meal("lunch").counts.substituted).toBeGreaterThanOrEqual(3);
    expect(meal("snack").counts.skipped).toBeGreaterThanOrEqual(3);
  });
  it("detects dinner running late", () => {
    expect(meal("dinner").avgDeviationMin!).toBeGreaterThan(45);
  });
});

describe("attentionSignals", () => {
  it("flags open feedback and the missed snack", () => {
    const b = bundle();
    const s = attentionSignals(analyseWeek(b, TODAY), b);
    const ids = s.map((x) => x.id);
    expect(ids).toContain("feedback");
    expect(ids).toContain("skip-snack");
    expect(ids).toContain("review");
    expect(s[0].severity).toBe("high");
  });
  it("raises a silence signal when nothing is logged", () => {
    const b = bundle({ logs: [], feedback: [] });
    const ids = attentionSignals(analyseWeek(b, TODAY), b).map((x) => x.id);
    expect(ids).toContain("silent");
    expect(ids).not.toContain("skip-snack");
  });
});

describe("generateInsight", () => {
  it("separates observations from inferences and links issues to work", () => {
    const b = bundle();
    const i = generateInsight(analyseWeek(b, TODAY), b.feedback);
    expect(i.sufficient).toBe(true);
    expect(i.observed.some((s) => s.text.startsWith("Breakfast followed consistently"))).toBe(true);
    expect(i.possible.some((s) => /workday time constraints/.test(s.text))).toBe(true);
    expect(i.possible.every((s) => s.evidence)).toBe(true);
    expect(i.consider.some((s) => /portab/i.test(s.text))).toBe(true);
  });
  it("refuses to infer patterns from too little data", () => {
    const b = bundle({ logs: seedLogs(TODAY).slice(0, 3) });
    const i = generateInsight(analyseWeek(b, TODAY), []);
    expect(i.sufficient).toBe(false);
    expect(i.possible).toHaveLength(0);
  });
});

describe("loggingStreak", () => {
  it("counts consecutive logged days and breaks at a gap", () => {
    // gap day is today-3 → streak = today, -1, -2
    expect(loggingStreak(seedLogs(TODAY), TODAY)).toBe(3);
  });
});
