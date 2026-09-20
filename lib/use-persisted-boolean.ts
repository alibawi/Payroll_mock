"use client";

import { useCallback } from "react";

import { usePersistedString } from "@/lib/use-persisted-string";

/** Boolean UI preference persisted to localStorage (the server render uses `fallback`). */
export function usePersistedBoolean(key: string, fallback = false) {
  const [raw, setRaw] = usePersistedString(key);
  const value = raw === "1" ? true : raw === "0" ? false : fallback;
  const set = useCallback((next: boolean) => setRaw(next ? "1" : "0"), [setRaw]);
  return [value, set] as const;
}
