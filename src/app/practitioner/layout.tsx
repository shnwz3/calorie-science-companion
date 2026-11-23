import { Users } from "lucide-react";
import Link from "next/link";
import { Avatar, Logo } from "@/components/ui";

export default function PractitionerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="CalorieScience home" className="inline-flex min-h-10 items-center">
              <Logo />
            </Link>
            <nav aria-label="Primary" className="hidden text-sm sm:block">
              <Link href="/practitioner" className="inline-flex items-center gap-1.5 font-medium text-stone-700 hover:text-brand-600">
                <Users className="h-4 w-4" /> Clients
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Avatar name="Meera Iyer" size="sm" />
            <span className="hidden text-stone-600 sm:inline">Dr. Meera Iyer</span>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
