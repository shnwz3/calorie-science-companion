import { ArrowLeft, LayoutDashboard, Smartphone } from "lucide-react";
import Link from "next/link";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { Logo } from "@/components/ui";

export const metadata = { title: "Side-by-side demo" };

export default function DemoPage() {
  return (
    <div className="flex h-dvh flex-col bg-stone-200/60">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-stone-500 hover:text-stone-800" aria-label="Home">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo />
          <span className="hidden text-sm text-stone-500 md:inline">Both views share the same live database</span>
        </div>
        <ResetDemoButton size="sm" />
      </header>
      {/* Two independent pages in iframes = two real "devices" talking through Supabase Realtime. */}
      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[400px_1fr]">
        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-xs font-medium text-stone-600">
            <Smartphone className="h-3.5 w-3.5" /> Client · Ananya’s phone
          </div>
          <iframe src="/client" title="Client app" className="min-h-0 flex-1" />
        </section>
        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-xs font-medium text-stone-600">
            <LayoutDashboard className="h-3.5 w-3.5" /> Practitioner · CalorieScience web
          </div>
          <iframe src="/practitioner/clients/ananya" title="Practitioner dashboard" className="min-h-0 flex-1" />
        </section>
      </div>
    </div>
  );
}
