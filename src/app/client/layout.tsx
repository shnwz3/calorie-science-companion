"use client";

import { BarChart3, CalendarDays, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClientDataProvider, useClientData } from "@/components/ClientDataProvider";
import { Avatar, cx, Logo } from "@/components/ui";
import { DEMO_CLIENT_ID } from "@/lib/seed";

const TABS = [
  { href: "/client", label: "Today", icon: CalendarDays },
  { href: "/client/progress", label: "Progress", icon: BarChart3 },
  { href: "/client/messages", label: "Messages", icon: MessageCircle },
];

function useUnread() {
  const { state } = useClientData();
  return state.status === "ready" ? state.data.actions.filter((a) => a.visible_to_client && !a.client_seen_at).length : 0;
}

function UnreadBadge({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cx("grid h-4 min-w-4 place-items-center rounded-full bg-danger-600 px-1 text-[0.6875rem] font-semibold leading-none text-white", className)}>
      {n}
    </span>
  );
}

/** Phone: thumb-reachable bottom tab bar. */
function BottomNav() {
  const path = usePathname();
  const unread = useUnread();
  return (
    <nav aria-label="Main" className="sticky bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          const showBadge = href === "/client/messages" && unread > 0;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active ? "text-brand-700" : "text-stone-500 hover:text-stone-800",
                )}
              >
                {active && <span aria-hidden="true" className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-brand-700" />}
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={active ? 2.25 : 1.75} />
                  {showBadge && <UnreadBadge n={unread} className="absolute -right-2.5 -top-1.5" />}
                </span>
                {label}
                {showBadge && <span className="sr-only">, {unread} unread</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tablet/desktop: persistent side rail, the usual pattern once there's horizontal room. */
function SideNav() {
  const path = usePathname();
  const unread = useUnread();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex lg:w-64">
      <Link href="/" className="inline-flex min-h-10 items-center px-2" aria-label="CalorieScience home">
        <Logo />
      </Link>
      <nav aria-label="Main" className="mt-8">
        <ul className="space-y-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            const showBadge = href === "/client/messages" && unread > 0;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors",
                    active ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                  {showBadge && (
                    <>
                      <UnreadBadge n={unread} className="ml-auto" />
                      <span className="sr-only"> unread</span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto rounded-xl border border-line bg-paper p-3">
        <p className="text-xs font-medium text-stone-500">Your practitioner</p>
        <div className="mt-2 flex items-center gap-2.5">
          <Avatar name="Meera Iyer" size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-900">Dr. Meera Iyer</p>
            <p className="text-xs text-stone-500">Replies within a day</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientDataProvider clientId={DEMO_CLIENT_ID}>
      {/*
        Mobile-first:
        - < 640px: full-bleed phone layout with bottom tabs.
        - 640–767px: same phone layout, framed so it doesn't stretch awkwardly.
        - ≥ 768px: full app shell with a side rail and wider, multi-column pages.
      */}
      <div className="min-h-dvh bg-stone-200/60 sm:py-6 md:flex md:bg-paper md:py-0">
        <SideNav />
        <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper sm:min-h-[calc(100dvh-3rem)] sm:overflow-hidden sm:rounded-[1.75rem] sm:border sm:border-stone-300/70 md:mx-0 md:min-h-dvh md:max-w-none md:flex-1 md:overflow-visible md:rounded-none md:border-0">
          <main id="main" className="mx-auto w-full flex-1 md:max-w-6xl">
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </ClientDataProvider>
  );
}
