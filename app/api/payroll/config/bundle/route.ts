import { mockResponse } from "@/lib/mock-api";
import { loadBundle } from "@/lib/payroll/compensation-server";

// Everything the client-side salary preview needs from module 1, in one call.
export async function GET(request: Request) {
  return mockResponse(request, () => loadBundle());
}
