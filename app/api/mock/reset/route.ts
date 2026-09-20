import { mockResponse } from "@/lib/mock-api";
import { resetStore } from "@/lib/payroll/store";

// Drops every in-memory change and re-seeds from mock-data/*.json on the next read.
export async function POST(request: Request) {
  return mockResponse(request, () => {
    resetStore();
    return { ok: true };
  });
}
