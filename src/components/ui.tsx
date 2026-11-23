"use client";

import { AlertTriangle, Database, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import type { ClientBundle } from "@/lib/types";
import type { LoadState } from "@/lib/useClientBundle";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Flat mark: a leaf split by a stem. No gradient tile. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-brand-700">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path d="M12 2.5c4.8 2.6 7.5 6.6 7.5 11.1A7.5 7.5 0 0 1 12 21.1a7.5 7.5 0 0 1-7.5-7.5C4.5 9.1 7.2 5.1 12 2.5Z" fill="currentColor" />
        <path d="M12 7v14M12 12.5l3-2.5M12 16l-3-2.5" stroke="#f7f5f0" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
      {!compact && <span className="font-serif text-[1.0625rem] font-semibold tracking-tight text-stone-900">CalorieScience</span>}
    </span>
  );
}

export function Card({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  return <Tag className={cx("rounded-xl border border-line bg-surface", className)}>{children}</Tag>;
}

export function SectionTitle({ title, subtitle, right, id }: { title: string; subtitle?: string; right?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 id={id} className="text-[0.9375rem] font-semibold text-stone-900">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type BtnSize = "sm" | "md" | "lg";
export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; loading?: boolean }) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-brand-700 text-white hover:bg-brand-800",
    secondary: "bg-surface text-stone-800 border border-line hover:bg-stone-50 hover:border-stone-300",
    ghost: "text-stone-700 hover:bg-stone-100",
    danger: "bg-surface text-danger-600 border border-danger-200 hover:bg-danger-50",
    inverse: "bg-white/10 text-white border border-white/25 hover:bg-white/20",
  };
  const sizes: Record<BtnSize, string> = {
    sm: "min-h-9 px-3 text-sm",
    md: "min-h-11 px-4 text-sm sm:min-h-10", // 44px touch target on phones
    lg: "min-h-12 px-5 text-[0.9375rem]",
  };
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        sizes[size],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Toggle chip. Uses aria-pressed so screen readers announce the selected state. */
export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm transition-colors duration-150",
        active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-surface text-stone-700 hover:border-stone-300 hover:bg-stone-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: focus moves in on open, Tab is trapped, Escape closes,
 * focus returns to the trigger, and the page behind doesn't scroll.
 * Renders as a bottom sheet on phones and a centred dialog on larger screens.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Pinned below the scrollable body (primary actions stay reachable). */
  footer?: ReactNode;
  variant?: "center" | "sheet";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const first = ref.current?.querySelector<HTMLElement>("[autofocus]") ?? ref.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const [firstEl, lastEl] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-stone-950/35 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full animate-sheet flex-col overflow-hidden rounded-t-2xl bg-surface sm:max-w-lg sm:rounded-xl"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-stone-300 sm:hidden" aria-hidden="true" />
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pb-3.5 pt-3 sm:pt-4">
          <div>
            <h2 id={titleId} className="font-serif text-lg font-semibold leading-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-stone-500">
                {description}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className={cx("overflow-y-auto overscroll-contain px-5 pt-5", footer ? "pb-5" : "pb-[max(1.25rem,env(safe-area-inset-bottom))]")}>{children}</div>
        {footer && <footer className="border-t border-line bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</footer>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("animate-pulse rounded-lg bg-stone-200/60", className)} />;
}

/** Renders loading / setup / error states; children only when data is ready. */
export function LoadGate({
  state,
  onRetry,
  skeleton,
  children,
}: {
  state: LoadState;
  onRetry: () => void;
  skeleton: ReactNode;
  children: (data: ClientBundle) => ReactNode;
}) {
  if (state.status === "loading")
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading…</span>
        {skeleton}
      </div>
    );
  if (state.status === "setup")
    return (
      <Card className="mx-auto my-10 max-w-md p-6 text-center">
        <Database className="mx-auto h-7 w-7 text-brand-600" aria-hidden="true" />
        <h2 className="mt-3 font-semibold">Database not set up yet</h2>
        <p className="mt-1 text-sm text-stone-600">{state.message}</p>
        <Button className="mt-5" variant="primary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </Button>
      </Card>
    );
  if (state.status === "error")
    return (
      <Card className="mx-auto my-10 max-w-md p-6 text-center" as="section">
        <AlertTriangle className="mx-auto h-7 w-7 text-amber-600" aria-hidden="true" />
        <h2 className="mt-3 font-semibold">We couldn’t load this page</h2>
        <p className="mt-1 text-sm text-stone-600">{state.message}</p>
        <p className="mt-1 text-sm text-stone-500">Anything you already logged is saved. This is usually a connection problem.</p>
        <Button className="mt-5" variant="primary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </Button>
      </Card>
    );
  return <>{children(state.data)}</>;
}

/** Polite live region so screen readers announce confirmations. */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
      {message && <div className="animate-sheet rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white">{message}</div>}
    </div>
  );
}

export function LiveDot({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-stone-500" title={live ? "Updates appear automatically" : "Connecting…"}>
      <span className={cx("relative h-2 w-2 rounded-full", live ? "bg-ok-500" : "bg-stone-300")} aria-hidden="true">
        {live && <span className="absolute inset-0 animate-ping rounded-full bg-ok-500 opacity-40 motion-reduce:hidden" />}
      </span>
      {live ? "Synced" : "Connecting"}
    </span>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  const s = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" }[size];
  return (
    <span aria-hidden="true" className={cx("grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-800", s)}>
      {initials}
    </span>
  );
}
