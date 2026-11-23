// Static sample clients for the roster view ONLY — they demonstrate how the
// attention model scales to a 50–100-client caseload. Only Ananya is live.

import type { Severity } from "./adherence";

export interface RosterRow {
  id: string;
  name: string;
  week: string;
  score: number | null; // adherence over logged meals
  coverage: number; // logged / planned
  lastLog: string;
  topSignal: string | null;
  severity: Severity | null;
  attention: number;
  flagged?: boolean;
  live?: boolean;
}

export const MOCK_ROSTER: RosterRow[] = [
  { id: "m1", name: "Rahul Mehta", week: "Week 3 of 6", score: null, coverage: 0.1, lastLog: "5 days ago", topSignal: "No meals logged in the last 2+ days", severity: "high", attention: 4 },
  { id: "m2", name: "Priya Nair", week: "Week 1 of 4", score: 0.58, coverage: 0.86, lastLog: "today", topSignal: "Dinner skipped on 4 of 6 logged days", severity: "high", attention: 5, flagged: true },
  { id: "m3", name: "Karan Shah", week: "Week 5 of 8", score: 0.71, coverage: 0.79, lastLog: "yesterday", topSignal: "Breakfast swapped on 4 of 7 logged days", severity: "medium", attention: 3 },
  { id: "m4", name: "Sneha Kulkarni", week: "Week 2 of 4", score: 0.9, coverage: 0.96, lastLog: "today", topSignal: null, severity: null, attention: 0 },
  { id: "m5", name: "Vikram Joshi", week: "Week 4 of 12", score: 0.83, coverage: 0.68, lastLog: "today", topSignal: "9 planned meals not logged", severity: "low", attention: 1 },
  { id: "m6", name: "Fatima Sheikh", week: "Week 6 of 6", score: 0.94, coverage: 1, lastLog: "today", topSignal: null, severity: null, attention: 0 },
];
