import type { Comparison } from "@/lib/payroll/runs";
import type {
  PayrollDeductionScheduleItem,
  PayrollPeriod,
  PayrollProfile,
  PayrollRun,
  Payslip,
  RunActivity,
  RunJournalLine,
  JournalLine,
} from "@/lib/payroll/types";
import type { Employee } from "@/lib/types/hr";

// Client-side shapes of GET /api/payroll/runs/[id] (what the run screen and its tabs render).

export type PayslipRow = Omit<Payslip, "trace"> & { trace: []; employee: Employee | null };
export type ScheduleRow = PayrollDeductionScheduleItem & { employee: Employee | null };
export type CostCentreBalance = { costCenterId: string | null; debit: number; credit: number; balanced: boolean };

export type RunDetail = {
  run: PayrollRun;
  period: PayrollPeriod;
  profile: PayrollProfile | null;
  payslips: PayslipRow[];
  schedule: ScheduleRow[];
  claimedInputs: number;
  journal: {
    posting: RunJournalLine[];
    payment: RunJournalLine[];
    reversal: RunJournalLine[];
    isPreview: boolean;
    previewRef: string | null;
    balance: { posting: CostCentreBalance[]; payment: CostCentreBalance[]; reversal: CostCentreBalance[] };
  };
  activity: RunActivity[];
  comparison: Comparison;
};

/** Journal lines of one cost centre in the shape `JournalPreview` renders. */
export function toJournalLines(lines: RunJournalLine[], costCenterId: string | null): JournalLine[] {
  return lines
    .filter((l) => l.costCenterId === costCenterId)
    .map((l) => ({
      id: l.id,
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: l.debit,
      credit: l.credit,
      costCenter: l.costCenterId ?? undefined,
    }));
}

export function costCentresOf(lines: RunJournalLine[]): (string | null)[] {
  return [...new Set(lines.map((l) => l.costCenterId))].sort((a, b) => (a ?? "").localeCompare(b ?? ""));
}

/** `2026-10-06T09:00:00Z` → `06/10/2026 09:00` (UTC, as the mock timestamps are generated). */
export function formatStamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
