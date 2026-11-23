# CalorieScience Companion: Adherence Workflow

**[Open the live prototype](https://calorie-science-companion.vercel.app/demo)** · **[Watch the 4-minute walkthrough](https://drive.google.com/file/d/118JKmd2QAyHxjMd-GJQb_tfAd8ZZYsYC/view)**

A client logs what actually happened at each meal. The practitioner sees patterns instead of raw entries, acts on them, and the client sees that response in their app.

| Route | What's there |
|---|---|
| `/demo` | Client phone and practitioner dashboard side by side, live (start here) |
| `/client` | Ananya's app: today's plan, logging, progress, messages |
| `/practitioner` | Dr. Meera's caseload, sorted by who needs attention |

The demo data is shared. **Reset demo data** on `/demo` restores the starting scenario.

## Run locally

```bash
git clone https://github.com/shnwz3/calorie-science-companion.git
cd calorie-science-companion && npm install
cp .env.example .env.local   # Supabase URL + publishable key
# run supabase/schema.sql once in the Supabase SQL editor
npm run dev                  # http://localhost:3000
npm test                     # adherence + insight unit tests
```

## Architecture and technology

```
Next.js + TypeScript + Tailwind (Vercel)
  src/lib/adherence.ts   adherence + attention rules (pure, unit-tested)
  src/lib/insights.ts    practitioner insight rules (pure, unit-tested)
  src/lib/repo.ts        all database access
  src/app/client         client app (mobile-first, responsive)
  src/app/practitioner   practitioner app
        ↓
Supabase Postgres + Realtime (shared data between both apps)
```

- **Supabase:** Postgres plus realtime sync, so a recommendation reaches the client's screen in about a second, with no custom backend.
- **Rules, not an LLM, for insight:** predictable, testable, and traceable to the logs.

## Data model

```
clients
  ├── meal_plan_items        what was planned
  ├── meal_logs              what actually happened (one per client + meal + day)
  ├── client_feedback        issues raised by the client
  └── practitioner_actions   notes, flags, recommendations, reviews (history)
```

The plan and the logs are kept separate. A meal with no log is **not logged**; the app never assumes it was skipped.

## Adherence calculation

| Logged as | Counts |
|---|---|
| Followed | 1 |
| Partly followed / Swapped | ½ |
| Skipped | 0 |
| Not logged | excluded |

- Averaged over **logged** meals in the last 7 days, always shown with **logging coverage** (logged ÷ planned), so selective logging gets flagged.
- Clients are ranked for attention by simple rules (unanswered messages, no recent logs, repeatedly skipped or swapped meals, hunger), so one practitioner can handle 50–100 clients.

## Key product decisions

- **Client:** today's meals first, with one-tap logging. There's no compliance score and no red for skipped meals, so honest reporting feels safe. Mobile-first and responsive.
- **Practitioner:** "Needs attention" first, then the score with its context, then a meal × day grid where problem meals stand out.
- **Insight:** split into *Observed* (facts), *Possible explanations* (marked as not confirmed) and *Suggestions*, with no clinical conclusions.
- **Actions:** send a recommendation (appears in the client's app), start a plan review (the client sees a banner), flag, mark reviewed, add a note.

## Assumptions

- One practitioner and one live client. The other clients on the list are static examples.
- Ananya is in week 2 of 4, on a vegetarian, home-style Indian plan. Workdays are Monday to Friday.

## What is mocked and current limits

| Area | Prototype | Production |
|---|---|---|
| Login | None; you pick a role on the home page | Supabase Auth with per-role database rules |
| Other clients | Static rows | Signals calculated on the server |
| Notifications | In-app only | Push notifications |
| Meal plans | Not versioned yet | Versioned plans so history stays correct |

## AI tools used

I used Claude Code to speed up the Supabase setup, repetitive code and the walkthrough recording. The product and technical decisions, and checking the results, were mine.

## Technical reflection

- **Hardest decision:** measuring adherence without punishing missing data or rewarding selective logging. I used two numbers that are always shown together: adherence over logged meals, and logging coverage.
- **Left out on purpose:** login, plan editing, push notifications and a nutrition database, to finish one complete loop.
- **Before production:** real auth with per-role rules, plan versioning, single-transaction saves, server-side signals for large caseloads, and a clinical review of the insight wording.
- **Next:** turning a plan review into a new plan version the client accepts, then push notifications and weekly check-ins.
- **Where AI helped:** setup and repetitive code (see above).
- **What I validated personally:** the Supabase setup, the UI (I asked for a redesign), the responsive client layout (I caught it was phone-only on laptops), and the live deploy. Fixed during testing: Vercel settings that broke the live site, and pages scrolling sideways on phones.
