"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { toISODate } from "@/lib/dates";
import { resetDemo } from "@/lib/repo";

export function ResetDemoButton({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function reset() {
    if (!confirm("Reset the demo? All logs, messages and practitioner actions return to the starting scenario.")) return;
    setBusy(true);
    setMsg(null);
    try {
      await resetDemo(toISODate(new Date()));
      setMsg("Demo data reset");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button onClick={reset} loading={busy} size={size} className={className}>
        {!busy && <RotateCcw className="h-4 w-4" />} Reset demo data
      </Button>
      <span role="status" className="text-sm text-stone-500">{msg}</span>
    </span>
  );
}
