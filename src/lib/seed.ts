// Deterministic demo data for Ananya Rao, generated RELATIVE to "today" so the
// 7-day history never goes stale. Patterns follow the assessment brief:
//  - breakfast generally followed
//  - lunch frequently substituted on workdays (work commitments)
//  - afternoon snack frequently missed on workdays
//  - dinner timing varies
//  - hunger reported on some afternoons
//  - one full day with no logs + one unlogged dinner (logging gaps ≠ skipped)
// Weekday vs weekend behaviour is keyed to the real calendar day.

import { addDays, isWeekend } from "./dates";
import type { Client, Feedback, MealLog, PlanItem, PractitionerAction } from "./types";

export const DEMO_CLIENT_ID = "ananya";
export const PRACTITIONER_NAME = "Dr. Meera Iyer";

const P = (meal: string) => `${DEMO_CLIENT_ID}-${meal}`;

export function seedPlan(): PlanItem[] {
  return [
    {
      id: P("breakfast"),
      client_id: DEMO_CLIENT_ID,
      meal_type: "breakfast",
      label: "Breakfast",
      planned_time: "08:00",
      title: "High-protein breakfast",
      description: "2 moong dal chillas with paneer filling + 1 bowl curd",
      sort_order: 1,
    },
    {
      id: P("lunch"),
      client_id: DEMO_CLIENT_ID,
      meal_type: "lunch",
      label: "Lunch",
      planned_time: "13:00",
      title: "Balanced home-style meal",
      description: "2 rotis, dal, seasonal sabzi, salad and curd",
      sort_order: 2,
    },
    {
      id: P("snack"),
      client_id: DEMO_CLIENT_ID,
      meal_type: "snack",
      label: "Afternoon snack",
      planned_time: "16:30",
      title: "Protein-rich snack",
      description: "Roasted chana chaat with cucumber and lemon",
      sort_order: 3,
    },
    {
      id: P("dinner"),
      client_id: DEMO_CLIENT_ID,
      meal_type: "dinner",
      label: "Dinner",
      planned_time: "20:00",
      title: "Balanced dinner",
      description: "Vegetable khichdi with paneer tikka and a side salad",
      sort_order: 4,
    },
  ];
}

export function seedClient(today: string): Client {
  return {
    id: DEMO_CLIENT_ID,
    name: "Ananya Rao",
    age: 34,
    occupation: "Corporate professional",
    goal: "Improve metabolic health and build sustainable eating habits",
    programme_start: addDays(today, -9),
    programme_weeks: 4,
    needs_follow_up: false,
    follow_up_reason: null,
    last_reviewed_at: null,
    plan_review_status: "none",
  };
}

type LogSeed = Omit<MealLog, "id" | "client_id" | "logged_at" | "updated_at" | "plan_item_id" | "log_date"> & {
  meal: "breakfast" | "lunch" | "snack" | "dinner";
};

const base = { substitute_text: null, reason: null, hunger: null, prep_difficulty: null, actual_time: null, comment: null };

const LUNCH_SWAPS = [
  "Office canteen thali",
  "Sandwich and cold coffee from café",
  "Ordered biryani at desk",
  "Paneer wrap from canteen",
];
const DINNER_TIMES = ["21:30", "22:15", "20:45", "21:50", "22:00"];

function workday(k: number): LogSeed[] {
  return [
    k === 2
      ? { ...base, meal: "breakfast", status: "partial", actual_time: "08:40", hunger: 3, comment: "Running late, had only one chilla" }
      : { ...base, meal: "breakfast", status: "followed", actual_time: "08:05", hunger: 3, prep_difficulty: "easy" },
    k === 1
      ? { ...base, meal: "lunch", status: "followed", actual_time: "13:20", hunger: 3, comment: "WFH day, cooked at home" }
      : {
          ...base,
          meal: "lunch",
          status: "substituted",
          substitute_text: LUNCH_SWAPS[k % LUNCH_SWAPS.length],
          reason: k % 2 === 0 ? "at_work" : "no_time",
          prep_difficulty: "hard",
          actual_time: k % 2 === 0 ? "14:15" : "13:45",
          hunger: 3,
        },
    k === 3
      ? { ...base, meal: "snack", status: "partial", reason: "at_work", hunger: 2, comment: "Only had a handful of almonds" }
      : {
          ...base,
          meal: "snack",
          status: "skipped",
          reason: k % 2 === 0 ? "at_work" : "no_time",
          hunger: k % 2 === 0 ? 1 : 2,
          comment: k === 0 ? "Back-to-back meetings till 6" : null,
        },
    {
      ...base,
      meal: "dinner",
      status: k === 4 ? "partial" : "followed",
      actual_time: DINNER_TIMES[k % DINNER_TIMES.length],
      hunger: k % 2 === 0 ? 2 : 3,
      comment: k === 0 ? "Was starving by the time I got home" : null,
    },
  ];
}

function weekend(k: number): LogSeed[] {
  return [
    { ...base, meal: "breakfast", status: "followed", actual_time: "09:00", hunger: 3, prep_difficulty: "easy" },
    { ...base, meal: "lunch", status: "followed", actual_time: "13:30", hunger: 3, prep_difficulty: "ok" },
    k === 0
      ? { ...base, meal: "snack", status: "followed", actual_time: "16:45", hunger: 3, prep_difficulty: "easy" }
      : { ...base, meal: "snack", status: "skipped", reason: "social", hunger: 2, comment: "Family lunch ran late, skipped the snack" },
    { ...base, meal: "dinner", status: "followed", actual_time: "20:15", hunger: 4 },
  ];
}

/** Day offsets (relative to today) with deliberately incomplete logging. */
export const GAP_DAY_OFFSET = -3; // nothing logged at all
export const MISSING_DINNER_OFFSET = -5; // dinner not logged

function stamp(date: string, time: string | null): string {
  return new Date(`${date}T${time ?? "21:00"}:00`).toISOString();
}

export function seedLogs(today: string): MealLog[] {
  const logs: MealLog[] = [];
  let wk = 0;
  let we = 0;
  for (let offset = -7; offset <= -1; offset++) {
    const date = addDays(today, offset);
    const isWe = isWeekend(date);
    const dayLogs = isWe ? weekend(we++) : workday(wk++);
    if (offset === GAP_DAY_OFFSET) continue;
    for (const l of dayLogs) {
      if (offset === MISSING_DINNER_OFFSET && l.meal === "dinner") continue;
      const { meal, ...rest } = l;
      logs.push({
        ...rest,
        id: `seed-${date}-${meal}`,
        client_id: DEMO_CLIENT_ID,
        plan_item_id: P(meal),
        log_date: date,
        logged_at: stamp(date, l.actual_time),
        updated_at: stamp(date, l.actual_time),
      });
    }
  }
  // Today: breakfast already logged so the client app opens mid-day.
  logs.push({
    ...base,
    id: `seed-${today}-breakfast`,
    client_id: DEMO_CLIENT_ID,
    plan_item_id: P("breakfast"),
    log_date: today,
    status: "followed",
    actual_time: "08:10",
    hunger: 3,
    prep_difficulty: "easy",
    logged_at: stamp(today, "08:10"),
    updated_at: stamp(today, "08:10"),
  });
  return logs;
}

export function seedFeedback(today: string): Feedback[] {
  return [
    {
      id: "seed-fb-snack",
      client_id: DEMO_CLIENT_ID,
      plan_item_id: P("snack"),
      category: "timing",
      message: "I don’t have enough time to prepare or eat the planned afternoon meal when I’m at work.",
      status: "open",
      created_at: stamp(addDays(today, -2), "18:40"),
    },
    {
      id: "seed-fb-hunger",
      client_id: DEMO_CLIENT_ID,
      plan_item_id: null,
      category: "hunger",
      message: "Feeling really hungry around 5–6 PM on office days.",
      status: "open",
      created_at: stamp(addDays(today, -5), "19:10"),
    },
  ];
}

export function seedActions(today: string): PractitionerAction[] {
  return [
    {
      id: "seed-note-intake",
      client_id: DEMO_CLIENT_ID,
      type: "note",
      body: "Initial consult: vegetarian, prefers home-style Indian meals. Works 9:30–6:30 in office 4 days/week.",
      plan_item_id: null,
      feedback_id: null,
      visible_to_client: false,
      client_seen_at: null,
      author: PRACTITIONER_NAME,
      created_at: stamp(addDays(today, -9), "11:00"),
    },
  ];
}
