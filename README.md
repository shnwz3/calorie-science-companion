# CalorieScience Companion: Adherence Workflow Prototype

A working prototype of the CalorieScience Companion adherence loop:

> **Client logs what actually happened → practitioner sees patterns (not raw entries) → practitioner acts → the client sees the response in their app.**

**Live demo:** _<add Vercel URL>_ · Best starting point: **`/demo`** (client phone + practitioner dashboard side by side, both live).

| Route | Who | What |
|---|---|---|
| `/demo` | Reviewer | Both experiences side by side, synced in real time |
| `/client` | Ananya (client, mobile-first) | Today's plan · one-tap logging · progress · messages |
| `/practitioner` | Dr. Meera (practitioner) | Caseload ranked by attention |
| `/practitioner/clients/ananya` | Practitioner | Adherence overview, weekly pattern, feedback, insight, actions |

---

## 1. Run locally

```bash
git clone <repo-url> && cd calorie-companion
npm install
cp .env.example .env.local        # add your Supabase URL + publishable (anon) key
# In Supabase → SQL Editor, run supabase/schema.sql once
npm run dev                        # http://localhost:3000
npm test                           # adherence + insight unit tests (Vitest)
```

Demo data seeds itself on first load (relative to today's date, so the 7-day history never goes stale). Use **Reset demo data** on `/` or `/demo` to return to the starting scenario.

---

## 2. Architecture

```
Next.js 16 (App Router, React 19, TypeScript, Tailwind v4) on Vercel
│
├── src/lib/           ← framework-free domain logic
│   ├── types.ts         domain model (mirrors SQL)
│   ├── adherence.ts     pure adherence engine + attention signals   ← unit-tested
│   ├── insights.ts      rules-based insight (observed / possible / consider) ← unit-tested
│   ├── seed.ts          deterministic scenario generator (relative dates)
│   ├── repo.ts          the ONLY module that talks to the database
│   └── useClientBundle.ts  load + Supabase Realtime subscription (shared by both apps)
│
├── src/app/client/*        mobile-first client app (one shared data provider per layout)
├── src/app/practitioner/*  desktop-first practitioner app
└── supabase/schema.sql     tables, constraints, RLS, realtime publication
            │
            ▼
   Supabase Postgres + Realtime  (shared state between both experiences)
```

**Why this shape:**
- **The domain logic is pure functions.** Adherence and insight rules carry most of the clinical risk, so they are deterministic, have no I/O and are covered by tests (`src/lib/adherence.test.ts`). The UI only renders their output.
- **A single repository module.** Every read and write goes through `repo.ts`, so moving to an API layer (for example Next.js route handlers or Supabase Edge Functions) means changing one file.
- **Realtime instead of polling.** Both apps subscribe to row changes for the client, so a practitioner recommendation shows up on the client's phone within about a second. That is the "believable workflow" the brief asks for.
- **No server code beyond the database.** The brief asks not to build unnecessary backend infrastructure. Postgres with constraints, RLS and realtime is the backend.

## 3. Technology choices

| Choice | Reason |
|---|---|
| Next.js + TypeScript | One codebase holds two experiences with typed shared domain logic; deploys to Vercel with no configuration |
| Tailwind CSS | Fast, consistent, responsive UI without a component library |
| Supabase (Postgres + Realtime) | Real relational data with integrity constraints, plus live sync between client and practitioner, with no custom server |
| Rules-based insight (no LLM) | Deterministic, explainable and testable. Every statement traces to counted data. No risk of hallucinated clinical claims. See §10 for where an LLM would fit |
| Vitest | Fast unit tests for the adherence engine |
| lucide-react | Icons |

## 4. Data model

```
clients ─┬─< meal_plan_items      (PLANNED: what the practitioner prescribed)
         ├─< meal_logs            (ACTUAL: what the client did; unique per client+meal+day)
         ├─< client_feedback      (issues raised by the client: open → acknowledged → resolved)
         └─< practitioner_actions (append-only audit trail: note, flag, unflag,
                                    recommendation, reviewed, plan_review)
```

Key integrity decisions:
- **Plan and behaviour are separate tables.** Client logs never modify the plan, and the plan is never inferred from logs.
- **A missing row means "not logged".** There is no fake "skipped" row. `unique(client_id, plan_item_id, log_date)` makes logging idempotent (the app upserts, and editing a log replaces it).
- **`check` constraints** on every enum-like column (status, reason, hunger 1–5, and others).
- **Actions are append-only.** State changes such as flags and review status are written to `clients` and also recorded as an action row, giving an audit trail.
- **Feedback-to-response linkage.** A recommendation sent in reply to a message resolves that message, so the client sees "Answered".
- **`visible_to_client` + `client_seen_at`** on actions. The client gets an unread badge, and the practitioner sees "Seen by client".

## 5. Adherence calculation

| Logged status | Weight |
|---|---|
| Followed as planned | 1 |
| Partly followed | ½ |
| Substituted | ½ (the client ate, but nutritional fit is unknown, so swaps are always shown separately) |
| Skipped | 0 |
| **Not logged** | **excluded**: missing data, not non-adherence |

- **Adherence = weighted mean over *logged* meals only.** Shown as "62% across 23 logged meals", never as a bare number.
- **Logging coverage = logged ÷ planned**, shown next to the score. A client who logs only their good days gets high adherence but low coverage, and the low coverage flags them.
- **Window = the last 7 completed days.** Today is excluded until the day is over, so an unfinished day never drags the numbers down.
- **Trend** compares the second half of the window with the first half.
- A pattern needs at least 3 logs for that meal (`MIN_LOGS_FOR_PATTERN`). The insight engine refuses to infer anything from fewer than 6 logged meals in total.

**Attention signals** decide who the practitioner looks at first. Each is evidence-based and explains itself:

| Signal | Rule | Severity |
|---|---|---|
| Unanswered client message | any `open` feedback | high |
| Client gone quiet | no log in 2+ days | high |
| Meal repeatedly skipped | skipped ≥ 50% of logged (≥ 4 → high) | medium/high |
| Meal repeatedly swapped | substituted ≥ 50% of logged | medium |
| Hunger reported | ≥ 2 logs rated "very/still hungry" | medium |
| Timing drift | mean deviation ≥ 60 min from planned | low |
| Logging gaps | coverage < 80% | low |
| Not reviewed | no review in the window | low |

The client list is sorted by the sum of severity points (high 3, medium 2, low 1, +3 if flagged). This is how the model scales to 50–100 clients: the practitioner works top-down and opens only the clients whose signals need them.

## 6. Key product decisions

**What the client sees first:** today's date, a progress strip of meals *logged* (not meals "complied with"), any new message from the practitioner, and then the plan with the next meal highlighted. Due meals have a one-tap **Followed** button. Anything else opens a short sheet where only the status is required and the details appear only when they're relevant, so logging takes 2–5 seconds.

**Encouraging honesty instead of guilt:**
- There is no percentage score on the client side. Progress counts *logging*, and the streak is a logging streak.
- Neutral language ("Had something else", "Partly followed") and neutral colours (skipped is amber, never red).
- Copy that rewards honest reporting, for example: "Thanks for logging the meals that didn't go to plan — that's the most useful information."
- "Harder to fit in" frames a problem meal as possibly the *plan's* fault and links directly to messaging the practitioner.

**What the practitioner sees first:** "Needs attention" signals, then the overview (score *with* coverage and a full breakdown), the weekly meal × day grid (patterns by meal and timing are visible at a glance, with weekends distinguishable), and the insight beside it. Raw entries are one click away: click a grid cell for the full log.

**Non-adherence vs missing data:** these are kept separate throughout. The grid shows hatched "Not logged" cells, the stats exclude them, and the insight says "Confirm unlogged days with the client before treating them as non-adherence."

**Insight that distinguishes observation from assumption:** three labelled groups:
- *Observed* (counts and quotes)
- *Possible explanations*, tagged "assumption · not confirmed" and each listing what supports it
- *You may want to consider*, suggestions rather than prescriptions

There are no clinical conclusions, and a footer says this is not a clinical assessment.

**Closing the loop (Part C).** Five actions are implemented:

| Action | Visible effect |
|---|---|
| **Send recommendation** (optionally tied to a meal and a client message) | Appears on the client's Today screen as a highlighted card, inline under the related meal, and in Messages. The client's message is marked "Answered". The practitioner sees "Seen by client" once it's read. |
| **Start plan review** (records the proposed adjustment, practitioner-only) | The client sees a "Your plan is being reviewed" banner |
| **Flag for follow-up / clear** | Moves the client to the top of the caseload list |
| **Mark reviewed** | Acknowledges open messages (the client sees "Seen by Dr. Meera") |
| **Private note** | Practitioner-only audit trail |

## 7. UI & frontend decisions

**Visual direction: calm, clinical, editorial.** This is a health product used daily by clients and reviewed by clinicians, so the UI should feel trustworthy and quiet, not like a marketing template.

- **Design tokens** live in `src/app/globals.css` (`@theme`): a warm paper background, one deep-green brand scale, semantic `ok / info / danger / plum` scales, and a status palette (`st-followed`, `st-partial`, `st-swapped`, `st-skipped`). Components never use raw hex values for meaning.
- **Typography:** Public Sans for the UI (neutral, highly legible, tabular figures for numbers) and Source Serif 4 used sparingly for page titles. Body text is at least 14px; inputs are 16px so iOS doesn't zoom on focus.
- **Status palette:**
  - The four colours have similar lightness so no state "shouts".
  - Skipped is ochre, never red, which encourages honest reporting.
  - Every colour meets WCAG AA (≥ 4.5:1) with white text. Ratios were computed, not eyeballed.
  - "Not logged" is a neutral hatch pattern, because it is missing data, not a status.
- **Colour is never the only signal (WCAG 1.4.1):** every status also has an icon (`StatusIcon`) and a text label, and severity in "Needs attention" is written out (High / Medium / Low).
- **Deliberately avoided:** gradients, emoji used as UI, sparkle icons, heavy drop shadows, rounded-everything card soup, and uppercase micro-labels. Surfaces are flat with hairline borders.

**Client app: mobile-first, responsive up to desktop.** The brief asks for a *mobile-first* client experience and *responsive* design. Clients mostly log on their phone after a meal, so the phone layout is the primary design and the larger layouts are built up from it:

| Width | Layout |
|---|---|
| < 768px (phones) | Bottom tab bar, single column, logging as a bottom sheet, safe-area insets respected |
| 768–1023px (tablets) | Persistent side rail; one comfortable content column |
| ≥ 1024px (laptops/desktops) | Side rail plus two columns: the Today timeline with a sticky "at a glance" panel, Messages as conversation and composer side by side, Progress with a full-width week grid |

- Today is a vertical day timeline with the next meal highlighted.
- Logging takes one tap ("As planned"). Anything else opens a sheet where only the status is required and the details appear only when relevant (progressive disclosure). On desktop the sheet becomes a centred dialog.
- Touch targets are at least 44px. Navigation uses `aria-current`.
- Each breakpoint was checked at 375, 768, 1024 and 1440px, both for horizontal overflow and for columns being squeezed too narrow.

**Practitioner workspace:**
- The reading order matches the decision order: *Needs attention → overview → weekly pattern → insight → feedback → activity*.
- There is one primary action (Send recommendation). The rest are secondary or ghost buttons, so the hierarchy is obvious.

**Frontend practices applied:**
- An accessible dialog: focus moves in, Tab is trapped, Escape closes, focus returns to the trigger, scroll is locked, and the dialog is labelled with `aria-labelledby` and `aria-describedby`.
- WAI-ARIA radio groups with arrow-key support for the status and hunger pickers.
- `aria-live` regions for toasts and loading, a skip link, a global `:focus-visible` style, and `cursor: pointer` restored (Tailwind v4 removes it).
- `prefers-reduced-motion` is respected. Animations only use opacity and transform, which avoids layout thrash.
- Verified no horizontal overflow at 375px on every route. Two real bugs were found and fixed this way: an `auto` grid track growing to a table's min-content width, and `<fieldset>`'s default `min-width: min-content`.
- Every screen has a skeleton loading state, a setup/error state with a retry, and an empty state.

## 8. Assumptions

- One practitioner (Dr. Meera Iyer) and one live client (Ananya Rao). The other clients on the caseload screen are static samples to show how ranking scales.
- Ananya is in week 2 of 4. The plan is vegetarian and home-style Indian, consistent with the brief.
- Workdays are Monday to Friday. Weekday and weekend behaviour in the seed follows the real calendar.
- Hunger and satiety use a 5-point scale (1 very hungry … 3 satisfied … 5 too full). "Low hunger" means a rating of 2 or below.
- A meal becomes "Ready to log" 30 minutes before its planned time.
- Dates are the client's local calendar dates.

## 9. What is mocked / simulated

| Area | Prototype | Production |
|---|---|---|
| Auth & roles | None. Roles are chosen on the landing page. RLS allows the anon key full access to the demo tables | Supabase Auth with RLS keyed on `auth.uid()`: clients read and write only their own rows, practitioners only their assigned clients. Practitioner endpoints behind role claims |
| Seed data | Generated in the browser (`seed.ts`) relative to today. Reset deletes and re-inserts | Real logs. No reset |
| Caseload | Ananya is live. Five sample rows are static | Signals computed server-side, for example a nightly or on-write job materialising `client_adherence_summary` |
| Messaging | Feedback rows plus recommendation actions. No push | Push notifications (Expo or FCM) when a recommendation is sent. Email digest to the practitioner |
| Plan review | Records the proposed adjustment and status | Versioned plans (`meal_plans` with `version` and `effective_from`). Logs reference the plan version, so adherence stays correct across plan changes |
| Writes | Direct from the browser through Supabase JS | Same, but behind RLS, or through Edge Functions for composite actions so they're transactional |

## 10. Known limitations

- Composite practitioner actions (for example flag = update client + insert action) are two requests, not one transaction. In production these would be Postgres RPC functions.
- The demo dataset is shared by everyone with the link. Reset restores it.
- There is no plan versioning, so changing the plan would reinterpret history. See §9.
- Times are not timezone-normalised across devices.
- Insight is rules-based. An LLM could later turn the *same structured observations* into a narrative summary, constrained to cite only provided facts. That would add value at the narrative step, not by deciding what the facts are.
- Accessibility: keyboard focus, ARIA labels and reduced-motion are handled, but no formal audit has been done.

## 11. AI tools used

- **Claude Code (Claude Opus)**: used as a pair programmer for scaffolding, the first drafts of components and SQL, and the test cases.
- Product decisions, adherence rules, the data model and wording were reviewed and adjusted by hand. See the technical reflection.

---

## Technical reflection

**Most difficult decision:** how to calculate adherence without punishing missing data or rewarding selective logging. The answer was two numbers, *adherence over logged meals* and *logging coverage*, which are never shown separately on the practitioner side. A related choice was weighting substitutions at ½. A substitution isn't non-adherence, because the client ate, but we can't judge it nutritionally, so it's always surfaced as its own category instead of being hidden inside the score.

**Deliberately left out:** authentication, plan editing and versioning, push notifications, a nutrition database or macro tracking, photo logging, and LLM-generated insight. Each would have taken time away from making one loop work end to end.

**Before production:** real auth with per-role RLS, transactional RPCs for composite actions, plan versioning, server-side computation of the adherence summary for large caseloads, timezone handling, error monitoring, and a clinical review of the insight wording.

**What I'd build next:**
1. Plan versioning, with a "publish adjustment" step that turns a plan review into a new plan version the client accepts.
2. Push notifications.
3. Weekly check-in prompts for the client.
4. An optional LLM narrative layer over the structured insight.
5. Caseload filters (for example "unanswered > 48h").

**Where AI accelerated development:** boilerplate (Next.js and Supabase wiring, Tailwind layout), the first drafts of the grid and modals, the SQL schema, and test scaffolding.

**What I validated or debugged personally:** _fill in, for example: the adherence weights and the missing-data rule, the seed scenario matching the brief, the realtime sync between both views, the insight wording (observed vs assumed), mobile layout on a real phone, and the end-to-end walkthrough._
