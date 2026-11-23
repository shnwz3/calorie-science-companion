// Domain model. Mirrors supabase/schema.sql one-to-one.
// Key principle: PLAN (meal_plan_items) and BEHAVIOUR (meal_logs) are separate
// entities. A missing log is "not logged" (missing data), never "skipped".

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";
export type LogStatus = "followed" | "partial" | "substituted" | "skipped";
/** Derived state of a planned meal on a given day. */
export type SlotState = LogStatus | "not_logged" | "upcoming" | "due";

export type Reason =
  | "no_time"
  | "at_work"
  | "not_hungry"
  | "unavailable"
  | "forgot"
  | "social"
  | "other";
export type PrepDifficulty = "easy" | "ok" | "hard";
export type FeedbackCategory = "timing" | "preparation" | "hunger" | "availability" | "other";
export type FeedbackStatus = "open" | "acknowledged" | "resolved";
export type ActionType = "note" | "flag" | "unflag" | "recommendation" | "reviewed" | "plan_review";

export interface Client {
  id: string;
  name: string;
  age: number | null;
  occupation: string | null;
  goal: string | null;
  programme_start: string; // YYYY-MM-DD
  programme_weeks: number;
  needs_follow_up: boolean;
  follow_up_reason: string | null;
  last_reviewed_at: string | null;
  plan_review_status: "none" | "in_review";
}

export interface PlanItem {
  id: string;
  client_id: string;
  meal_type: MealType;
  label: string;
  planned_time: string; // HH:MM[:SS]
  title: string;
  description: string | null;
  sort_order: number;
}

export interface MealLog {
  id: string;
  client_id: string;
  plan_item_id: string;
  log_date: string; // YYYY-MM-DD
  status: LogStatus;
  substitute_text: string | null;
  reason: Reason | null;
  hunger: number | null; // 1 very hungry … 3 satisfied … 5 too full
  prep_difficulty: PrepDifficulty | null;
  actual_time: string | null;
  comment: string | null;
  logged_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  client_id: string;
  plan_item_id: string | null;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface PractitionerAction {
  id: string;
  client_id: string;
  type: ActionType;
  body: string | null;
  plan_item_id: string | null;
  feedback_id: string | null;
  visible_to_client: boolean;
  client_seen_at: string | null;
  author: string;
  created_at: string;
}

/** Everything both experiences need about one client. */
export interface ClientBundle {
  client: Client;
  plan: PlanItem[];
  logs: MealLog[];
  feedback: Feedback[];
  actions: PractitionerAction[];
}

export type MealLogInput = Omit<MealLog, "id" | "logged_at" | "updated_at">;
