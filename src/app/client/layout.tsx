"use client";

import { BarChart3, CalendarDays, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClientDataProvider, useClientData } from "@/components/ClientDataProvider";
import { cx } from "@/components/ui";
import { DEMO_CLIENT_ID } from "@/lib/seed";

const TABS = [
  { href: "/client", label: "Today", icon: CalendarDays },
  { href: "/client/progress", label: "Progress", icon: BarChart3 },
  { href: "/client/messages", label: "Messages", icon: MessageCircle },
];

function BottomNav() {
  const path = usePathname();
  const { state } = useClientData();
  const unread =
    state.status === "ready" ? state.data.actions.filter((a) => a.visible_to_client && !a.client_seen_at).length : 0;
  return (
    <nav aria-label="Main" className="sticky bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
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
                  {showBadge && (
                    <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger-600 px-1 text-[0.6875rem] font-semibold leading-none text-white">
                      {unread}
                    </span>
                  )}
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

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientDataProvider clientId={DEMO_CLIENT_ID}>
      {/* Mobile-first: full-bleed on phones; on larger screens a phone-width column so the layout stays honest. */}
      <div className="min-h-dvh bg-stone-200/60 sm:py-6">
        <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper sm:min-h-[calc(100dvh-3rem)] sm:overflow-hidden sm:rounded-[1.75rem] sm:border sm:border-stone-300/70">
          <main className="flex-1">{children}</main>
          <BottomNav />
        </div>
      </div>
    </ClientDataProvider>
  );
}
