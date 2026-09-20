"use client";

import { useCallback, useSyncExternalStore } from "react";

// Shared localStorage-backed store for small UI preferences. The server render and the first
// hydration render always see `null`, then the stored value is picked up without a mismatch.
const listeners = new Set<() => void>();
const memory = new Map<string, string | null>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage unavailable
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function usePersistedString(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );

  const set = useCallback(
    (next: string | null) => {
      memory.set(key, next);
      try {
        if (next === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, next);
      } catch {
        // ignore — the value just will not persist across reloads
      }
      listeners.forEach((listener) => listener());
    },
    [key]
  );

  return [value, set] as const;
}
