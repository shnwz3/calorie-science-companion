# CalorieScience Companion: Adherence Workflow

A working prototype of the client ↔ practitioner adherence loop:

> The client logs what actually happened → the practitioner sees patterns instead of raw entries → the practitioner acts → the client sees the response in their app.

**[Open the live prototype](https://calorie-science-companion.vercel.app/demo)** · **[Watch the 4-minute walkthrough](https://drive.google.com/file/d/118JKmd2QAyHxjMd-GJQb_tfAd8ZZYsYC/view)**

| Route | For | What's there |
|---|---|---|
| `/demo` | Reviewers | Client phone and practitioner dashboard side by side, live |
| `/client` | Ananya (client) | Today's plan, logging, progress, messages |
| `/practitioner` | Dr. Meera (practitioner) | Caseload sorted by who needs attention |
| `/practitioner/clients/ananya` | Practitioner | Adherence overview, weekly pattern, feedback, insight, actions |

Data is shared by everyone using the link. **Reset demo data** (on `/` or `/demo`) puts it back to the starting scenario.

## Run locally

```bash
git clone https://github.com/shnwz3/calorie-science-companion.git
cd calorie-science-companion
npm install
cp .env.example .env.local     # add your Supabase URL and publishable key
# run supabase/schema.sql once in the Supabase SQL editor
npm run dev                     # http://localhost:3000
npm test                        # unit tests for the adherence and insight logic
```

The demo data seeds itself on first load, with dates relative to today so the 7-day history never goes stale.

## Architecture

```
Next.js (App Router, TypeScript, Tailwind) on Vercel
  src/lib/adherence.ts   adherence calculation + attention rules (pure functions, tested)
  src/lib/insights.ts    rules-based practitioner insight (pure functions, tested)
  src/lib/repo.ts        the only file that talks to the database
  src/lib/seed.ts        Ananya's 7-day scenario
  src/app/client         client app
  src/app/practitioner   practitioner app
        │
        ▼
Supabase Postgres + Realtime (shared data between both apps)
```

- The adherence and insight rules are plain functions with no I/O, so they're easy to test and reason about. The UI only displays their results.
- Both apps subscribe to database changes, so a practitioner's recommendation shows up on the client's screen within about a second.
- There's no custom backend. The brief asked not to build unnecessary infrastructure, and Postgres with constraints and realtime was enough.

## Technology choices

| Choice | Why |
|---|---|
| Next.js + TypeScript | One codebase for both apps, shared types, easy Vercel deploy |
| Tailwind CSS | Quick to build a consistent, responsive UI |
| Supabase | Real Postgres with constraints, plus realtime sync, without writing a server |
| Rules instead of an LLM for insight | Predictable, testable, and every statement can be traced back to the logs |
| Vitest | Unit tests for the adherence logic |

## Data model

```
clients
  ├── meal_plan_items        what was planned
  ├── meal_logs              what actually happened (one per client + meal + day)
  ├── client_feedback        issues raised by the client (open → acknowledged → resolved)
  └── practitioner_actions   notes, flags, recommendations, reviews (append-only history)
```

- The plan and the logs are separate tables. A log never changes the plan.
- If there is no log for a meal, it is "not logged". The app never invents a "skipped" entry.
- Status, reason and hunger columns have database checks, so bad values can't be saved.
- Recommendations record whether the client has seen them, so the practitioner knows the message landed.

## Adherence calculation

| Logged as | Counts as |
|---|---|
| Followed | 1 |
| Partly followed | ½ |
| Had something else | ½ (they ate, but we can't judge the swap, so swaps are always shown separately) |
| Skipped | 0 |
| Not logged | left out of the score |

- **Adherence** is the average over *logged* meals only.
- **Logging coverage** (logged ÷ planned) is always shown next to it. Someone who only logs good days gets a high score but low coverage, and the low coverage gets flagged.
- The window is the last 7 completed days. Today is shown separately until it's over.
- A pattern needs at least 3 logs for that meal, and the insight won't draw conclusions from fewer than 6 logged meals.

**What puts a client at the top of the list:**

| Signal | Rule | Priority |
|---|---|---|
| Unanswered client message | any open message | High |
| Client has gone quiet | nothing logged for 2+ days | High |
| Meal often skipped | skipped on half or more of logged days | Medium (High at 4+) |
| Meal often swapped | swapped on half or more of logged days | Medium |
| Hunger reported | rated hungry 2+ times | Medium |
| Meal times drifting | an hour or more off the plan on average | Low |
| Logging gaps | under 80% logged | Low |
| Not reviewed this week | | Low |

Clients are sorted by these signals, so with 50–100 clients the practitioner can work from the top and only open the ones that need it.

## Key product decisions

- **Client first screen:** today's meals as a timeline, the next meal highlighted, and a count of meals *logged*. There's no compliance score on the client side.
- **Fast, honest logging:** "As planned" is one tap. Anything else opens a short form where only "what happened" is required. The wording is neutral, skipped meals aren't shown in red, and the app thanks the client for logging meals that didn't go to plan.
- **Practitioner first screen:** "Needs attention", then the score with its coverage and breakdown, then a meal × day grid where problem meals stand out. Any cell opens the raw log.
- **Missing data isn't non-adherence:** unlogged meals are shown hatched, left out of the score, and the insight suggests checking with the client first.
- **Facts vs assumptions:** the insight is split into *Observed* (counts and quotes), *Possible explanations* (marked "not confirmed") and *You may want to consider*. It doesn't make clinical conclusions.
- **Closing the loop:** five practitioner actions:
  - **Send recommendation:** shows on the client's Today screen and under the related meal, marks their message "Answered", and the practitioner sees "Seen by client".
  - **Start plan review:** the client sees "Your plan is being reviewed".
  - **Flag for follow-up**, **Mark reviewed** and **Add note**.

## UI and responsive design

- The client app is mobile-first because clients log on their phone after eating. It is responsive up to desktop:
  - **Phones:** bottom tabs, one column.
  - **Tablets:** a side menu.
  - **Laptops:** two-column pages.
- The practitioner dashboard works on phones but is designed for a laptop.
- The visual style is calm and plain on purpose: a warm background, one green brand colour, and status colours that don't shout.
- **Accessibility:**
  - Statuses always have an icon and a label, not just a colour.
  - Text meets WCAG AA contrast.
  - Dialogs and the pickers work with the keyboard.
  - Touch targets are at least 44px.
  - Every screen has loading, error and empty states.

## Assumptions

- One practitioner (Dr. Meera Iyer) and one live client (Ananya Rao). The other clients on the list are static examples.
- Ananya is in week 2 of 4, on a vegetarian, home-style Indian plan.
- Workdays are Monday to Friday.
- Hunger uses a 1–5 scale (1 very hungry, 3 satisfied, 5 too full).
- A meal can be logged from 30 minutes before its planned time.

## What is mocked

| Area | In the prototype | In production |
|---|---|---|
| Login | None. You pick client or practitioner on the home page, and the demo tables are open | Supabase Auth, with database rules so clients only see their own data and practitioners only see their clients |
| Data | Ananya's week is generated and can be reset | Real logs |
| Other clients | Static rows | Signals calculated on the server for every client |
| Notifications | In-app only | Push notifications when a recommendation is sent |
| Plan review | Records the proposed change | Versioned meal plans, so history stays correct after a plan changes |

## Known limitations

- Some practitioner actions save in two steps instead of one transaction.
- Everyone with the link shares the same demo data.
- No plan versioning yet.
- Times aren't adjusted across time zones.
- No formal accessibility audit.

## AI tools used

I used Claude Code as an AI pair programmer to move faster on implementation: project setup, UI components, the SQL schema and test cases.

I set the direction and made the key calls myself:
- Supabase for shared live data between the two apps.
- Rules instead of an LLM for the insight, so it stays predictable and testable.
- Mobile-first for the client app.
- Vercel for hosting.

The [walkthrough video](https://drive.google.com/file/d/118JKmd2QAyHxjMd-GJQb_tfAd8ZZYsYC/view) was also made with Claude Code. It's a scripted Playwright recording of the live app with on-screen captions, so it can be re-recorded in a few minutes whenever the app changes.

I checked the output in the running app and sent it back when it wasn't right. For example, I asked for a UI redesign when it looked generic, and for a responsive client layout when it only worked as a phone column.

## Technical reflection

**Most difficult decision:** how to measure adherence without punishing missing data or rewarding clients who only log good days. I settled on two numbers that are always shown together: adherence over logged meals, and logging coverage. Swaps count as half because the client did eat, but they're always listed separately so they don't hide inside the score.

**What I left out:** login, editing and versioning meal plans, push notifications, a nutrition database, photo logging and AI-written insight. I wanted one complete loop rather than many half-finished features.

**What I'd change before production:** real login with per-role database rules, single-transaction saves for practitioner actions, plan versioning, calculating signals on the server for large caseloads, time zone handling, error monitoring, and a clinical review of the insight wording.

**What I'd build next:** turning a plan review into a new plan version the client accepts, push notifications, weekly check-ins, and an optional AI summary written only from the same logged facts.

**Where AI accelerated development:** the repetitive parts: project setup, Supabase wiring, building screens to an agreed design, the SQL schema and test scaffolding. That left more of the time for the product questions, like how adherence should be measured and what the practitioner should see first. It also made re-recording the walkthrough quick whenever something changed.

**What I validated or debugged personally:**
- I set up the Supabase project and ran the schema.
- I reviewed the UI and asked for a redesign when the first version looked too generic.
- I noticed the client app only showed a phone-sized column on a laptop, and had it made properly responsive.
- I chose to show the client app on a phone first in the walkthrough, since that's how clients would use it.

Issues found during testing, and fixed:
- The Supabase settings in Vercel had hidden characters that stopped the live site from loading.
- Two pages scrolled sideways on phones.
- The client app's layout got squeezed at tablet width.
