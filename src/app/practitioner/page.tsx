"use client";

import { AlertCircle, ChevronRight, Flag, Info } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, Badge, Card, Chip, cx, LiveDot, Skeleton } from "@/components/ui";
import { analyseWeek, attentionScore, attentionSignals, type Severity } from "@/lib/adherence";
import { daysBetween, relativeTime } from "@/lib/dates";
import { MOCK_ROSTER, type RosterRow } from "@/lib/mockRoster";
import { DEMO_CLIENT_ID } from "@/lib/seed";
import { useClientBundle } from "@/lib/useClientBundle";

const SEV_STYLE: Record<Severity, string> = {
  high: "bg-danger-50 text-danger-700",
  medium: "bg-amber-50 text-[#8a5a12]",
  low: "bg-stone-100 text-stone-600",
};

type Row = RosterRow & { signalsCount?: number };

export default function RosterPage() {
  const { state, today, live } = useClientBundle(DEMO_CLIENT_ID);
  const [filter, setFilter] = useState<"attention" | "all">("attention");

  const liveRow: Row | null = useMemo(() => {
    if (state.status !== "ready") return null;
    const d = state.data;
    const a = analyseWeek(d, today);
    const signals = attentionSignals(a, d);
    const week = Math.floor(daysBetween(d.client.programme_start, today) / 7) + 1;
    const last = [...d.logs].sort((x, y) => y.logged_at.localeCompare(x.logged_at))[0];
    return {
      id: d.client.id,
      name: d.client.name,
      week: `Week ${week} of ${d.client.programme_weeks}`,
      score: a.score,
      coverage: a.coverage ?? 0,
      lastLog: last ? relativeTime(last.logged_at) : "never",
      topSignal: signals[0]?.title ?? null,
      severity: signals[0]?.severity ?? null,
      attention: attentionScore(signals) + (d.client.needs_follow_up ? 3 : 0),
      flagged: d.client.needs_follow_up,
      live: true,
      signalsCount: signals.length,
    };
  }, [state, today]);

  const rows: Row[] = useMemo(() => {
    const all: Row[] = [...(liveRow ? [liveRow] : []), ...MOCK_ROSTER];
    return all.sort((a, b) => b.attention - a.attention);
  }, [liveRow]);
  const needs = rows.filter((r) => r.attention >= 3 || r.flagged);
  const shown = filter === "attention" ? needs : rows;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[1.75rem] font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-stone-500">Sorted by who needs your attention first, based on the last 7 days of logs and messages.</p>
        </div>
        <LiveDot live={live} />
      </div>

      <div className="flex gap-2">
        <Chip active={filter === "attention"} onClick={() => setFilter("attention")}>
          Needs attention ({needs.length})
        </Chip>
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All clients ({rows.length})
        </Chip>
      </div>

      {state.status === "loading" && <Skeleton className="h-16" />}
      {(state.status === "error" || state.status === "setup") && (
        <Card className="flex items-center gap-2 p-4 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4" /> Live client data unavailable: {state.message}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_1fr_1fr_2.2fr_auto] gap-4 border-b border-line bg-paper px-5 py-2.5 text-xs font-medium text-stone-500 md:grid">
          <span>Client</span>
          <span>Adherence*</span>
          <span>Logging</span>
          <span>Top signal</span>
          <span />
        </div>
        <ul className="divide-y divide-stone-100">
          {shown.map((r) => {
            const inner = (
              <div className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[1.6fr_1fr_1fr_2.2fr_auto] md:items-center md:gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} />
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {r.name}
                      {r.flagged && <Flag className="h-3.5 w-3.5 fill-danger-500 text-danger-500" aria-label="Flagged" />}
                      {r.live ? (
                        <Badge className="bg-brand-50 text-brand-700">Live</Badge>
                      ) : (
                        <Badge className="bg-stone-100 text-stone-500">Sample</Badge>
                      )}
                    </div>
                    <div className="text-xs text-stone-500">{r.week}</div>
                  </div>
                </div>
                <div className="text-sm">
                  {r.score == null ? <span className="text-stone-500">—</span> : <span className="font-semibold">{Math.round(r.score * 100)}%</span>}
                  <span className="ml-1 text-xs text-stone-500 md:block md:ml-0">of logged meals</span>
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-100">
                      <div className={cx("h-full rounded-full", r.coverage < 0.7 ? "bg-amber-400" : "bg-brand-500")} style={{ width: `${r.coverage * 100}%` }} />
                    </div>
                    <span className="text-xs text-stone-600">{Math.round(r.coverage * 100)}%</span>
                  </div>
                  <span className="text-xs text-stone-500">last log {r.lastLog}</span>
                </div>
                <div>
                  {r.topSignal ? (
                    <Badge className={SEV_STYLE[r.severity!]}>{r.topSignal}</Badge>
                  ) : (
                    <span className="text-sm text-ok-600">On track</span>
                  )}
                  {r.live && r.signalsCount! > 1 && <span className="ml-1.5 text-xs text-stone-500">+{r.signalsCount! - 1} more</span>}
                </div>
                <ChevronRight className={cx("hidden h-4 w-4 md:block", r.live ? "text-stone-500" : "text-transparent")} />
              </div>
            );
            return (
              <li key={r.id}>
                {r.live ? (
                  <Link href={`/practitioner/clients/${r.id}`} className="block transition hover:bg-brand-50/40">
                    {inner}
                  </Link>
                ) : (
                  <div className="opacity-75" title="Sample row. Open Ananya Rao for the live workflow">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
          {shown.length === 0 && <li className="px-5 py-10 text-center text-sm text-stone-500">Nobody needs attention right now.</li>}
        </ul>
      </Card>
      <p className="flex items-start gap-1.5 text-xs text-stone-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        *Adherence is calculated only over meals the client logged; unlogged meals are shown separately as logging coverage. Sample rows are
        static and illustrate how the attention ranking scales to a full caseload.
      </p>
    </div>
  );
}
