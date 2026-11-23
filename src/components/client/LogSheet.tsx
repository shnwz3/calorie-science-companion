"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { StatusIcon } from "@/components/StatusIcon";
import { Button, Chip, cx, Modal } from "@/components/ui";
import { formatTime } from "@/lib/dates";
import { HUNGER_LABEL, PREP_LABEL, REASON_LABEL, STATUS_OPTIONS } from "@/lib/labels";
import { deleteMealLog, saveMealLog } from "@/lib/repo";
import type { LogStatus, MealLog, PlanItem, PrepDifficulty, Reason } from "@/lib/types";

const REASONS: Reason[] = ["at_work", "no_time", "not_hungry", "unavailable", "social", "forgot", "other"];

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Field({ legend, optional, children, id }: { legend: string; optional?: boolean; children: ReactNode; id?: string }) {
  return (
    <fieldset id={id} className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-stone-900">
        {legend} {optional && <span className="font-normal text-stone-500">· optional</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** Arrow-key navigation for custom radio groups (WAI-ARIA radio pattern). */
function onRadioKeys(e: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
  const radios = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const i = radios.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  e.preventDefault();
  const next = radios[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : radios.length - 1)) % radios.length];
  next.focus();
  next.click();
}

export function LogSheet({
  item,
  date,
  existing,
  initialStatus,
  recentSubstitutes,
  onClose,
  onSaved,
}: {
  item: PlanItem;
  date: string;
  existing?: MealLog;
  initialStatus?: LogStatus;
  recentSubstitutes: string[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [status, setStatus] = useState<LogStatus | null>(existing?.status ?? initialStatus ?? null);
  const [substitute, setSubstitute] = useState(existing?.substitute_text ?? "");
  const [reason, setReason] = useState<Reason | null>(existing?.reason ?? null);
  const [hunger, setHunger] = useState<number | null>(existing?.hunger ?? null);
  const [prep, setPrep] = useState<PrepDifficulty | null>(existing?.prep_difficulty ?? null);
  const [time, setTime] = useState(existing?.actual_time ?? nowHHMM());
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const subRef = useRef<HTMLInputElement>(null);

  const needsReason = status === "partial" || status === "substituted" || status === "skipped";
  const ate = status !== null && status !== "skipped";
  const subMissing = status === "substituted" && substitute.trim().length === 0;

  async function save() {
    setTouched(true);
    if (!status) return;
    if (subMissing) {
      subRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveMealLog({
        client_id: item.client_id,
        plan_item_id: item.id,
        log_date: date,
        status,
        substitute_text: status === "substituted" ? substitute.trim() : null,
        reason: needsReason ? reason : null,
        hunger,
        prep_difficulty: ate ? prep : null,
        actual_time: ate ? time : null,
        comment: comment.trim() || null,
      });
      onSaved(status === "followed" ? `${item.label} logged as followed` : `${item.label} logged. Thank you for the detail.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save. Check your connection and try again.");
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await deleteMealLog(item.client_id, item.id, date);
      onSaved(`${item.label} log removed`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t remove the log.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item.label}
      description={`Planned for ${formatTime(item.planned_time)}: ${item.title.toLowerCase()}`}
      footer={
        <>
          <div className="flex gap-2">
          {existing && (
            <Button variant="danger" onClick={remove} disabled={saving} aria-label="Remove this log">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <Button variant="primary" size="lg" className="flex-1" onClick={save} disabled={!status} loading={saving}>
            Save
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-stone-500">Honest logs help Dr. Meera fit the plan to your week. There’s no wrong answer.</p>
        </>
      }
    >
      <div className="space-y-6">
        <Field legend="What actually happened?">
          <div role="radiogroup" aria-label="What actually happened?" onKeyDown={onRadioKeys} className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((o) => {
              const active = status === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active || (!status && o.value === "followed") ? 0 : -1}
                  onClick={() => setStatus(o.value)}
                  className={cx(
                    "flex min-h-16 items-start gap-2.5 rounded-lg border p-3 text-left transition-colors duration-150",
                    active ? "border-brand-700 bg-brand-50 ring-1 ring-brand-700" : "border-line bg-surface hover:border-stone-300",
                  )}
                >
                  <StatusIcon state={o.value} className={cx("mt-0.5 h-4 w-4 shrink-0", active ? "text-brand-700" : "text-stone-500")} />
                  <span>
                    <span className="block text-sm font-semibold leading-tight text-stone-900">{o.label}</span>
                    <span className="mt-0.5 block text-xs text-stone-500">{o.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        {status && (
          <div className="animate-fade space-y-6">
            {status === "substituted" && (
              <div>
                <label htmlFor="sub" className="mb-2 block text-sm font-semibold text-stone-900">
                  What did you have instead?
                </label>
                <input
                  id="sub"
                  ref={subRef}
                  autoFocus
                  value={substitute}
                  onChange={(e) => setSubstitute(e.target.value)}
                  placeholder="For example, a canteen thali"
                  aria-invalid={touched && subMissing}
                  aria-describedby={touched && subMissing ? "sub-err" : undefined}
                  className={cx(
                    "min-h-11 w-full rounded-lg border bg-surface px-3 text-[1rem] outline-none transition-colors focus:border-brand-600",
                    touched && subMissing ? "border-danger-500" : "border-line",
                  )}
                />
                {touched && subMissing && (
                  <p id="sub-err" className="mt-1.5 text-sm text-danger-600">
                    Add a few words so your practitioner knows what you ate.
                  </p>
                )}
                {recentSubstitutes.length > 0 && (
                  <div className="mt-2.5">
                    <p className="mb-1.5 text-xs text-stone-500">Recent</p>
                    <div className="flex flex-wrap gap-2">
                      {recentSubstitutes.slice(0, 4).map((s) => (
                        <Chip key={s} active={substitute === s} onClick={() => setSubstitute(s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {needsReason && (
              <Field legend="What got in the way?" optional>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <Chip key={r} active={reason === r} onClick={() => setReason(reason === r ? null : r)}>
                      {REASON_LABEL[r]}
                    </Chip>
                  ))}
                </div>
              </Field>
            )}

            <Field legend={ate ? "How did you feel afterwards?" : "How hungry were you?"} optional>
              <div role="radiogroup" aria-label="Hunger" onKeyDown={onRadioKeys} className="grid grid-cols-5 overflow-hidden rounded-lg border border-line">
                {[1, 2, 3, 4, 5].map((h) => (
                  <button
                    key={h}
                    type="button"
                    role="radio"
                    aria-checked={hunger === h}
                    aria-label={HUNGER_LABEL[h]}
                    tabIndex={hunger === h || (hunger == null && h === 3) ? 0 : -1}
                    onClick={() => setHunger(hunger === h ? null : h)}
                    className={cx(
                      "tabular min-h-11 border-l border-line text-sm font-semibold transition-colors first:border-l-0",
                      hunger === h ? "bg-brand-700 text-white" : "bg-surface text-stone-700 hover:bg-stone-50",
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-stone-500">
                <span>Very hungry</span>
                <span className="font-medium text-stone-800">{hunger ? HUNGER_LABEL[hunger] : "Satisfied"}</span>
                <span>Too full</span>
              </div>
            </Field>

            {ate && (
              <div className="grid grid-cols-[1fr_auto] items-start gap-4">
                <Field legend="Preparing it was" optional>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(PREP_LABEL) as PrepDifficulty[]).map((p) => (
                      <Chip key={p} active={prep === p} onClick={() => setPrep(prep === p ? null : p)}>
                        {PREP_LABEL[p]}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <div>
                  <label htmlFor="time" className="mb-2 block text-sm font-semibold text-stone-900">
                    Time
                  </label>
                  <input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="tabular min-h-10 rounded-lg border border-line bg-surface px-2 text-[1rem]"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="comment" className="mb-2 block text-sm font-semibold text-stone-900">
                Note for Dr. Meera <span className="font-normal text-stone-500">· optional</span>
              </label>
              <textarea
                id="comment"
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-[1rem] outline-none transition-colors focus:border-brand-600"
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            {error}
          </p>
        )}
      </div>

    </Modal>
  );
}
