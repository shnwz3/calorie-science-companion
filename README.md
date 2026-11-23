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

- **Next.js + TypeScript:** one codebase for both apps, with shared types.
- **Supabase:** real Postgres with constraints, and realtime sync, so a practitioner's recommendation reaches the client's screen in about a second, with no custom backend.
- **Rules, not an LLM, for insight:** predictable, testable, and every statement traces back to the logs.

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

- Adherence is averaged over **logged** meals only, and always shown with **logging coverage** (logged ÷ planned). A client who only logs good days gets a high score but low coverage, and the low coverage is flagged.
- The window is the last 7 completed days.
- Clients are ranked for attention by clear rules: unanswered messages, no logs for 2+ days, a meal skipped or swapped on half or more of logged days, repeated hunger, drifting meal times, and logging gaps. This is how one practitioner can handle 50–100 clients.

## Key product decisions

- **Client:** today's meals first, with logging in one tap ("As planned"). There's no compliance score, the wording is neutral, and skipped meals aren't shown in red, so honest reporting feels safe. The app is mobile-first and responsive up to desktop.
- **Practitioner:** "Needs attention" first, then the score with its context, then a meal × day grid where problem meals stand out.
- **Insight:** split into *Observed* (facts), *Possible explanations* (marked as not confirmed) and *Suggestions*, with no clinical conclusions.
- **Actions:** send a recommendation (appears in the client's app), start a plan review (the client sees a banner), flag, mark reviewed, add a note.

## Assumptions

- One practitioner and one live client. The other clients on the list are static examples.
- Ananya is in week 2 of 4, on a vegetarian, home-style Indian plan. Workdays are Monday to Friday.
- Hunger uses a 1–5 scale (1 very hungry, 5 too full).

## What is mocked

| Area | Prototype | Production |
|---|---|---|
| Login | None; you pick a role on the home page | Supabase Auth with per-role database rules |
| Data | Ananya's week is generated and resettable | Real logs |
| Other clients | Static rows | Signals calculated on the server |
| Notifications | In-app only | Push notifications |

## Known limitations

- No plan versioning yet.
- Some practitioner actions save in two steps instead of one transaction.
- Everyone with the link shares the same demo data.
- No time zone handling.

## AI tools used

I used Claude Code as an AI pair programmer to move faster on implementation: project setup, UI components, the SQL schema and test cases.

I set the direction and made the key calls myself:
- Supabase for shared live data.
- Rules instead of an LLM for the insight.
- Mobile-first for the client app.
- Vercel for hosting.

I checked the output in the running app and sent it back when it wasn't right. For example, I asked for a UI redesign when it looked generic, and for a responsive client layout when it only worked as a phone column. The [walkthrough video](https://drive.google.com/file/d/118JKmd2QAyHxjMd-GJQb_tfAd8ZZYsYC/view) was also made with Claude Code, as a scripted recording of the live app with captions.

## Technical reflection

- **Hardest decision:** measuring adherence without punishing missing data or rewarding selective logging. I used two numbers that are always shown together: adherence over logged meals, and logging coverage.
- **Left out on purpose:** login, plan editing, push notifications, a nutrition database and AI-written insight. I wanted one complete loop rather than many half-built features.
- **Before production:** real auth with per-role rules, plan versioning, single-transaction saves, server-side signals for large caseloads, and a clinical review of the insight wording.
- **Next:** turning a plan review into a new plan version the client accepts, then push notifications and weekly check-ins.
- **Where AI helped:** the repetitive parts (setup, wiring, building screens, schema, test scaffolding). That left more time for the product questions.
- **What I validated personally:**
  - I set up Supabase and ran the schema.
  - I reviewed the UI and asked for a redesign.
  - I caught that the client app wasn't responsive on a laptop.
  - I chose to show the app on a phone first in the walkthrough.

  Issues fixed during testing: hidden characters in the Vercel settings that broke the live site, pages scrolling sideways on phones, and a layout squeezed at tablet width.
