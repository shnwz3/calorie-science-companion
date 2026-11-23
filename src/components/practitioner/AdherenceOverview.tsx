import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from "lucide-react";
import { Card, cx, SectionTitle } from "@/components/ui";
import type { WeeklyAnalysis } from "@/lib/adherence";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/labels";

const SEGMENTS = ["followed", "partial", "substituted", "skipped", "not_logged"] as const;

export function AdherenceOverview({ a }: { a: WeeklyAnalysis }) {
  const t = a.totals;
  const value = (k: (typeof SEGMENTS)[number]) => (k === "not_logged" ? t.notLogged : t[k]);
  const pct = (n: number) => (t.planned ? (n / t.planned) * 100 : 0);
  const { earlier, recent } = a.trend;
  const delta = earlier != null && recent != null ? recent - earlier : null;

  return (
    <Card className="p-5">
      <SectionTitle title="Adherence overview" subtitle={`Last ${a.days.length} days · ${t.planned} planned meals`} />

      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="sm:border-r sm:border-line sm:pr-8">
          <div className="tabular font-serif text-5xl font-semibold tracking-tight text-stone-900">{a.score == null ? "—" : `${Math.round(a.score * 100)}%`}</div>
          <div className="mt-0.5 text-xs text-stone-500">
            adherence across <span className="font-medium text-stone-700">{t.logged} logged</span> meals
          </div>
          <div className="mt-2 text-xs text-stone-500">
            Logging coverage{" "}
            <span className={cx("font-medium", (a.coverage ?? 0) < 0.8 ? "text-amber-700" : "text-stone-700")}>
              {t.logged}/{t.planned} ({Math.round((a.coverage ?? 0) * 100)}%)
            </span>
          </div>
          {delta != null && (
            <div
              className={cx(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                delta > 0.05 ? "bg-ok-50 text-ok-700" : delta < -0.05 ? "bg-amber-50 text-amber-700" : "bg-stone-50 text-stone-600",
              )}
              title="Second half of the week vs first half, over logged meals"
            >
              {delta > 0.05 ? <ArrowUpRight className="h-3 w-3" /> : delta < -0.05 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
              {delta > 0.05 ? "Improving" : delta < -0.05 ? "Declining" : "Stable"} vs earlier in week
            </div>
          )}
        </div>

        <div>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`Of ${t.planned} planned meals: ${t.followed} followed, ${t.partial} partly followed, ${t.substituted} swapped, ${t.skipped} skipped, ${t.notLogged} not logged`}>
            {SEGMENTS.map((k) =>
              value(k) ? (
                <div key={k} className={cx("h-full", k === "not_logged" ? STATUS_STYLE.not_logged.cell : STATUS_STYLE[k].dot)} style={{ width: `${pct(value(k))}%` }} title={`${STATUS_LABEL[k]}: ${value(k)}`} />
              ) : null,
            )}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-y-4 sm:grid-cols-5">
            {SEGMENTS.map((k) => (
              <div key={k} className="flex flex-col-reverse border-l border-line pl-3">
                <dt className="flex items-center gap-1.5 text-xs text-stone-500">
                  <span aria-hidden="true" className={cx("h-2.5 w-2.5 rounded-sm", k === "not_logged" ? "hatch" : STATUS_STYLE[k].dot)} />
                  {STATUS_LABEL[k]}
                </dt>
                <dd className="tabular text-xl font-semibold text-stone-900">{value(k)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-1.5 text-xs text-stone-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Followed = 1, partly followed or swapped = ½, skipped = 0, averaged over logged meals only. Unlogged meals are missing data, not non-adherence.
      </p>
    </Card>
  );
}
