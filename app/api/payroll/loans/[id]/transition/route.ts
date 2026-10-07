import { MockApiError, mockResponse } from "@/lib/mock-api";
import { readJson } from "@/lib/payroll/config-server";
import {
  accountNames,
  appendLoanActivity,
  assertHasCompensation,
  assertNoOpenAdvance,
  findLoan,
  installmentsOf,
  LOAN_FILES,
  nextJournalRef,
  requireLoanPermission,
  roleOf,
} from "@/lib/payroll/loan-server";
import { buildSchedule, cashSettlementJournal, disbursementJournal, LOAN_ACTIONS } from "@/lib/payroll/loans";
import { periodEnd, addMonths } from "@/lib/payroll/periods";
import { insertItem, updateItem } from "@/lib/payroll/store";
import type { EmployeeLoan, EmployeeLoanInstallment } from "@/lib/payroll/types";
import type { PayrollAction } from "@/lib/payroll/permissions";

type Params = { params: Promise<{ id: string }> };

type Body = {
  action: "submit" | "approve" | "reject" | "disburse" | "cancel" | "earlySettle" | "defer" | "waive" | "comment" | "previewJournal";
  reason?: string;
  text?: string;
  accountCode?: string;
  source?: "Cash" | "Payroll";
  installmentId?: string;
};

/** Which permission each transition needs (spec §5). `cancel` of a draft only needs the requester's `create`. */
const REQUIRED: Record<Body["action"], PayrollAction> = {
  submit: "create",
  approve: "approve",
  reject: "approve",
  disburse: "disburse",
  cancel: "cancel",
  earlySettle: "update",
  defer: "approve",
  waive: "approve",
  comment: "view",
  previewJournal: "view",
};

const ACTION_KEY: Partial<Record<Body["action"], string>> = {
  submit: "submit", approve: "approve", reject: "reject", disburse: "disburse", cancel: "cancel",
  earlySettle: "earlySettle", defer: "defer", waive: "waive",
};

const fail = (status: number, message: string, rule?: string, ar?: string, en?: string) =>
  new MockApiError(status, message, rule ? { form: { rule, message: { ar: ar ?? message, en: en ?? message } } } : undefined);

// One endpoint for the whole state machine (spec §3): submit / approve / reject / disburse / cancel /
// early-settle / defer / waive, plus comments and the read-only journal preview of a disbursement.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return mockResponse(request, async () => {
    const body = await readJson<Body>(request);
    const loan = await findLoan(id);
    const rows = await installmentsOf(id);
    const now = new Date().toISOString();

    // cancelling your own draft is a requester action
    const permission = body.action === "cancel" && loan.status === "Draft" ? "create" : REQUIRED[body.action];
    if (!permission) throw new MockApiError(400, `Unknown action ${body.action}`);
    requireLoanPermission(request, permission);

    const key = ACTION_KEY[body.action];
    if (key && !LOAN_ACTIONS[loan.status].includes(key)) {
      throw fail(409, `Action ${body.action} is not available in status ${loan.status}`, "L-STATE",
        `الإجراء غير متاح بحالة «${loan.status}»`, `Action not available in status “${loan.status}”`);
    }

    const patchLoan = (patch: Partial<EmployeeLoan>) =>
      updateItem<EmployeeLoan>(LOAN_FILES.loans, id, { ...patch, updatedAt: now });

    switch (body.action) {
      case "comment": {
        if (!body.text?.trim()) throw new MockApiError(422, "Comment text is required");
        await appendLoanActivity(request, id, "Comment", { ar: body.text.trim(), en: body.text.trim() });
        return { loan };
      }

      case "previewJournal": {
        const names = await accountNames();
        const code = body.accountCode ?? loan.disbursementAccountCode;
        return { journal: disbursementJournal({ ...loan, disbursementAccountCode: code }, names), journalRef: await nextJournalRef() };
      }

      case "submit": {
        await assertHasCompensation(loan.employeeId);
        if (loan.loanType === "SalaryAdvance") await assertNoOpenAdvance(loan.employeeId, id);
        const updated = await patchLoan({ status: "PendingApproval", rejectionReason: null });
        await appendLoanActivity(request, id, "Submitted", { ar: "إرسال للاعتماد", en: "Submitted for approval" });
        return { loan: updated };
      }

      case "approve": {
        // L-4: the instalment schedule is generated at approval.
        const schedule = buildSchedule(loan);
        for (const row of schedule.rows) {
          await insertItem<EmployeeLoanInstallment>(LOAN_FILES.installments, {
            id: `${id}-i${row.seqNo}`,
            loanId: id,
            seqNo: row.seqNo,
            duePeriodId: row.duePeriodId,
            dueDate: row.dueDate,
            amount: row.amount,
            deductedAmount: 0,
            status: "Pending",
            deferredFromSeqNo: null,
            settlementSource: null,
            payslipId: null,
            deductedOn: null,
          });
        }
        const updated = await patchLoan({
          status: "Approved",
          approvedBy: roleOf(request) ?? "hrManager",
          approvedAt: now,
          installmentCount: schedule.installmentCount,
          installmentAmount: schedule.installmentAmount,
          totalRepayable: schedule.totalRepayable,
          outstandingBalance: schedule.totalRepayable,
        });
        await appendLoanActivity(request, id, "Approved", { ar: "اعتماد الطلب وتوليد جدول الأقساط", en: "Approved; instalment schedule generated" });
        return { loan: updated };
      }

      case "reject": {
        if (!body.reason?.trim()) throw fail(422, "Rejection reason is required", "L-REJECT", "سبب الرفض مطلوب", "A rejection reason is required");
        const updated = await patchLoan({
          status: "Draft",
          rejectedBy: roleOf(request) ?? "hrManager",
          rejectedAt: now,
          rejectionReason: body.reason.trim(),
        });
        await appendLoanActivity(request, id, "Rejected", { ar: `رفض الطلب: ${body.reason.trim()}`, en: `Rejected: ${body.reason.trim()}` });
        return { loan: updated };
      }

      case "disburse": {
        const code = body.accountCode ?? loan.disbursementAccountCode;
        const journalRef = await nextJournalRef();
        const updated = await patchLoan({
          status: "Disbursed",
          disbursementAccountCode: code,
          journalRef,
          journalEntryId: `je-${journalRef}`,
          outstandingBalance: loan.totalRepayable,
        });
        await appendLoanActivity(request, id, "Disbursed", { ar: `صرف المبلغ — القيد ${journalRef}`, en: `Disbursed — journal ${journalRef}` });
        return { loan: updated, journal: disbursementJournal({ ...loan, disbursementAccountCode: code }, await accountNames()), journalRef };
      }

      case "cancel": {
        const updated = await patchLoan({ status: "Cancelled", outstandingBalance: 0 });
        await appendLoanActivity(request, id, "Cancelled", { ar: body.reason ? `إلغاء الطلب: ${body.reason}` : "إلغاء الطلب", en: body.reason ? `Cancelled: ${body.reason}` : "Request cancelled" });
        return { loan: updated };
      }

      case "earlySettle": {
        // L-10: pay the whole remainder at once, in cash (journal Dr cash / Cr loan) or from this month's payroll.
        const source = body.source ?? "Cash";
        const pending = rows.filter((r) => r.status === "Pending");
        const remaining = pending.reduce((s, r) => s + r.amount, 0);
        if (pending.length === 0) throw fail(409, "Nothing left to settle");
        let journalRef: string | null = null;
        let journal = undefined;
        if (source === "Cash") {
          journalRef = await nextJournalRef();
          journal = cashSettlementJournal(loan, remaining, await accountNames());
        }
        for (const row of pending) {
          await updateItem<EmployeeLoanInstallment>(LOAN_FILES.installments, row.id, {
            status: "Deducted",
            deductedAmount: row.amount,
            deductedOn: now.slice(0, 10),
            settlementSource: source,
          });
        }
        const updated = await patchLoan({ status: "Settled", outstandingBalance: 0 });
        await appendLoanActivity(request, id, "EarlySettled", {
          ar: `تسوية مبكرة (${source === "Cash" ? "نقداً" : "من الراتب"}) بمبلغ ${remaining.toLocaleString("en-US")}${journalRef ? ` — القيد ${journalRef}` : ""}`,
          en: `Early settlement (${source === "Cash" ? "cash" : "payroll"}) of ${remaining.toLocaleString("en-US")}${journalRef ? ` — journal ${journalRef}` : ""}`,
        });
        return { loan: updated, journal, journalRef, remaining };
      }

      case "defer": {
        const row = rows.find((r) => r.id === body.installmentId);
        if (!row || row.status !== "Pending") throw fail(409, "Only a pending instalment can be deferred", "L-STATE", "يمكن تأجيل قسط معلّق فقط", "Only a pending instalment can be deferred");
        await updateItem<EmployeeLoanInstallment>(LOAN_FILES.installments, row.id, { status: "Deferred" });
        const last = rows[rows.length - 1];
        const duePeriodId = addMonths(last.duePeriodId, 1);
        await insertItem<EmployeeLoanInstallment>(LOAN_FILES.installments, {
          id: `${id}-i${rows.length + 1}`,
          loanId: id,
          seqNo: rows.length + 1,
          duePeriodId,
          dueDate: periodEnd(duePeriodId),
          amount: row.amount,
          deductedAmount: 0,
          status: "Pending",
          deferredFromSeqNo: row.seqNo,
          settlementSource: null,
          payslipId: null,
          deductedOn: null,
        });
        await patchLoan({});
        await appendLoanActivity(request, id, "Deferred", { ar: `تأجيل القسط ${row.seqNo} إلى نهاية الجدول`, en: `Instalment ${row.seqNo} deferred to the end of the schedule` });
        return { loan: await findLoan(id) };
      }

      case "waive": {
        const row = rows.find((r) => r.id === body.installmentId);
        if (!row || row.status !== "Pending") throw fail(409, "Only a pending instalment can be waived", "L-STATE", "يمكن إعفاء قسط معلّق فقط", "Only a pending instalment can be waived");
        await updateItem<EmployeeLoanInstallment>(LOAN_FILES.installments, row.id, { status: "Waived" });
        const balance = Math.max(0, loan.outstandingBalance - row.amount);
        const stillOpen = rows.some((r) => r.id !== row.id && r.status === "Pending");
        const updated = await patchLoan({ outstandingBalance: balance, status: balance === 0 && !stillOpen ? "Settled" : loan.status });
        await appendLoanActivity(request, id, "Waived", { ar: `إعفاء القسط ${row.seqNo} (${row.amount.toLocaleString("en-US")})`, en: `Instalment ${row.seqNo} waived (${row.amount.toLocaleString("en-US")})` });
        return { loan: updated };
      }
    }
  });
}
