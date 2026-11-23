import type { FeedbackCategory, LogStatus, PrepDifficulty, Reason, SlotState } from "./types";

export const STATUS_LABEL: Record<SlotState, string> = {
  followed: "Followed",
  partial: "Partly followed",
  substituted: "Swapped",
  skipped: "Skipped",
  not_logged: "Not logged",
  upcoming: "Upcoming",
  due: "Ready to log",
};

/** Client-facing option copy. Neutral wording on purpose: no "failed", no red X. */
export const STATUS_OPTIONS: { value: LogStatus; label: string; hint: string }[] = [
  { value: "followed", label: "Followed as planned", hint: "Ate the planned meal" },
  { value: "partial", label: "Partly followed", hint: "Ate some of it" },
  { value: "substituted", label: "Had something else", hint: "Swapped for another meal" },
  { value: "skipped", label: "Skipped", hint: "Didn't eat at this time" },
];

/**
 * Classes per state, built from the status tokens in globals.css.
 * Skipped is warm ochre, never red: the client should feel safe reporting it.
 * Every state also has an icon/shape elsewhere, so colour is never the only signal.
 */
export const STATUS_STYLE: Record<SlotState, { dot: string; chip: string; cell: string }> = {
  followed: { dot: "bg-st-followed", chip: "bg-st-followed-soft text-ok-700", cell: "bg-st-followed text-white" },
  partial: { dot: "bg-st-partial", chip: "bg-st-partial-soft text-[#55622a]", cell: "bg-st-partial text-white" },
  substituted: { dot: "bg-st-swapped", chip: "bg-st-swapped-soft text-info-700", cell: "bg-st-swapped text-white" },
  skipped: { dot: "bg-st-skipped", chip: "bg-st-skipped-soft text-[#8a4f1f]", cell: "bg-st-skipped text-white" },
  not_logged: { dot: "bg-stone-300", chip: "bg-stone-100 text-stone-600", cell: "hatch text-stone-500" },
  upcoming: { dot: "bg-stone-200", chip: "bg-stone-100 text-stone-600", cell: "bg-white text-stone-500" },
  due: { dot: "bg-brand-600", chip: "bg-brand-50 text-brand-700", cell: "bg-white text-brand-600" },
};

export const REASON_LABEL: Record<Reason, string> = {
  no_time: "No time",
  at_work: "At work / meetings",
  not_hungry: "Not hungry",
  unavailable: "Food not available",
  forgot: "Forgot",
  social: "Eating out / social",
  other: "Other",
};

export const HUNGER_LABEL: Record<number, string> = {
  1: "Very hungry",
  2: "Still hungry",
  3: "Satisfied",
  4: "Full",
  5: "Too full",
};

export const PREP_LABEL: Record<PrepDifficulty, string> = {
  easy: "Easy",
  ok: "Manageable",
  hard: "Hard to prepare",
};

export const FEEDBACK_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  timing: "Meal timing",
  preparation: "Preparation",
  hunger: "Hunger",
  availability: "Food availability",
  other: "Something else",
};

/** Compact meal name for tight UI ("Afternoon snack" → "Snack"). */
export function shortLabel(label: string): string {
  const s = label.replace(/^Afternoon\s+/i, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
