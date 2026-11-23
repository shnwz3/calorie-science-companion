"use client";

import { StatusIcon } from "@/components/StatusIcon";
import { useState } from "react";
import { Card, cx, SectionTitle } from "@/components/ui";
import { type Cell, type MealPattern, type WeeklyAnalysis, TIMING_DRIFT_MIN } from "@/lib/adherence";
import { formatShortDate, formatTime, isWeekend, minutesToTime, weekdayShort } from "@/lib/dates";
import { HUNGER_LABEL, PREP_LABEL, REASON_LABEL, STATUS_LABEL, STATUS_STYLE } from "@/lib/labels";


function patternLabel(m: MealPattern): { text: string; tone: string } {
  const c = m.counts;
  if (c.logged < 3) return { text: "Too few logs", tone: "text-stone-500" };
  if (c.followed / c.logged >= 0.75) return { text: "Consistent", tone: "text-ok-600" };
  if (c.skipped / c.logged >= 0.5) return { text: "Repeatedly skipped", tone: "text-amber-700" };
  if (c.substituted / c.logged >= 0.5) return { text: "Often swapped", tone: "text-info-700" };
  if ((c.skipped + c.substituted) / c.logged >= 0.5) return { text: "Often missed or swapped", tone: "text-amber-700" };
  return { text: "Mixed", tone: "text-stone-600" };
}

export function WeeklyGrid({ a }: { a: WeeklyAnalysis }) {
  const [sel, setSel] = useState<Cell | null>(null);

  return (
    <Card className="p-5">
      <SectionTitle title="Weekly pattern" subtitle="Planned meals (rows) × days. Click any cell to see what the client logged." />
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr className="text-xs text-stone-500">
              <th className="w-36 text-left font-medium">Meal · planned</th>
              {a.days.map((d) => (
                <th key={d} className={cx("font-medium", isWeekend(d) && "text-stone-500")}>
                  <div>{weekdayShort(d)}</div>
                  <div className="text-xs font-normal text-stone-500">{formatShortDate(d)}</div>
                </th>
              ))}
              <th className="w-40 pl-2 text-left font-medium">Pattern</th>
            </tr>
          </thead>
          <tbody>
            {a.perMeal.map((m) => {
              const p = patternLabel(m);
              return (
                <tr key={m.item.id}>
                  <td className="pr-2">
                    <div className="font-medium leading-tight">{m.item.label}</div>
                    <div className="text-xs text-stone-500">{formatTime(m.item.planned_time)}</div>
                  </td>
                  {m.cells.map((c) => {
                    const active = sel?.item.id === c.item.id && sel.date === c.date;
                    return (
                      <td key={c.date}>
                        <button
                          onClick={() => setSel(active ? null : c)}
                          aria-label={`${m.item.label} ${weekdayShort(c.date)}: ${STATUS_LABEL[c.state]}`}
                          aria-pressed={active}
                          aria-controls="cell-detail"
                          className={cx(
                            "relative grid h-11 w-full place-items-center rounded-lg transition hover:brightness-110",
                            STATUS_STYLE[c.state].cell,
                            active && "ring-2 ring-stone-900 ring-offset-1",
                            isWeekend(c.date) && c.state !== "not_logged" && "opacity-90",
                          )}
                        >
                          <StatusIcon state={c.state} className="h-4 w-4" />
                          {c.log?.actual_time && c.log.status !== "skipped" && (
                            <span className="absolute bottom-0.5 text-xs leading-none opacity-80">{c.log.actual_time}</span>
                          )}
                          {c.log?.comment && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-stone-900/60" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="pl-2 text-xs">
                    <div className={cx("font-medium", p.tone)}>{p.text}</div>
                    <div className="text-stone-500">
                      {m.counts.followed}/{m.counts.logged} followed
                      {m.counts.substituted > 0 && ` · ${m.counts.substituted} swapped`}
                      {m.counts.skipped > 0 && ` · ${m.counts.skipped} skipped`}
                    </div>
                    {m.avgDeviationMin != null && Math.abs(m.avgDeviationMin) >= TIMING_DRIFT_MIN && m.timeRange && (
                      <div className="text-stone-500">
                        eaten {formatTime(minutesToTime(m.timeRange[0]))}–{formatTime(minutesToTime(m.timeRange[1]))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="text-xs text-stone-500">
              <td className="pr-2">Meals logged</td>
              {a.perDay.map((d) => (
                <td key={d.date} className={cx("text-center", d.counts.logged === 0 && "font-semibold text-amber-700")}>
                  {d.counts.logged}/{d.counts.planned}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        {(["followed", "partial", "substituted", "skipped", "not_logged"] as const).map((s) => {
          return (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cx("grid h-4 w-4 place-items-center rounded", STATUS_STYLE[s].cell)}>
                <StatusIcon state={s} className="h-2.5 w-2.5" />
              </span>
              {STATUS_LABEL[s]}
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-stone-900/60" /> has comment
        </span>
      </div>

      {sel && (
        <div id="cell-detail" aria-live="polite" className="mt-4 animate-fade rounded-lg border border-line bg-paper p-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-semibold">
              {sel.item.label} · {weekdayShort(sel.date)} {formatShortDate(sel.date)}
            </div>
            <div className="text-xs text-stone-500">
              Planned: {sel.item.title} at {formatTime(sel.item.planned_time)}
            </div>
          </div>
          {!sel.log ? (
            <p className="mt-2 text-stone-600">
              <span className="font-medium">Not logged.</span> We don’t know whether this meal was eaten, so it’s treated as missing data.
            </p>
          ) : (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              <Field k="Actual" v={STATUS_LABEL[sel.log.status]} />
              {sel.log.substitute_text && <Field k="Had instead" v={sel.log.substitute_text} />}
              {sel.log.actual_time && <Field k="Time" v={formatTime(sel.log.actual_time)} />}
              {sel.log.reason && <Field k="Reason" v={REASON_LABEL[sel.log.reason]} />}
              {sel.log.hunger && <Field k="Hunger / satiety" v={`${sel.log.hunger}/5 · ${HUNGER_LABEL[sel.log.hunger]}`} />}
              {sel.log.prep_difficulty && <Field k="Preparation" v={PREP_LABEL[sel.log.prep_difficulty]} />}
              {sel.log.comment && (
                <div className="col-span-full">
                  <dt className="text-xs text-stone-500">Comment</dt>
                  <dd className="italic">“{sel.log.comment}”</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </Card>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
