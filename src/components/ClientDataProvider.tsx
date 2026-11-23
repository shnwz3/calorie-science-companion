"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useClientBundle } from "@/lib/useClientBundle";

type Ctx = ReturnType<typeof useClientBundle>;
const ClientDataContext = createContext<Ctx | null>(null);

/** One data subscription shared by every screen under a layout. */
export function ClientDataProvider({ clientId, children }: { clientId: string; children: ReactNode }) {
  const value = useClientBundle(clientId);
  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}

export function useClientData(): Ctx {
  const ctx = useContext(ClientDataContext);
  if (!ctx) throw new Error("useClientData must be used inside ClientDataProvider");
  return ctx;
}
