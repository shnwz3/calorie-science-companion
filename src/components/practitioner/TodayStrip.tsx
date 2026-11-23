import { Card, cx, LiveDot } from "@/components/ui";
import type { Cell } from "@/lib/adherence";
import { formatTime } from "@/lib/dates";
import { REASON_LABEL, STATUS_LABEL, STATUS_STYLE } from "@/lib/labels";

/** Today's logging in real time. Kept separate from the weekly stats, which only count completed days. */
export function TodayStrip({ cells, live }: { cells: Cell[]; live: boolean }) {
  const logged = cells.filter((c) => c.log).length;
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Today so far <span className="font-normal text-stone-500">· {logged} of {cells.length} logged</span>
        </h2>
        <LiveDot live={live} />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cells.map((c) => (
          <div key={c.item.id} className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{c.item.label}</span>
              <span className="text-xs text-stone-500">{formatTime(c.item.planned_time)}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className={cx("h-2 w-2 rounded-full", STATUS_STYLE[c.state].dot)} />
              <span className="text-stone-700">
                {c.log?.status === "substituted" && c.log.substitute_text ? `Swapped: ${c.log.substitute_text}` : STATUS_LABEL[c.state]}
              </span>
            </div>
            {c.log?.reason && <div className="mt-0.5 text-xs text-stone-500">{REASON_LABEL[c.log.reason]}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}
