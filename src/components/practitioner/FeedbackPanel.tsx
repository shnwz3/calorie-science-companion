"use client";

import { Check, MessageSquareQuote, Reply } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, cx, SectionTitle } from "@/components/ui";
import type { WeeklyAnalysis } from "@/lib/adherence";
import { relativeTime, weekdayShort } from "@/lib/dates";
import { FEEDBACK_CATEGORY_LABEL, REASON_LABEL } from "@/lib/labels";
import { setFeedbackStatus } from "@/lib/repo";
import type { ClientBundle, Feedback, Reason } from "@/lib/types";

const STATUS_BADGE = {
  open: "bg-danger-50 text-danger-700",
  acknowledged: "bg-stone-100 text-stone-600",
  resolved: "bg-ok-50 text-ok-700",
};

export function FeedbackPanel({
  data,
  a,
  onReply,
}: {
  data: ClientBundle;
  a: WeeklyAnalysis;
  onReply: (f: Feedback) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const meal = (id: string | null) => data.plan.find((p) => p.id === id)?.label;
  const sorted = [...data.feedback].sort((x, y) => (x.status === "open" ? -1 : 0) - (y.status === "open" ? -1 : 0) || y.created_at.localeCompare(x.created_at));

  // Aggregate barriers across meals: reason → { total, byMeal }
  const barriers = new Map<Reason, { total: number; byMeal: string[] }>();
  for (const m of a.perMeal) {
    for (const [r, n] of Object.entries(m.reasons) as [Reason, number][]) {
      const b = barriers.get(r) ?? { total: 0, byMeal: [] };
      b.total += n;
      b.byMeal.push(`${m.item.label} ${n}`);
      barriers.set(r, b);
    }
  }
  const barrierList = [...barriers.entries()].sort((x, y) => y[1].total - x[1].total);
  const maxBarrier = barrierList[0]?.[1].total ?? 1;

  const comments = a.perMeal
    .flatMap((m) => m.cells.filter((c) => c.log?.comment).map((c) => ({ c, label: m.item.label })))
    .sort((x, y) => y.c.date.localeCompare(x.c.date))
    .slice(0, 5);

  async function ack(id: string) {
    setBusy(id);
    try {
      await setFeedbackStatus([id], "acknowledged");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <SectionTitle
        title="Client feedback & barriers"
        subtitle={`${data.feedback.filter((f) => f.status === "open").length} open message(s)`}
      />

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-stone-500">No messages from the client yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((f) => (
            <li key={f.id} className={cx("rounded-lg border p-3.5", f.status === "open" ? "border-l-4 border-line border-l-danger-500 bg-surface" : "border-line bg-paper")}>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge className={STATUS_BADGE[f.status]}>{f.status}</Badge>
                {meal(f.plan_item_id) && <Badge className="bg-stone-100 text-stone-700">{meal(f.plan_item_id)}</Badge>}
                <Badge className="bg-stone-100 text-stone-700">{FEEDBACK_CATEGORY_LABEL[f.category]}</Badge>
                <span className="ml-auto text-stone-500">{relativeTime(f.created_at)}</span>
              </div>
              <blockquote className="mt-2 text-[0.9375rem] leading-relaxed text-stone-900">“{f.message}”</blockquote>
              {f.status !== "resolved" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => onReply(f)}>
                    <Reply className="h-4 w-4" aria-hidden="true" /> Respond with recommendation
                  </Button>
                  {f.status === "open" && (
                    <Button size="sm" onClick={() => ack(f.id)} loading={busy === f.id}>
                      {busy !== f.id && <Check className="h-4 w-4" aria-hidden="true" />} Acknowledge
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {barrierList.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-stone-800">Reasons logged for missed / changed meals</h3>
          <ul className="space-y-1.5">
            {barrierList.map(([r, b]) => (
              <li key={r} className="grid grid-cols-[8.5rem_1fr] items-center gap-2 text-sm">
                <span className="truncate text-stone-700">{REASON_LABEL[r]}</span>
                <span className="flex items-center gap-2">
                  <span className="h-2 rounded-full bg-plum-400" style={{ width: `${(b.total / maxBarrier) * 60}%` }} />
                  <span className="whitespace-nowrap text-xs text-stone-500">
                    {b.total}× · {b.byMeal.join(", ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {comments.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-stone-800">Recent comments on meal logs</h3>
          <ul className="space-y-1.5">
            {comments.map(({ c, label }) => (
              <li key={c.log!.id} className="flex gap-2 text-sm">
                <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" />
                <span>
                  <span className="italic text-stone-700">“{c.log!.comment}”</span>
                  <span className="text-xs text-stone-500">
                    {" "}
                    · {label}, {weekdayShort(c.date)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
