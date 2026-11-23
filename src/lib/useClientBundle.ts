"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nowMinutes, toISODate } from "./dates";
import { ensureSeeded, fetchBundle, SetupError } from "./repo";
import { isConfigured, supabase } from "./supabase";
import type { ClientBundle } from "./types";

export type LoadState =
  | { status: "loading" }
  | { status: "setup"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; data: ClientBundle };

/**
 * Loads everything about one client and keeps it live via Supabase Realtime.
 * Both the client app and the practitioner dashboard use this hook, so a change
 * made in one experience appears in the other within ~1 s.
 */
export function useClientBundle(clientId: string) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [today, setToday] = useState<string>("");
  const [nowMin, setNowMin] = useState<number>(0);
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const t = toISODate(new Date());
    setToday(t);
    setNowMin(nowMinutes());
    try {
      if (!isConfigured()) throw new SetupError("Supabase environment variables are not set.");
      await ensureSeeded(t);
      const data = await fetchBundle(clientId, t);
      if (!data) setState({ status: "error", message: "Client not found." });
      else setState({ status: "ready", data });
    } catch (e) {
      if (e instanceof SetupError) setState({ status: "setup", message: e.message });
      else setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong." });
    }
  }, [clientId]);

  // Coalesce bursts of realtime events (a composite action writes 2–3 rows).
  const scheduleReload = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 250);
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
    if (!isConfigured()) return;
    const db = supabase();
    const channel = db.channel(`client-${clientId}-${Math.random().toString(36).slice(2)}`);
    for (const table of ["meal_logs", "client_feedback", "practitioner_actions"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `client_id=eq.${clientId}` }, scheduleReload);
    }
    channel.on("postgres_changes", { event: "*", schema: "public", table: "clients", filter: `id=eq.${clientId}` }, scheduleReload);
    channel.subscribe((s) => setLive(s === "SUBSCRIBED"));
    const tick = setInterval(() => setNowMin(nowMinutes()), 60_000);
    return () => {
      clearInterval(tick);
      if (timer.current) clearTimeout(timer.current);
      db.removeChannel(channel);
    };
  }, [clientId, load, scheduleReload]);

  return { state, today, nowMin, live, reload: load };
}
