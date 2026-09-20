import { readFile } from "fs/promises";
import path from "path";

// Server-side helpers for the Mock API (Route Handlers under app/api). Every response is delayed by a
// random 300–600 ms so screens exercise their real loading states (CLAUDE.md rule 2).

export function randomDelay(minMs = 300, maxMs = 600) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Reads `mock-data/<relativePath>` (e.g. "hr/employees.json") without any delay. */
export async function readMockJson<T = unknown>(relativePath: string): Promise<T> {
  const filePath = path.join(process.cwd(), "mock-data", relativePath);
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

/** Same as `readMockJson` but with the simulated network delay — for read-only static files. */
export async function readMockData<T = unknown>(relativePath: string): Promise<T> {
  const [data] = await Promise.all([readMockJson<T>(relativePath), randomDelay()]);
  return data;
}

/** Throw from a producer to answer with a specific HTTP status. */
export class MockApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/**
 * Wraps a Route Handler body: applies the simulated delay, optional failure simulation and JSON
 * serialisation. Append `?mockFail=1` to any request to force a 500 (used to test error states),
 * or `?mockDelay=<ms>` to override the delay.
 */
export async function mockResponse<T>(
  request: Request,
  produce: () => Promise<T> | T,
  init?: { status?: number }
): Promise<Response> {
  const url = new URL(request.url);
  const forced = Number(url.searchParams.get("mockDelay"));
  await (Number.isFinite(forced) && forced > 0
    ? new Promise((resolve) => setTimeout(resolve, forced))
    : randomDelay());

  if (url.searchParams.get("mockFail") === "1") {
    return jsonError(500, "Simulated server error (mockFail=1)");
  }

  try {
    return Response.json(await produce(), { status: init?.status ?? 200 });
  } catch (error) {
    if (error instanceof MockApiError) return jsonError(error.status, error.message);
    console.error(error);
    return jsonError(500, "Unexpected server error");
  }
}
