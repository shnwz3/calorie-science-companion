"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { StatusIcon } from "@/components/StatusIcon";
import { useClientData } from "@/components/ClientDataProvider";
import { cx, LoadGate, Skeleton } from "@/components/ui";
import { analyseWeek, countCells, loggingStreak, todayCells } from "@/lib/adherence";
import { formatLongDate, weekdayShort } from "@/lib/dates";
import { shortLabel, STATUS_LABEL, STATUS_STYLE } from "@/lib/labels";
import type { ClientBundle, LogStatus } from "@/lib/types";

export default function ProgressPage() {
  const { state, reload } = useClientData();
  return (
    <LoadGate
      state={state}
      onRetry={reload}
      skeleton={
        <div className="space-y-4 px-5 pt-8">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-28" />
          <Skeleton className="h-52" />
        </div>
      }
    >
      {(data) => <Progress data={data} />}
    </LoadGate>
  );
}

const ORDER: LogStatus[] = ["followed", "partial", "substituted", "skipped"];

function Progress({ data }: { data: ClientBundle }) {
  const { today, nowMin } = useClientData();
  const cells = useMemo(() => todayCells(data, today, nowMin), [data, today, nowMin]);
  const week = useMemo(() => analyseWeek(data, today), [data, today]);
  const streak = loggingStreak(data.logs, today);

  const loggedToday = cells.filter((c) => c.log);
  const todayCounts = countCells(loggedToday);
  const remaining = cells.length - loggedToday.length;

  const eligible = week.perMeal.filter((m) => m.counts.logged >= 3);
  const strongest = [...eligible].sort((a, b) => b.counts.followed - a.counts.followed)[0];
  const tricky = [...eligible].sort((a, b) => b.counts.skipped + b.counts.substituted - (a.counts.skipped + a.counts.substituted))[0];
  const trickyCount = tricky ? tricky.counts.skipped + tricky.counts.substituted : 0;
  const showStrong = !!strongest && strongest.counts.followed > 0;
  const showTricky = !!tricky && trickyCount >= 2;

  let message: string;
  if (loggedToday.length === 0) message = "Nothing logged yet today. A quick tap after each meal is enough.";
  else if (remaining === 0) message = "Every meal is logged for today. That gives Dr. Meera a complete picture.";
  else if (todayCounts.skipped + todayCounts.substituted > 0)
    message = "Thanks for logging the meals that didn’t go to plan. That’s the most useful thing for adjusting it.";
  else message = `${remaining} meal${remaining > 1 ? "s" : ""} still to log today.`;

  const columns = [...week.days, today];
  const allLogs = new Map(data.logs.map((l) => [`${l.plan_item_id}|${l.log_date}`, l]));

  return (
    <div className="px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] md:px-10 md:pb-12 md:pt-14 lg:px-12">
      <header>
        <p className="text-sm text-stone-500">{formatLongDate(today)}</p>
        <h1 className="mt-1 font-serif text-[1.75rem] font-semibold leading-tight tracking-tight md:text-[2.25rem]">Your progress</h1>
      </header>

      {/* Phone & tablet: stacked. Desktop (≥1024px): the week grid spans the full width; today and the notes sit side by side below. */}
      <div className="mt-8 space-y-8 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-10 lg:space-y-0">
      <section aria-labelledby="today-h" className="lg:col-start-1 lg:row-start-2">
        <h2 id="today-h" className="text-sm font-semibold text-stone-900">
          Today
        </h2>
        <dl className="mt-3 grid grid-cols-4 divide-x divide-line rounded-xl border border-line bg-surface">
          {ORDER.map((s) => (
            <div key={s} className="flex flex-col-reverse px-2 py-3 text-center">
              <dt className="mt-0.5 text-xs leading-tight text-stone-500">{STATUS_LABEL[s]}</dt>
              <dd className="tabular text-2xl font-semibold text-stone-900">{todayCounts[s]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-stone-700">{message}</p>
      </section>

      <section aria-labelledby="week-h" className="lg:col-span-2 lg:row-start-1">
        <div className="flex items-baseline justify-between">
          <h2 id="week-h" className="text-sm font-semibold text-stone-900">
            Last 7 days
          </h2>
          {streak > 1 && (
            <span className="text-sm text-stone-600">
              Logged <span className="tabular font-semibold text-stone-900">{streak}</span> days in a row
            </span>
          )}
        </div>
        <div className="mt-3 rounded-xl border border-line bg-surface p-3 md:p-5">
          <table className="w-full border-separate border-spacing-y-1.5 text-center text-xs md:border-spacing-y-2.5 md:text-sm">
            <caption className="sr-only">Meals logged per day over the last week</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Meal</span>
                </th>
                {columns.map((d) => (
                  <th key={d} scope="col" className={cx("pb-1 font-medium", d === today ? "text-brand-700" : "text-stone-500")}>
                    {d === today ? "Today" : weekdayShort(d).slice(0, 2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {week.perMeal.map((m) => (
                <tr key={m.item.id}>
                  <th scope="row" className="pr-2 text-left font-normal text-stone-600">
                    {shortLabel(m.item.label)}
                  </th>
                  {columns.map((d) => {
                    const log = allLogs.get(`${m.item.id}|${d}`);
                    const label = log ? STATUS_LABEL[log.status] : d === today ? "Not yet" : "Not logged";
                    return (
                      <td key={d}>
                        <span
                          title={label}
                          className={cx(
                            "mx-auto grid h-6 w-6 place-items-center rounded-md md:h-9 md:w-9 md:rounded-lg",
                            log ? STATUS_STYLE[log.status].cell : d === today ? "bg-stone-100" : "hatch",
                          )}
                        >
                          {log && <StatusIcon state={log.status} className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                          <span className="sr-only">{label}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-1 pt-3 text-xs text-stone-600">
            {ORDER.map((s) => (
              <li key={s} className="inline-flex items-center gap-1.5">
                <span className={cx("grid h-4 w-4 place-items-center rounded", STATUS_STYLE[s].cell)}>
                  <StatusIcon state={s} className="h-2.5 w-2.5" />
                </span>
                {STATUS_LABEL[s]}
              </li>
            ))}
            <li className="inline-flex items-center gap-1.5">
              <span className="hatch h-4 w-4 rounded" /> Not logged
            </li>
          </ul>
        </div>
      </section>

      {(showStrong || showTricky) && (
        <section aria-labelledby="notes-h" className="space-y-3 lg:col-start-2 lg:row-start-2">
          <h2 id="notes-h" className="text-sm font-semibold text-stone-900">
            What your logs show
          </h2>
          {showStrong && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs font-semibold text-ok-700">Going well</p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-stone-800">
                {strongest.item.label} went to plan on {strongest.counts.followed} of the {strongest.counts.logged} days you logged it.
              </p>
            </div>
          )}
          {showTricky && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs font-semibold text-[#8a4f1f]">Harder to fit in</p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-stone-800">
                {tricky.item.label} didn’t go to plan on {trickyCount} days. That may mean the plan needs to change, not you.
              </p>
              <Link
                href={`/client/messages?meal=${tricky.item.id}`}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                Tell Dr. Meera what gets in the way <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
