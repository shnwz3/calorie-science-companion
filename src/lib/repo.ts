// Data-access layer. The only module that talks to Supabase.
// UI components call these functions; swapping the backend means changing this file only.

import { addDays } from "./dates";
import { DEMO_CLIENT_ID, PRACTITIONER_NAME, seedActions, seedClient, seedFeedback, seedLogs, seedPlan } from "./seed";
import { supabase } from "./supabase";
import type {
  ActionType,
  Client,
  ClientBundle,
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  MealLog,
  MealLogInput,
  PractitionerAction,
} from "./types";

/** How much history the UI loads. 14 days covers the 7-day window + context. */
export const HISTORY_DAYS = 14;

export class SetupError extends Error {}

function check<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    // 42P01 / PGRST205: table missing → schema.sql hasn't been run
    if (res.error.code === "42P01" || res.error.code === "PGRST205" || /does not exist|schema cache/i.test(res.error.message)) {
      throw new SetupError("Database tables not found. Run supabase/schema.sql in the Supabase SQL editor.");
    }
    throw new Error(res.error.message);
  }
  return res.data as T;
}

const trimTime = <T extends { actual_time?: string | null; planned_time?: string }>(r: T): T => ({
  ...r,
  ...(r.actual_time ? { actual_time: r.actual_time.slice(0, 5) } : {}),
  ...(r.planned_time ? { planned_time: r.planned_time.slice(0, 5) } : {}),
});

export async function fetchBundle(clientId: string, today: string): Promise<ClientBundle | null> {
  const db = supabase();
  const from = addDays(today, -HISTORY_DAYS);
  const [c, p, l, f, a] = await Promise.all([
    db.from("clients").select("*").eq("id", clientId).maybeSingle(),
    db.from("meal_plan_items").select("*").eq("client_id", clientId).order("sort_order"),
    db.from("meal_logs").select("*").eq("client_id", clientId).gte("log_date", from).order("log_date"),
    db.from("client_feedback").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    db.from("practitioner_actions").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
  ]);
  const client = check(c) as Client | null;
  if (!client) return null;
  return {
    client,
    plan: check(p).map(trimTime),
    logs: (check(l) as MealLog[]).map(trimTime),
    feedback: check(f) as Feedback[],
    actions: check(a) as PractitionerAction[],
  };
}

// ───────────── Client-side mutations ─────────────

export async function saveMealLog(input: MealLogInput): Promise<void> {
  check(
    await supabase()
      .from("meal_logs")
      .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: "client_id,plan_item_id,log_date" }),
  );
}

export async function deleteMealLog(clientId: string, planItemId: string, date: string): Promise<void> {
  check(
    await supabase().from("meal_logs").delete().eq("client_id", clientId).eq("plan_item_id", planItemId).eq("log_date", date),
  );
}

export async function sendFeedback(input: {
  client_id: string;
  plan_item_id: string | null;
  category: FeedbackCategory;
  message: string;
}): Promise<void> {
  check(await supabase().from("client_feedback").insert(input));
}

export async function markActionsSeen(ids: string[]): Promise<void> {
  if (!ids.length) return;
  check(await supabase().from("practitioner_actions").update({ client_seen_at: new Date().toISOString() }).in("id", ids));
}

// ───────────── Practitioner-side mutations ─────────────

export async function addAction(input: {
  client_id: string;
  type: ActionType;
  body?: string | null;
  plan_item_id?: string | null;
  feedback_id?: string | null;
  visible_to_client?: boolean;
}): Promise<void> {
  check(await supabase().from("practitioner_actions").insert({ author: PRACTITIONER_NAME, ...input }));
}

export async function updateClient(id: string, patch: Partial<Client>): Promise<void> {
  check(await supabase().from("clients").update(patch).eq("id", id));
}

export async function setFeedbackStatus(ids: string[], status: FeedbackStatus): Promise<void> {
  if (!ids.length) return;
  check(await supabase().from("client_feedback").update({ status }).in("id", ids));
}

/** Composite practitioner actions — each writes an audit row + updates state. */
export const practitioner = {
  async flag(clientId: string, reason: string) {
    await updateClient(clientId, { needs_follow_up: true, follow_up_reason: reason });
    await addAction({ client_id: clientId, type: "flag", body: reason });
  },
  async unflag(clientId: string) {
    await updateClient(clientId, { needs_follow_up: false, follow_up_reason: null });
    await addAction({ client_id: clientId, type: "unflag", body: "Follow-up completed" });
  },
  async markReviewed(clientId: string, openFeedbackIds: string[]) {
    await updateClient(clientId, { last_reviewed_at: new Date().toISOString() });
    await setFeedbackStatus(openFeedbackIds, "acknowledged");
    await addAction({ client_id: clientId, type: "reviewed", body: "Adherence reviewed" });
  },
  async note(clientId: string, body: string) {
    await addAction({ client_id: clientId, type: "note", body });
  },
  async recommend(clientId: string, body: string, planItemId: string | null, feedbackIds: string[]) {
    await addAction({ client_id: clientId, type: "recommendation", body, plan_item_id: planItemId, visible_to_client: true });
    await setFeedbackStatus(feedbackIds, "resolved");
  },
  async startPlanReview(clientId: string, body: string) {
    await updateClient(clientId, { plan_review_status: "in_review" });
    // The proposal is clinical working notes: the client only sees the "plan is being reviewed" banner.
    await addAction({ client_id: clientId, type: "plan_review", body, visible_to_client: false });
  },
};

// ───────────── Demo seeding ─────────────

/** Wipes and re-creates the demo client relative to `today`. */
export async function resetDemo(today: string): Promise<void> {
  const db = supabase();
  // Cascades remove plan items, logs, feedback and actions.
  check(await db.from("clients").delete().eq("id", DEMO_CLIENT_ID));
  check(await db.from("clients").insert(seedClient(today)));
  check(await db.from("meal_plan_items").insert(seedPlan()));
  check(await db.from("meal_logs").insert(seedLogs(today)));
  check(await db.from("client_feedback").insert(seedFeedback(today)));
  check(await db.from("practitioner_actions").insert(seedActions(today)));
}

/** First-run: seed if the demo client doesn't exist yet. Idempotent under races (ignoreDuplicates). */
export async function ensureSeeded(today: string): Promise<void> {
  const db = supabase();
  const existing = check(await db.from("clients").select("id").eq("id", DEMO_CLIENT_ID).maybeSingle());
  if (existing) return;
  const opts = { onConflict: "id", ignoreDuplicates: true };
  check(await db.from("clients").upsert(seedClient(today), opts));
  check(await db.from("meal_plan_items").upsert(seedPlan(), opts));
  check(await db.from("meal_logs").upsert(seedLogs(today), opts));
  check(await db.from("client_feedback").upsert(seedFeedback(today), opts));
  check(await db.from("practitioner_actions").upsert(seedActions(today), opts));
}
