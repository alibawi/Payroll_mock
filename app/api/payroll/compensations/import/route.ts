import { mockResponse } from "@/lib/mock-api";
import { COMP_FILES } from "@/lib/payroll/compensation-server";
import { readMockJson } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";

type SampleRow = { row: number; valid: boolean; error?: { ar: string; en: string } };
type Sample = { fileName: string; columns: unknown[]; rows: SampleRow[] };

// Mock Excel import (spec §7): GET returns the "parsed" sample file; POST returns the outcome per row.
// Nothing is written — the wizard only demonstrates the flow, the file is never really processed.
export async function GET(request: Request) {
  return mockResponse(request, () => readMockJson<Sample>(COMP_FILES.importSample));
}

export async function POST(request: Request) {
  return mockResponse(request, async () => {
    await readJson<{ mapping?: Record<string, string> }>(request);
    const sample = await readMockJson<Sample>(COMP_FILES.importSample);
    const imported = sample.rows.filter((r) => r.valid);
    const failed = sample.rows.filter((r) => !r.valid);
    return {
      fileName: sample.fileName,
      total: sample.rows.length,
      imported: imported.map((r) => r.row),
      failed: failed.map((r) => ({ row: r.row, error: r.error })),
    };
  });
}
