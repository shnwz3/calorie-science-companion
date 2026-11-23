import { Check, CircleDashed, Clock, Minus, Repeat2, SkipForward, SquareSplitHorizontal } from "lucide-react";
import type { SlotState } from "@/lib/types";

/** Shape for every state, so status never depends on colour alone (WCAG 1.4.1). */
const ICONS = {
  followed: Check,
  partial: SquareSplitHorizontal,
  substituted: Repeat2,
  skipped: SkipForward,
  not_logged: Minus,
  upcoming: Clock,
  due: CircleDashed,
} satisfies Record<SlotState, unknown>;

export function StatusIcon({ state, className }: { state: SlotState; className?: string }) {
  const Icon = ICONS[state];
  return <Icon className={className} aria-hidden="true" strokeWidth={2.25} />;
}
