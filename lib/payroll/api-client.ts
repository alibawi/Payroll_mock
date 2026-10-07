"use client";

import { useCallback, useEffect, useState } from "react";

import type { FieldErrors } from "@/lib/payroll/types";

// Client-side access to the Mock API. Pages `fetch` through here (CLAUDE.md rule 2) and never import JSON.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Field-level validation failures of a 422 answer (rule ids C-n → localized message). */
    public fieldErrors?: FieldErrors
  ) {
    super(message);
  }
}

function currentRole(): string | null {
  try {
    return window.localStorage.getItem("role");
  } catch {
    return null;
  }
}

/** JSON request helper: sends the mock role (audit actor) and turns non-2xx answers into `ApiError`. */
export async function apiFetch<T>(url: string, init: Omit<RequestInit, "body"> & { body?: unknown } = {}): Promise<T> {
  const { body, headers, ...rest } = init;
  const role = currentRole();
  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(role ? { "x-mock-role": role } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error ?? response.statusText, payload?.details);
  }
  return payload as T;
}

type Settled<T> = { key: string; data?: T; error?: string };

/**
 * GET `url` and expose `{ data, loading, error, reload }`. Pass `null` to skip fetching.
 * Loading is derived (result key ≠ requested key) so no state is set synchronously inside the effect.
 */
export function useApi<T>(url: string | null) {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const key = `${url}#${version}`;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    apiFetch<T>(url)
      .then((data) => !cancelled && setSettled({ key, data }))
      .catch((error: Error) => !cancelled && setSettled({ key, error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [url, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const done = settled?.key === key;

  return {
    data: done ? settled.data : undefined,
    error: done ? settled.error : undefined,
    loading: url !== null && !done,
    reload,
  };
}
