import { COMP_FILES, loadBundle } from "@/lib/payroll/compensation-server";
import { actorFrom, CONFIG_FILES } from "@/lib/payroll/config-server";
import { type EosData } from "@/lib/payroll/eos-context";
import { MockApiError } from "@/lib/mock-api";
import { REPORT_FILES } from "@/lib/payroll/report-server";
import { can, type PayrollAction } from "@/lib/payroll/permissions";
import { isRole } from "@/lib/payroll/roles";
import { collection, insertItem } from "@/lib/payroll/store";
import type { Employee } from "@/lib/types/hr";
import type {
  EmployeeCompensation,
  EmployeeCompensationComponent,
  EndOfServiceCalculation,
  EosActivity,
  GlAccount,
  JournalLine,
  LeaveBalance,
  LocalizedText,
} from "@/lib/payroll/types";

export async function loadEosData(): Promise<EosData> {
  const [bundle, employees, compensations, overrides, balances] = await Promise.all([
    loadBundle(),
    collection<Employee>(COMP_FILES.employees),
    collection<EmployeeCompensation>(COMP_FILES.compensations),
    collection<EmployeeCompensationComponent>(COMP_FILES.overrides),
    collection<LeaveBalance>(REPORT_FILES.balances),
  ]);
  return { bundle, employees, compensations, overrides, balances };
}

export function eosRole(request: Request) {
  const value = request.headers.get("x-mock-role");
  return isRole(value) ? value : null;
}

/** HTTP 403 when a role is sent and lacks the action (no header = demo/curl access, always allowed). */
export function requireEosPermission(request: Request, action: PayrollAction) {
  const role = eosRole(request);
  if (role && !can(role, "payroll.eos", action)) throw new MockApiError(403, `Role ${role} may not ${action} end-of-service claims`);
}

export async function findEos(id: string): Promise<EndOfServiceCalculation> {
  const eos = (await collection<EndOfServiceCalculation>(REPORT_FILES.eos)).find((e) => e.id === id);
  if (!eos) throw new MockApiError(404, `End-of-service claim ${id} not found`);
  return eos;
}

export async function appendEosActivity(request: Request, eosId: string, action: EosActivity["action"], summary: LocalizedText) {
  const log = await collection<EosActivity>(REPORT_FILES.eosActivity);
  return insertItem<EosActivity>(REPORT_FILES.eosActivity, {
    id: `ea-${String(log.length + 1).padStart(4, "0")}-${Date.now().toString(36)}`,
    eosId,
    action,
    actor: actorFrom(request),
    timestamp: new Date().toISOString(),
    summary,
  });
}

export async function nextEosNumber() {
  const all = await collection<EndOfServiceCalculation>(REPORT_FILES.eos);
  const max = all.reduce((m, e) => Math.max(m, Number(e.eosNo.split("-")[2]) || 0), 0);
  return `EOS-2026-${String(max + 1).padStart(4, "0")}`;
}

async function nextRef(prefix: "JV-EOS" | "PV-EOS", pick: (e: EndOfServiceCalculation) => string | null) {
  const all = await collection<EndOfServiceCalculation>(REPORT_FILES.eos);
  const max = all.reduce((m, e) => Math.max(m, Number(pick(e)?.split("-")[2]) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}
export const nextEosJournalRef = () => nextRef("JV-EOS", (e) => e.journalRef);
export const nextEosPaymentRef = () => nextRef("PV-EOS", (e) => e.paymentRef);

/** Payment entry of a claim (placeholder): Dr end-of-service expense (5190) · Cr bank. */
export async function paymentJournal(eos: EndOfServiceCalculation, accountCode = "1120"): Promise<JournalLine[]> {
  const accounts = await collection<GlAccount>(CONFIG_FILES.glAccounts);
  const name = (code: string): LocalizedText => accounts.find((a) => a.code === code)?.name ?? { ar: code, en: code };
  return [
    { id: `${eos.id}-j1`, accountCode: "5190", accountName: name("5190"), debit: eos.totalAmount, credit: 0, memo: eos.eosNo },
    { id: `${eos.id}-j2`, accountCode, accountName: name(accountCode), debit: 0, credit: eos.totalAmount, memo: eos.eosNo },
  ];
}
