"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { Button, Chip, Modal } from "@/components/ui";
import { practitioner } from "@/lib/repo";
import type { ClientBundle } from "@/lib/types";

export type ActionModalState =
  | { type: "recommend"; planItemId: string | null; feedbackIds: string[]; quote?: string }
  | { type: "note" }
  | { type: "flag" }
  | { type: "plan_review" }
  | null;

const REC_TEMPLATES: Record<string, string[]> = {
  snack: [
    "Let’s make your afternoon snack something you can keep at your desk: a handful of roasted chana + 1 fruit, or a pre-packed curd/Greek yogurt cup. No prep needed, so you can eat it between meetings, anytime 4–5 PM.",
    "On office days, carry a small box of roasted makhana and peanuts. It’s fine to have it a little earlier or later than 4:30 PM.",
  ],
  lunch: [
    "On office days, if home-cooked lunch isn’t possible, choose from the canteen: dal + sabzi + 1–2 rotis and salad, and skip the fried sides. That counts as following the plan.",
  ],
  dinner: ["Your dinner can move to around 9 PM on workdays. Keep it lighter (khichdi or dal + sabzi) if it’s after 9:30."],
  general: ["Thanks for logging honestly this week. It really helps. Let’s talk about adjusting the plan at our next check-in."],
};

const FLAG_REASONS = ["Discuss workday meal timing", "Low logging, check in", "Persistent hunger reported", "Plan may need adjustment"];

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[1rem] leading-relaxed outline-none transition-colors focus:border-brand-600";

export function ActionModals({
  data,
  state,
  onClose,
  onDone,
}: {
  data: ClientBundle;
  state: ActionModalState;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  if (!state) return null;
  const key = state.type + ("planItemId" in state ? state.planItemId : "");
  return <Inner key={key} data={data} state={state} onClose={onClose} onDone={onDone} />;
}

function Inner({
  data,
  state,
  onClose,
  onDone,
}: {
  data: ClientBundle;
  state: NonNullable<ActionModalState>;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const clientId = data.client.id;
  const [planItemId, setPlanItemId] = useState<string | null>(state.type === "recommend" ? state.planItemId : null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>, msg: string) {
    setSaving(true);
    setError(null);
    try {
      await fn();
      onDone(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  const footer = (label: string, onClick: () => void, disabled = !text.trim()) => (
    <>
      {error && <p className="mt-3 rounded-lg bg-danger-50 p-2.5 text-sm text-danger-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onClick} disabled={disabled} loading={saving}>
          {label}
        </Button>
      </div>
    </>
  );

  if (state.type === "recommend") {
    const mealType = data.plan.find((p) => p.id === planItemId)?.meal_type ?? "general";
    const templates = REC_TEMPLATES[mealType] ?? REC_TEMPLATES.general;
    return (
      <Modal open onClose={onClose} title="Send recommendation to client">
        {state.quote && <p className="mb-3 rounded-lg border-l-4 border-line bg-paper p-3 text-sm italic text-stone-600">Client: “{state.quote}”</p>}
        <div className="mb-3">
          <div className="mb-1.5 text-sm font-semibold text-stone-800">Related meal</div>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={planItemId === null} onClick={() => setPlanItemId(null)}>
              General
            </Chip>
            {data.plan.map((p) => (
              <Chip key={p.id} active={planItemId === p.id} onClick={() => setPlanItemId(p.id)}>
                {p.label}
              </Chip>
            ))}
          </div>
        </div>
        <textarea rows={5} className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a practical suggestion for the client…" aria-label="Recommendation" />
        <div className="mt-2 space-y-1.5">
          {templates.map((t) => (
            <button key={t} onClick={() => setText(t)} className="block w-full rounded-lg bg-stone-50 p-2 text-left text-xs text-stone-600 hover:bg-stone-100">
              <span className="font-medium text-brand-700">Use template: </span>
              {t.slice(0, 110)}…
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
          <Eye className="h-3.5 w-3.5" /> The client sees this on their Today screen
          {planItemId ? " and next to the meal" : ""}
          {state.feedbackIds.length ? ". The linked message will be marked as answered." : "."}
        </p>
        {footer("Send to client", () =>
          run(() => practitioner.recommend(clientId, text.trim(), planItemId, state.feedbackIds), "Recommendation sent. Ananya will see it in her app."),
        )}
      </Modal>
    );
  }

  if (state.type === "note") {
    return (
      <Modal open onClose={onClose} title="Add private note">
        <textarea rows={4} className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder="Only visible to practitioners" aria-label="Note" autoFocus />
        {footer("Save note", () => run(() => practitioner.note(clientId, text.trim()), "Note saved"))}
      </Modal>
    );
  }

  if (state.type === "flag") {
    return (
      <Modal open onClose={onClose} title="Flag for follow-up">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {FLAG_REASONS.map((r) => (
            <Chip key={r} active={text === r} onClick={() => setText(r)}>
              {r}
            </Chip>
          ))}
        </div>
        <input className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reason for follow-up" aria-label="Reason" />
        <p className="mt-2 text-xs text-stone-500">Flagged clients move to the top of your client list until the flag is cleared.</p>
        {footer("Flag client", () => run(() => practitioner.flag(clientId, text.trim()), "Client flagged for follow-up"))}
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Start meal-plan review">
      <p className="mb-3 text-sm text-stone-600">Record the adjustment you’re proposing (visible to practitioners only). The client sees a banner saying their plan is being reviewed; the plan itself doesn’t change until a new version is published.</p>
      <textarea
        rows={5}
        className={field}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Proposed adjustment"
        placeholder="e.g. Replace the 4:30 PM snack with a portable no-prep option; allow lunch from the office canteen with guidance; move dinner to 9:00 PM on workdays."
      />
      <button
        className="mt-2 text-xs font-medium text-brand-700"
        onClick={() =>
          setText(
            "Proposed: (1) Swap 4:30 PM snack for portable no-prep options (roasted chana, fruit, curd cup), flexible 4–5 PM. (2) Add office-canteen lunch guidance as an accepted option. (3) Move workday dinner to 9:00 PM. Review at end of week 3.",
          )
        }
      >
        Use suggested adjustment based on this week’s data
      </button>
      {footer("Start review", () =>
        run(() => practitioner.startPlanReview(clientId, text.trim()), "Plan review started. Ananya can see her plan is under review."),
      )}
    </Modal>
  );
}
