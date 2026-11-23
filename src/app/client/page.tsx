"use client";

import { Check, ClipboardList, Lightbulb, MessageSquareText, Pencil } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { LogSheet } from "@/components/client/LogSheet";
import { StatusIcon } from "@/components/StatusIcon";
import { useClientData } from "@/components/ClientDataProvider";
import { Badge, Button, cx, LiveDot, LoadGate, Logo, Skeleton, Toast } from "@/components/ui";
import { type Cell, todayCells } from "@/lib/adherence";
import { daysBetween, formatLongDate, formatTime, relativeTime } from "@/lib/dates";
import { HUNGER_LABEL, REASON_LABEL, shortLabel, STATUS_LABEL, STATUS_STYLE } from "@/lib/labels";
import { markActionsSeen, saveMealLog } from "@/lib/repo";
import type { ClientBundle, LogStatus, PractitionerAction } from "@/lib/types";

function greeting(min: number) {
  if (min < 12 * 60) return "Good morning";
  if (min < 17 * 60) return "Good afternoon";
  return "Good evening";
}

function TodaySkeleton() {
  return (
    <div className="space-y-4 px-5 pt-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-14" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export default function TodayPage() {
  const { state, reload } = useClientData();
  return (
    <LoadGate state={state} onRetry={reload} skeleton={<TodaySkeleton />}>
      {(data) => <Today data={data} />}
    </LoadGate>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

function Today({ data }: { data: ClientBundle }) {
  const { today, nowMin, live } = useClientData();
  const [sheet, setSheet] = useState<{ cell: Cell; status?: LogStatus } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [quickSaving, setQuickSaving] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const cells = useMemo(() => todayCells(data, today, nowMin), [data, today, nowMin]);
  const logged = cells.filter((c) => c.log).length;
  const nextUp = cells.find((c) => !c.log && c.state === "due") ?? cells.find((c) => !c.log);
  const week = Math.min(data.client.programme_weeks, Math.floor(daysBetween(data.client.programme_start, today) / 7) + 1);
  const firstName = data.client.name.split(" ")[0];

  const recentSubs = useMemo(
    () => [...new Set(data.logs.filter((l) => l.substitute_text).map((l) => l.substitute_text!).reverse())],
    [data.logs],
  );
  const unseen = data.actions.filter((a) => a.visible_to_client && !a.client_seen_at);
  const tipsByMeal = useMemo(() => {
    const m = new Map<string, PractitionerAction>();
    for (const a of data.actions) if (a.type === "recommendation" && a.plan_item_id && !m.has(a.plan_item_id)) m.set(a.plan_item_id, a);
    return m;
  }, [data.actions]);

  async function quickFollowed(cell: Cell) {
    setQuickSaving(cell.item.id);
    try {
      await saveMealLog({
        client_id: cell.item.client_id,
        plan_item_id: cell.item.id,
        log_date: today,
        status: "followed",
        substitute_text: null,
        reason: null,
        hunger: null,
        prep_difficulty: null,
        actual_time: `${pad(Math.floor(nowMin / 60))}:${pad(nowMin % 60)}`,
        comment: null,
      });
      setToast(`${cell.item.label} logged as followed`);
    } catch {
      setToast("Couldn’t save. Please try again.");
    } finally {
      setQuickSaving(null);
    }
  }

  return (
    <div className="pb-8 md:px-10 md:pb-12 md:pt-6 lg:px-12">
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] md:justify-end md:px-0 md:pt-0">
        <span className="md:hidden">
          <Logo compact />
        </span>
        <LiveDot live={live} />
      </div>

      <header className="px-5 pb-5 pt-5 md:px-0 md:pb-8 md:pt-2">
        <p className="text-sm text-stone-500">
          {formatLongDate(today)} · Week {week} of {data.client.programme_weeks}
        </p>
        <h1 className="mt-1 font-serif text-[1.75rem] font-semibold leading-tight tracking-tight text-stone-900 md:text-[2.25rem]">
          {greeting(nowMin)}, {firstName}
        </h1>
      </header>

      {/* Phone & tablet: one column (at-a-glance first). Desktop (≥1024px): timeline left, sticky at-a-glance column right. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <aside aria-label="Today at a glance" className="space-y-3 px-4 md:px-0 lg:sticky lg:top-8 lg:order-2">
        {/* Daily progress: counts what's been logged, never a compliance score */}
        <div className="px-1 md:rounded-xl md:border md:border-line md:bg-surface md:p-4" aria-label={`${logged} of ${cells.length} meals logged today`}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-stone-800">
              <span className="tabular">{logged}</span> of {cells.length} meals logged
            </span>
            {logged === cells.length && <span className="text-brand-700">Day complete</span>}
          </div>
          <ol className="mt-2 grid grid-cols-4 gap-1.5">
            {cells.map((c) => (
              <li key={c.item.id}>
                <div className={cx("h-1.5 rounded-full", c.log ? STATUS_STYLE[c.state].dot : "bg-stone-200")} />
                <span className="mt-1.5 block text-xs text-stone-500">{shortLabel(c.item.label)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 hidden text-sm leading-relaxed text-stone-600 md:block">
            Log each meal after you eat, including the ones that didn’t go to plan. Dr. Meera uses this to adjust your plan.
          </p>
        </div>

        {data.client.plan_review_status === "in_review" && (
          <div className="flex gap-3 rounded-xl border border-info-200 bg-info-50 p-4 text-sm text-info-900">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-info-600" aria-hidden="true" />
            <p>
              <span className="font-semibold">Your plan is being reviewed.</span> Dr. Meera is adjusting it based on what you’ve logged. Keep logging as
              usual in the meantime.
            </p>
          </div>
        )}

        {unseen.map((a) => (
          <div key={a.id} className="animate-sheet rounded-xl border border-line border-l-4 border-l-brand-600 bg-surface p-4">
            <div className="flex flex-wrap items-center gap-x-2 text-sm">
              <MessageSquareText className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <span className="font-semibold text-stone-900">Message from {a.author}</span>
              <span className="text-stone-500">· {relativeTime(a.created_at)}</span>
            </div>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-stone-800">{a.body}</p>
            <Button size="sm" className="mt-3" onClick={() => markActionsSeen([a.id])}>
              <Check className="h-4 w-4" aria-hidden="true" /> Mark as read
            </Button>
          </div>
        ))}
      </aside>

      <section aria-labelledby="plan-heading" className="mt-6 px-4 md:mt-8 md:px-0 lg:order-1 lg:mt-0">
        <h2 id="plan-heading" className="mb-3 px-1 text-sm font-semibold text-stone-900">
          Today’s plan
        </h2>

        {/* Day timeline */}
        <ol className="relative">
          {cells.map((cell, i) => {
            const isNext = nextUp?.item.id === cell.item.id;
            const tip = tipsByMeal.get(cell.item.id);
            const style = STATUS_STYLE[cell.state];
            const last = i === cells.length - 1;
            return (
              <li key={cell.item.id} className="relative grid grid-cols-[2.75rem_1fr] gap-4 pb-3">
                {/* time rail */}
                <div className="relative flex flex-col items-end pt-4">
                  <span className="tabular text-sm font-semibold text-stone-800">{formatTime(cell.item.planned_time).replace(/ (AM|PM)/, "")}</span>
                  <span className="text-xs text-stone-500">{formatTime(cell.item.planned_time).slice(-2)}</span>
                  {!last && <span aria-hidden="true" className="absolute -right-[8.5px] top-10 bottom-[-0.75rem] w-px bg-line" />}
                  <span
                    aria-hidden="true"
                    className={cx(
                      "absolute -right-[13px] top-[1.3rem] h-2.5 w-2.5 rounded-full ring-4 ring-paper",
                      cell.log ? style.dot : isNext ? "bg-brand-600" : "bg-stone-300",
                    )}
                  />
                </div>

                <article
                  className={cx(
                    "overflow-hidden rounded-xl border bg-surface",
                    isNext && !cell.log ? "border-brand-600/60" : "border-line",
                  )}
                >
                  <button
                    type="button"
                    className="block w-full p-4 text-left transition-colors hover:bg-stone-50/70"
                    onClick={() => setSheet({ cell })}
                    aria-label={`${cell.item.label}, ${STATUS_LABEL[cell.state]}. ${cell.log ? "Edit log" : "Log this meal"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-stone-500">{cell.item.label}</p>
                      <Badge className={style.chip}>
                        <StatusIcon state={cell.state} className="h-3.5 w-3.5" />
                        {STATUS_LABEL[cell.state]}
                      </Badge>
                    </div>
                    <h3 className="mt-1 font-semibold leading-snug text-stone-900">{cell.item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">{cell.item.description}</p>

                    {cell.log && (
                      <div className="mt-3 flex items-start justify-between gap-3 border-t border-dashed border-line pt-3 text-sm">
                        <p className="text-stone-700">
                          <span className="text-stone-500">You logged: </span>
                          {cell.log.status === "substituted" && cell.log.substitute_text ? cell.log.substitute_text : STATUS_LABEL[cell.log.status]}
                          {cell.log.actual_time && <span className="text-stone-500"> at {formatTime(cell.log.actual_time)}</span>}
                          {cell.log.reason && <span className="text-stone-500"> · {REASON_LABEL[cell.log.reason]}</span>}
                          {cell.log.hunger && <span className="text-stone-500"> · {HUNGER_LABEL[cell.log.hunger]}</span>}
                        </p>
                        <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
                      </div>
                    )}
                  </button>

                  {tip && (
                    <div className="flex gap-2.5 border-t border-line bg-brand-50 px-4 py-3 text-sm text-stone-800">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                      <p>
                        <span className="font-semibold text-brand-800">Dr. Meera suggests: </span>
                        {tip.body}
                      </p>
                    </div>
                  )}

                  {!cell.log && cell.state === "due" && (
                    <div className="grid grid-cols-2 gap-2 border-t border-line p-3 md:flex md:px-4">
                      <Button variant="primary" className="whitespace-nowrap px-3" loading={quickSaving === cell.item.id} onClick={() => quickFollowed(cell)}>
                        {quickSaving !== cell.item.id && <Check className="h-4 w-4" aria-hidden="true" />} As planned
                      </Button>
                      <Button className="whitespace-nowrap px-3" onClick={() => setSheet({ cell, status: "substituted" })}>
                        Something else
                      </Button>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 px-1 text-sm text-stone-500">Tap any meal to log or change what happened. Skipped meals are worth logging too.</p>
      </section>
      </div>

      {sheet && (
        <LogSheet
          item={sheet.cell.item}
          date={today}
          existing={sheet.cell.log}
          initialStatus={sheet.status}
          recentSubstitutes={recentSubs}
          onClose={() => setSheet(null)}
          onSaved={(m) => {
            setSheet(null);
            setToast(m);
          }}
        />
      )}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
