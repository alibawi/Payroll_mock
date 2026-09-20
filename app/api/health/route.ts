import { storeStats } from "@/lib/payroll/store";

// Liveness probe for the Mock API (no simulated delay).
export async function GET() {
  return Response.json({
    status: "ok",
    service: "enki-payroll-mock",
    time: new Date().toISOString(),
    store: storeStats(),
  });
}
