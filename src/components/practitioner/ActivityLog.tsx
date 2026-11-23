import { CheckCircle2, ClipboardList, Eye, EyeOff, Flag, FlagOff, Send, StickyNote } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { relativeTime } from "@/lib/dates";
import type { ActionType, PractitionerAction } from "@/lib/types";

const META: Record<ActionType, { icon: typeof Flag; label: string; tone: string }> = {
  note: { icon: StickyNote, label: "Note", tone: "bg-stone-100 text-stone-600" },
  flag: { icon: Flag, label: "Flagged for follow-up", tone: "bg-danger-100 text-danger-600" },
  unflag: { icon: FlagOff, label: "Flag cleared", tone: "bg-stone-100 text-stone-600" },
  recommendation: { icon: Send, label: "Recommendation sent", tone: "bg-brand-100 text-brand-700" },
  reviewed: { icon: CheckCircle2, label: "Marked as reviewed", tone: "bg-ok-100 text-ok-700" },
  plan_review: { icon: ClipboardList, label: "Plan review started", tone: "bg-info-100 text-info-700" },
};

export function ActivityLog({ actions }: { actions: PractitionerAction[] }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Activity & notes" subtitle="Everything done for this client, newest first" />
      {actions.length === 0 ? (
        <p className="text-sm text-stone-500">No actions yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-stone-200 pl-5">
          {actions.map((a) => {
            const m = META[a.type];
            const Icon = m.icon;
            return (
              <li key={a.id} className="relative">
                <span className={`absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full ring-4 ring-surface ${m.tone}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-stone-500">
                  <span className="font-medium text-stone-700">{m.label}</span>
                  <span>{relativeTime(a.created_at)}</span>
                  {a.visible_to_client &&
                    (a.client_seen_at ? (
                      <span className="inline-flex items-center gap-1 text-ok-600">
                        <Eye className="h-3 w-3" /> Seen by client
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-stone-500">
                        <EyeOff className="h-3 w-3" /> Not yet seen
                      </span>
                    ))}
                </div>
                {a.body && <p className="mt-0.5 text-sm text-stone-700">{a.body}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
