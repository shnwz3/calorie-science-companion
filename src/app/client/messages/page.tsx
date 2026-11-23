"use client";

import { CheckCheck, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useClientData } from "@/components/ClientDataProvider";
import { Avatar, Button, Chip, LoadGate, Skeleton, Toast } from "@/components/ui";
import { relativeTime } from "@/lib/dates";
import { FEEDBACK_CATEGORY_LABEL } from "@/lib/labels";
import { markActionsSeen, sendFeedback } from "@/lib/repo";
import type { ClientBundle, FeedbackCategory, FeedbackStatus } from "@/lib/types";

const SUGGESTIONS = [
  "I can’t manage my afternoon snack when I’m at the office.",
  "I don’t have time to prepare lunch on workdays.",
  "I feel hungry in the late afternoon.",
  "Dinner at 8 PM doesn’t work with my commute.",
];

const STATUS_TEXT: Record<FeedbackStatus, string> = {
  open: "Sent",
  acknowledged: "Seen",
  resolved: "Answered",
};

const MAX = 500;

export default function MessagesPage() {
  const { state, reload } = useClientData();
  return (
    <LoadGate
      state={state}
      onRetry={reload}
      skeleton={
        <div className="space-y-4 px-5 pt-8">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-20" />
          <Skeleton className="h-48" />
        </div>
      }
    >
      {(data) => (
        <Suspense>
          <Messages data={data} />
        </Suspense>
      )}
    </LoadGate>
  );
}

function Messages({ data }: { data: ClientBundle }) {
  const params = useSearchParams();
  const [meal, setMeal] = useState<string | null>(params.get("meal"));
  const [category, setCategory] = useState<FeedbackCategory>("timing");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const unseenIds = useMemo(
    () => data.actions.filter((a) => a.visible_to_client && !a.client_seen_at).map((a) => a.id),
    [data.actions],
  );
  // Opening the inbox marks practitioner messages as read (the practitioner sees "Seen").
  useEffect(() => {
    if (unseenIds.length) markActionsSeen(unseenIds).catch(() => {});
  }, [unseenIds]);

  // Chronological, oldest first, like any conversation.
  const thread = useMemo(() => {
    const items = [
      ...data.feedback.map((f) => ({ kind: "client" as const, at: f.created_at, f })),
      ...data.actions.filter((a) => a.visible_to_client).map((a) => ({ kind: "pract" as const, at: a.created_at, a })),
    ];
    return items.sort((x, y) => x.at.localeCompare(y.at));
  }, [data]);

  const mealLabel = (id: string | null) => data.plan.find((p) => p.id === id)?.label;

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendFeedback({ client_id: data.client.id, plan_item_id: meal, category, message: text.trim() });
      setText("");
      setToast("Sent to Dr. Meera");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3 px-5">
        <Avatar name="Meera Iyer" />
        <div>
          <h1 className="font-serif text-[1.375rem] font-semibold leading-tight tracking-tight">Dr. Meera Iyer</h1>
          <p className="text-sm text-stone-500">Your nutrition practitioner · usually replies within a day</p>
        </div>
      </header>

      <section aria-label="Conversation" className="mt-6 space-y-4 border-y border-line bg-stone-100/50 px-4 py-5">
        {thread.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">No messages yet. If something in your plan isn’t working, this is the place to say so.</p>
        ) : (
          <ol className="space-y-4">
            {thread.map((t) =>
              t.kind === "client" ? (
                <li key={t.f.id} className="flex flex-col items-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-700 px-4 py-2.5 text-[0.9375rem] leading-relaxed text-white">
                    {mealLabel(t.f.plan_item_id) && <p className="mb-0.5 text-xs font-medium text-brand-100">About {mealLabel(t.f.plan_item_id)?.toLowerCase()}</p>}
                    {t.f.message}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                    {relativeTime(t.f.created_at)} · {STATUS_TEXT[t.f.status]}
                    {t.f.status !== "open" && <CheckCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />}
                  </p>
                </li>
              ) : (
                <li key={t.a.id} className="flex flex-col items-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5 text-[0.9375rem] leading-relaxed text-stone-800">
                    {mealLabel(t.a.plan_item_id) && (
                      <p className="mb-0.5 text-xs font-semibold text-brand-700">Suggestion for {mealLabel(t.a.plan_item_id)?.toLowerCase()}</p>
                    )}
                    {t.a.body}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{relativeTime(t.a.created_at)}</p>
                </li>
              ),
            )}
          </ol>
        )}
      </section>

      <section aria-labelledby="compose-h" className="space-y-5 px-5 pt-6">
        <div>
          <h2 id="compose-h" className="text-sm font-semibold text-stone-900">
            Tell Dr. Meera what’s getting in the way
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">She reads these alongside your meal logs.</p>
        </div>

        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm text-stone-600">Which meal is it about?</legend>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            <Chip active={meal === null} onClick={() => setMeal(null)} className="shrink-0">
              General
            </Chip>
            {data.plan.map((p) => (
              <Chip key={p.id} active={meal === p.id} onClick={() => setMeal(p.id)} className="shrink-0">
                {p.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="cat" className="mb-2 block text-sm text-stone-600">
            What kind of issue?
          </label>
          <select
            id="cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-[1rem] text-stone-800"
          >
            {(Object.keys(FEEDBACK_CATEGORY_LABEL) as FeedbackCategory[]).map((c) => (
              <option key={c} value={c}>
                {FEEDBACK_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="msg" className="mb-2 block text-sm text-stone-600">
            Your message
          </label>
          <textarea
            id="msg"
            rows={4}
            maxLength={MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby="msg-count"
            className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-[1rem] leading-relaxed outline-none transition-colors focus:border-brand-600"
          />
          <p id="msg-count" className="mt-1 text-right text-xs text-stone-500">
            <span className="tabular">{text.length}</span>/{MAX}
          </p>
          {!text && (
            <div className="mt-1">
              <p className="mb-1.5 text-xs text-stone-500">Or start from one of these</p>
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => setText(s)} className="min-h-11 w-full px-3 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-50">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            {error}
          </p>
        )}
        <Button variant="primary" size="lg" className="w-full" onClick={send} disabled={!text.trim()} loading={sending}>
          {!sending && <Send className="h-4 w-4" aria-hidden="true" />} Send message
        </Button>
      </section>
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
