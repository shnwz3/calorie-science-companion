import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { Logo } from "@/components/ui";

const VIEWS = [
  {
    href: "/demo",
    title: "Side-by-side",
    who: "Reviewers",
    body: "Ananya’s phone and Dr. Meera’s dashboard on one screen, sharing live data.",
    recommended: true,
  },
  {
    href: "/client",
    title: "Companion app",
    who: "Client · Ananya Rao",
    body: "Today’s plan, logging a meal in a few taps, progress and messages.",
  },
  {
    href: "/practitioner",
    title: "Practitioner workspace",
    who: "Practitioner · Dr. Meera Iyer",
    body: "Caseload ranked by need, adherence patterns, insight and follow-up actions.",
  },
];

const STEPS = [
  ["Read the case", "Open Ananya in the practitioner workspace. Start with “Needs attention” and the weekly pattern."],
  ["Respond", "On her afternoon-snack message, choose “Respond with recommendation” and send it."],
  ["See it land", "In the companion app the suggestion appears on Today and under the snack."],
  ["Log honestly", "Log a meal as “Something else”. The practitioner view updates on its own."],
  ["Adjust the plan", "Start a plan review. Ananya sees that her plan is being reviewed."],
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <Logo />

        <header className="mt-12">
          <p className="text-sm font-medium text-brand-700">Prototype · Adherence workflow</p>
          <h1 className="mt-2 font-serif text-[2rem] font-semibold leading-[1.15] tracking-tight text-stone-900 sm:text-[2.5rem]">
            What the client actually ate, and what the practitioner does about it.
          </h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-stone-600">
            Clients log what really happened at each meal. Practitioners see the patterns instead of reading every entry, and their response
            shows up in the client’s app.
          </p>
        </header>

        <nav aria-label="Open the prototype" className="mt-10">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {VIEWS.map((v) => (
              <li key={v.href}>
                <Link href={v.href} className="group flex items-start gap-4 px-5 py-5 transition-colors hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-900">{v.title}</span>
                      {v.recommended && <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Start here</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500">{v.who}</p>
                    <p className="mt-2 text-[0.9375rem] text-stone-700">{v.body}</p>
                  </div>
                  <ArrowUpRight
                    className="mt-1 h-5 w-5 shrink-0 text-stone-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="walk-h" className="mt-12">
          <h2 id="walk-h" className="font-serif text-xl font-semibold text-stone-900">
            A two-minute walkthrough
          </h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="tabular grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-sm font-semibold text-stone-700">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-stone-900">{title}</p>
                  <p className="text-[0.9375rem] text-stone-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-500">Demo data is shared by everyone with this link.</p>
          <ResetDemoButton />
        </footer>
      </div>
    </div>
  );
}
