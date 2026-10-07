import { readMockJson } from "@/lib/mock-api";

// In-memory store behind the Mock API. Collections are lazily seeded from mock-data/*.json on first
// access and then mutated in place (create / update / delete / state transitions), so "saving" in the
// UI persists for the life of the dev-server process. `resetStore()` drops everything back to the JSON.
// Held on globalThis so Next's dev-mode module reloads do not wipe it.

type Identified = { id: string };

const globalStore = globalThis as unknown as {
  __payrollMockStore?: Map<string, Identified[]>;
};
const collections = (globalStore.__payrollMockStore ??= new Map());

/** Live (mutable) array for a mock-data file such as "hr/employees.json". */
export async function collection<T extends Identified>(file: string): Promise<T[]> {
  let items = collections.get(file) as T[] | undefined;
  if (!items) {
    items = await readMockJson<T[]>(file);
    collections.set(file, items);
  }
  return items;
}

export async function findById<T extends Identified>(file: string, id: string): Promise<T | undefined> {
  return (await collection<T>(file)).find((item) => item.id === id);
}

export async function insertItem<T extends Identified>(file: string, item: T): Promise<T> {
  (await collection<T>(file)).unshift(item);
  return item;
}

/** Shallow-merges `patch` into the item; returns the updated item or `undefined` when missing. */
export async function updateItem<T extends Identified>(
  file: string,
  id: string,
  patch: Partial<T>
): Promise<T | undefined> {
  const items = await collection<T>(file);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...patch };
  return items[index];
}

export async function removeItem(file: string, id: string): Promise<boolean> {
  const items = await collection<Identified>(file);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  return true;
}

/** Sequential document number such as `nextNumber("LN", 2026, existing)` → `LN-2026-0008`. */
export function nextNumber(prefix: string, year: number, existing: string[]): string {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = existing.reduce((acc, value) => {
    const match = pattern.exec(value);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function resetStore() {
  collections.clear();
}

export function storeStats() {
  return Object.fromEntries([...collections].map(([file, items]) => [file, items.length]));
}

/** Removes every item matching `predicate` (live array mutated in place); returns how many were removed. */
export async function removeWhere<T extends Identified>(file: string, predicate: (item: T) => boolean): Promise<number> {
  const items = await collection<T>(file);
  let removed = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) {
      items.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

/** Appends items at the end of a collection (insertItem puts new items first). */
export async function appendItems<T extends Identified>(file: string, newItems: T[]): Promise<void> {
  (await collection<T>(file)).push(...newItems);
}
