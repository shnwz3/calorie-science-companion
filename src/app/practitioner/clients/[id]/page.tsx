"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Flag, FlagOff, Info, Send, StickyNote } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ActionModals, type ActionModalState } from "@/components/practitioner/ActionModals";
import { ActivityLog } from "@/components/practitioner/ActivityLog";
import { AdherenceOverview } from "@/components/practitioner/AdherenceOverview";
import { FeedbackPanel } from "@/components/practitioner/FeedbackPanel";
import { InsightPanel } from "@/components/practitioner/InsightPanel";
import { TodayStrip } from "@/components/practitioner/TodayStrip";
import { WeeklyGrid } from "@/components/practitioner/WeeklyGrid";
import { Avatar, Badge, Button, Card, cx, LiveDot, LoadGate, Skeleton, Toast } from "@/components/ui";
import { analyseWeek, attentionSignals, todayCells, type Severity } from "@/lib/adherence";
import { daysBetween, relativeTime } from "@/lib/dates";
import { generateInsight } from "@/lib/insights";
import { practitioner } from "@/lib/repo";
import type { ClientBundle } from "@/lib/types";
import { useClientBundle } from "@/lib/useClientBundle";

const SEV: Record<Severity, { label: string; dot: string; text: string }> = {
  high: { label: "High", dot: "bg-sev-high", text: "text-sev-high" },
  medium: { label: "Medium", dot: "bg-sev-medium", text: "text-[#8a5a12]" },
  low: { label: "Low", dot: "bg-stone-400", text: "text-stone-600" },
};

export default function ClientDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { state, today, nowMin, live, reload } = useClientBundle(id);
  return (
    <LoadGate
      state={state}
      onRetry={reload}
      skeleton={
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-14" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      }
    >
      {(data) => <Dashboard data={data} today={today} nowMin={nowMin} live={live} />}
    </LoadGate>
  );
}

function Dashboard({ data, today, nowMin, live }: { data: ClientBundle; today: string; nowMin: number; live: boolean }) {
  const [modal, setModal] = useState<ActionModalState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const a = useMemo(() => analyseWeek(data, today), [data, today]);
  const signals = useMemo(() => attentionSignals(a, data), [a, data]);
  const todayLive = useMemo(() => todayCells(data, today, nowMin), [data, today, nowMin]);
  const insight = useMemo(() => generateInsight(a, data.feedback), [a, data.feedback]);
  const c = data.client;
  const day = daysBetween(c.programme_start, today) + 1;
  const totalDays = c.programme_weeks * 7;
  const openFeedback = data.feedback.filter((f) => f.status === "open");
  const reviewedToday = c.last_reviewed_at && c.last_reviewed_at.slice(0, 10) >= today.slice(0, 10);

  async function quick(name: string, fn: () => Promise<void>, msg: string) {
    setBusy(name);
    try {
      await fn();
      setToast(msg);
    } catch (e) {
      setToast(e instanceof Error ? `Failed: ${e.message}` : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <Link href="/practitioner" className="inline-flex min-h-9 items-center gap-1 text-sm text-stone-500 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Clients
        </Link>
      </nav>

      {/* Page header: who, where they are in the programme, status, actions */}
      <header className="flex flex-col gap-5 border-b border-line pb-6">
        <div className="flex min-w-0 gap-4">
          <Avatar name={c.name} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-serif text-[1.75rem] font-semibold leading-tight tracking-tight">{c.name}</h1>
              <LiveDot live={live} />
            </div>
            <p className="mt-0.5 text-sm text-stone-600">
              {c.age} · {c.occupation} · Day <span className="tabular">{day}</span> of {totalDays}
            </p>
            <p className="mt-1 max-w-xl text-sm text-stone-600">
              <span className="text-stone-500">Goal:</span> {c.goal}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className={c.last_reviewed_at ? "bg-ok-50 text-ok-700" : "bg-stone-100 text-stone-600"}>
                {c.last_reviewed_at ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {c.last_reviewed_at ? `Reviewed ${relativeTime(c.last_reviewed_at)}` : "Not reviewed this week"}
              </Badge>
              {c.needs_follow_up && (
                <Badge className="bg-danger-50 text-danger-700">
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Follow-up: {c.follow_up_reason}
                </Badge>
              )}
              {c.plan_review_status === "in_review" && (
                <Badge className="bg-info-50 text-info-700">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> Plan under review
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* One primary action; the rest are secondary so the hierarchy is obvious */}
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Client actions">
          <Button variant="primary" onClick={() => setModal({ type: "recommend", planItemId: null, feedbackIds: [] })}>
            <Send className="h-4 w-4" aria-hidden="true" /> Send recommendation
          </Button>
          <Button
            onClick={() => quick("review", () => practitioner.markReviewed(c.id, openFeedback.map((f) => f.id)), "Marked as reviewed")}
            loading={busy === "review"}
            disabled={!!reviewedToday}
          >
            {busy !== "review" && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />} {reviewedToday ? "Reviewed today" : "Mark reviewed"}
          </Button>
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
          {c.needs_follow_up ? (
            <Button variant="ghost" onClick={() => quick("unflag", () => practitioner.unflag(c.id), "Flag cleared")} loading={busy === "unflag"}>
              <FlagOff className="h-4 w-4" aria-hidden="true" /> Clear flag
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setModal({ type: "flag" })}>
              <Flag className="h-4 w-4" aria-hidden="true" /> Flag
            </Button>
          )}
          <Button variant="ghost" onClick={() => setModal({ type: "note" })}>
            <StickyNote className="h-4 w-4" aria-hidden="true" /> Note
          </Button>
          <Button variant="ghost" onClick={() => setModal({ type: "plan_review" })} disabled={c.plan_review_status === "in_review"}>
            <ClipboardList className="h-4 w-4" aria-hidden="true" /> {c.plan_review_status === "in_review" ? "Review in progress" : "Plan review"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* What needs attention: the first thing the practitioner reads */}
          {signals.length > 0 && (
            <Card as="section" className="overflow-hidden">
              <h2 className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-[0.9375rem] font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" /> Needs attention
                <span className="tabular ml-auto text-sm font-normal text-stone-500">{signals.length} signals</span>
              </h2>
              <ul className="divide-y divide-line">
                {signals.map((s) => (
                  <li key={s.id} className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3 px-5 py-3">
                    <span className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", SEV[s.severity].text)}>
                      <span className={cx("h-2 w-2 rounded-full", SEV[s.severity].dot)} aria-hidden="true" />
                      {SEV[s.severity].label}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{s.title}</p>
                      {s.detail && <p className="mt-0.5 text-sm text-stone-500">{s.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <AdherenceOverview a={a} />
          <WeeklyGrid a={a} />
          <TodayStrip cells={todayLive} live={live} />
        </div>
        <div className="space-y-6">
          <InsightPanel insight={insight} />
          <FeedbackPanel
            data={data}
            a={a}
            onReply={(f) => setModal({ type: "recommend", planItemId: f.plan_item_id, feedbackIds: [f.id], quote: f.message })}
          />
          <ActivityLog actions={data.actions} />
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-sm text-stone-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Weekly figures cover the last 7 completed days. Today is shown separately until the day ends.
      </p>

      <ActionModals
        data={data}
        state={modal}
        onClose={() => setModal(null)}
        onDone={(m) => {
          setModal(null);
          setToast(m);
        }}
      />
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
