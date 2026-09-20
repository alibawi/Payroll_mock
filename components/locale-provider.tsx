"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Locale = "ar" | "en";

const STORAGE_KEY = "locale";
const DEFAULT_LOCALE: Locale = "ar";

const DIRECTION: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  /** Pick the current-locale string from an `{ ar, en }` label object. */
  t: (label: Record<Locale, string>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

// Tiny external store over localStorage (with an in-memory fallback when storage is
// unavailable). useSyncExternalStore keeps the server/first-hydration render on the
// default locale, then switches to the stored one without a hydration mismatch.
const listeners = new Set<() => void>();
let memoryLocale: Locale | null = null;

function readLocale(): Locale {
  if (memoryLocale) return memoryLocale;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    // storage unavailable — fall back to the default locale
  }
  return DEFAULT_LOCALE;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function applyDocumentLocale(locale: Locale) {
  document.documentElement.dir = DIRECTION[locale];
  document.documentElement.lang = locale;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    readLocale,
    () => DEFAULT_LOCALE
  );

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    memoryLocale = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — the choice just won't persist across reloads
    }
    listeners.forEach((listener) => listener());
  }, []);

  const t = useCallback(
    (label: Record<Locale, string>) => label[locale],
    [locale]
  );

  return (
    <LocaleContext.Provider
      value={{ locale, dir: DIRECTION[locale], setLocale, t }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
