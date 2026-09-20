"use client";

// Internal showcase for the shared component library (prompt 0.8) — dev only, not linked anywhere.
// Sample data lives inline on purpose: this page exists to eyeball the components in both themes and
// directions. Real screens must fetch from /api (CLAUDE.md rule 2).

import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock,
  Send,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { AttachmentUploader, type AttachmentItem } from "@/components/attachments";
import { ChipListEditor, MultiSelectChips, SingleFilePicker } from "@/components/chip-list-editor";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmployeeSelect } from "@/components/employee-select";
import { FILTER_ALL, FilterSelect } from "@/components/filter-select";
import { FormField } from "@/components/form-field";
import { KPICard } from "@/components/kpi-card";
import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { ModuleScreensGrid } from "@/components/module-screens-grid";
import { JournalPreview } from "@/components/payroll/journal-preview";
import { MoneyCell } from "@/components/payroll/money-cell";
import { MoneyInput } from "@/components/payroll/money-input";
import { PayslipLineTable } from "@/components/payroll/payslip-line-table";
import { useRole } from "@/components/role-provider";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { WorkflowActionBar } from "@/components/workflow-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roleLabels } from "@/lib/i18n/labels";
import type { JournalLine, PayslipLine } from "@/lib/payroll/types";

type RunRow = {
  id: string;
  runNo: string;
  period: string;
  profile: "GOVERNMENT_IQ" | "PRIVATE_IQ";
  employees: number;
  gross: number;
  net: number;
  status: "Draft" | "Calculated" | "Approved" | "Posted" | "Paid";
};

const runs: RunRow[] = [
  { id: "1", runNo: "RUN-2026-0009", period: "2026-09", profile: "PRIVATE_IQ", employees: 42, gross: 58_420_000, net: 49_180_500, status: "Calculated" },
  { id: "2", runNo: "RUN-2026-0008", period: "2026-08", profile: "PRIVATE_IQ", employees: 41, gross: 57_910_000, net: 48_760_250, status: "Paid" },
  { id: "3", runNo: "RUN-2026-0007", period: "2026-08", profile: "GOVERNMENT_IQ", employees: 18, gross: 16_560_000, net: 13_921_200, status: "Posted" },
  { id: "4", runNo: "RUN-2026-0006", period: "2026-07", profile: "PRIVATE_IQ", employees: 40, gross: 56_300_000, net: 47_412_000, status: "Paid" },
  { id: "5", runNo: "RUN-2026-0005", period: "2026-07", profile: "GOVERNMENT_IQ", employees: 18, gross: 16_560_000, net: 13_921_200, status: "Approved" },
  { id: "6", runNo: "RUN-2026-0004", period: "2026-06", profile: "PRIVATE_IQ", employees: 39, gross: 55_480_000, net: 46_840_000, status: "Paid" },
  { id: "7", runNo: "RUN-2026-0003", period: "2026-06", profile: "GOVERNMENT_IQ", employees: 18, gross: 16_560_000, net: 13_921_200, status: "Paid" },
  { id: "8", runNo: "RUN-2026-0002", period: "2026-05", profile: "PRIVATE_IQ", employees: 38, gross: 54_120_000, net: 45_560_000, status: "Paid" },
  { id: "9", runNo: "RUN-2026-0001", period: "2026-05", profile: "GOVERNMENT_IQ", employees: 18, gross: 16_410_000, net: 13_802_400, status: "Paid" },
  { id: "10", runNo: "RUN-2026-0010", period: "2026-10", profile: "PRIVATE_IQ", employees: 0, gross: 0, net: 0, status: "Draft" },
  { id: "11", runNo: "RUN-2026-0011", period: "2026-10", profile: "GOVERNMENT_IQ", employees: 0, gross: 0, net: 0, status: "Draft" },
];

const statusTone: Record<RunRow["status"], StatusTone> = {
  Draft: "neutral",
  Calculated: "info",
  Approved: "warning",
  Posted: "success",
  Paid: "success",
};

// Example 12.2 of the payroll study (illustrative figures).
const payslipLines: PayslipLine[] = [
  { id: "l1", componentCode: "BASIC", componentName: { ar: "الأجر الأساسي", en: "Basic salary" }, componentType: "Earning", amount: 900_000, source: "Structure" },
  { id: "l2", componentCode: "HOUSING", componentName: { ar: "بدل سكن", en: "Housing allowance" }, componentType: "Earning", amount: 200_000, source: "Override" },
  { id: "l3", componentCode: "TRANSPORT", componentName: { ar: "بدل نقل", en: "Transport allowance" }, componentType: "Earning", amount: 100_000, source: "Structure" },
  { id: "l4", componentCode: "OVERTIME", componentName: { ar: "العمل الإضافي", en: "Overtime" }, componentType: "Earning", base: 4_687.5, rate: 150, quantity: 10, amount: 70_300, source: "Attendance", remark: "10h × 150%" },
  { id: "l5", componentCode: "SS_EMP", componentName: { ar: "الضمان — حصة العامل", en: "Social security — employee" }, componentType: "Deduction", base: 1_170_300, rate: 5, amount: 58_515, source: "Statutory" },
  { id: "l6", componentCode: "INCOME_TAX", componentName: { ar: "ضريبة الدخل", en: "Income tax" }, componentType: "Deduction", base: 528_785, amount: 21_900, source: "Statutory" },
  { id: "l7", componentCode: "LOAN", componentName: { ar: "قسط قرض موظف", en: "Loan instalment" }, componentType: "Deduction", amount: 150_000, source: "Loan", remark: "LN-2026-0007" },
  { id: "l8", componentCode: "SS_ER", componentName: { ar: "الضمان — حصة صاحب العمل", en: "Social security — employer" }, componentType: "EmployerContribution", base: 1_170_300, rate: 12, amount: 140_436, source: "Statutory" },
];

// Example 12.3 (journal for the payslip above) — balanced at 1,410,736.
const journalLines: JournalLine[] = [
  { id: "j1", accountCode: "5110", accountName: { ar: "مصروف الرواتب والأجور", en: "Salaries & wages expense" }, debit: 1_270_300, credit: 0, memo: "RUN-2026-0009", costCenter: "CC-OPS" },
  { id: "j2", accountCode: "5120", accountName: { ar: "مصروف حصة صاحب العمل — الضمان", en: "Employer social security expense" }, debit: 140_436, credit: 0, memo: "12% × 1,170,300", costCenter: "CC-OPS" },
  { id: "j3", accountCode: "2210", accountName: { ar: "أمانات الضمان الاجتماعي", en: "Social security payable" }, debit: 0, credit: 198_951, memo: "58,515 + 140,436", costCenter: "CC-OPS" },
  { id: "j4", accountCode: "2220", accountName: { ar: "أمانات ضريبة الدخل", en: "Income tax payable" }, debit: 0, credit: 21_900, costCenter: "CC-OPS" },
  { id: "j5", accountCode: "1250", accountName: { ar: "قروض وسلف الموظفين المدينة", en: "Employee loans receivable" }, debit: 0, credit: 150_000, costCenter: "CC-OPS" },
  { id: "j6", accountCode: "2230", accountName: { ar: "رواتب مستحقة الدفع", en: "Net salaries payable" }, debit: 0, credit: 1_039_885, costCenter: "CC-OPS" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-border pb-2 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentsShowcasePage() {
  const { t } = useLocale();
  const { role, setRole } = useRole();

  const [profileFilter, setProfileFilter] = useState(FILTER_ALL);
  const [tableState, setTableState] = useState<"data" | "loading" | "error">("data");
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(1_270_300);
  const [employeeId, setEmployeeId] = useState("");
  const [option, setOption] = useState("");
  const [chips, setChips] = useState(["BASIC", "HOUSING"]);
  const [chipInput, setChipInput] = useState("");
  const [multi, setMulti] = useState<string[]>(["PRIVATE_IQ"]);
  const [fileName, setFileName] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([
    { id: "a1", name: "قرار-العقوبة-DISC-2026-014.pdf", size: 184_320, uploadedAt: "2026-09-12T09:30:00" },
  ]);
  const [log, setLog] = useState<string[]>([]);

  const rows = runs.filter((run) => profileFilter === FILTER_ALL || run.profile === profileFilter);

  const columns: DataTableColumn<RunRow>[] = [
    { key: "runNo", header: "RUN", sortValue: (r) => r.runNo, cell: (r) => <span dir="ltr">{r.runNo}</span> },
    { key: "period", header: "Period", sortValue: (r) => r.period },
    { key: "profile", header: "Profile", cell: (r) => <StatusBadge label={r.profile} tone="neutral" /> },
    { key: "employees", header: "Employees", className: "text-end", sortValue: (r) => r.employees },
    { key: "gross", header: "Gross", className: "text-end", sortValue: (r) => r.gross, cell: (r) => <MoneyCell value={r.gross} /> },
    { key: "net", header: "Net", className: "text-end", sortValue: (r) => r.net, cell: (r) => <MoneyCell value={r.net} /> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge label={r.status} tone={statusTone[r.status]} /> },
  ];

  const totals = rows.reduce((acc, r) => ({ gross: acc.gross + r.gross, net: acc.net + r.net }), { gross: 0, net: 0 });

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Shared components</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Role:</span>
          {(Object.keys(roleLabels) as (keyof typeof roleLabels)[]).map((key) => (
            <Button key={key} size="sm" variant={role === key ? "default" : "outline"} onClick={() => setRole(key)}>
              {t(roleLabels[key])}
            </Button>
          ))}
        </div>
      </header>

      <Section title="KPICard · StatusBadge">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Gross payroll" value="58,420,000" icon={Banknote} description="Sept 2026" trend={{ value: 3.2, label: "+3.2% vs last month" }} />
          <KPICard title="Employees" value={42} icon={Users} tone="success" trend={{ value: 1, label: "+1" }} />
          <KPICard title="Pending approvals" value={3} icon={Clock} tone="warning" progress={30} />
          <KPICard title="Late deductions" value="1,240,000" icon={Wallet} tone="destructive" trend={{ value: 12, label: "+12%", goodDirection: "down" }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["neutral", "info", "success", "warning", "destructive"] as StatusTone[]).map((tone) => (
            <StatusBadge key={tone} label={tone} tone={tone} />
          ))}
        </div>
      </Section>

      <Section title="DataTable — search, filter, sort, totals footer, states">
        <div className="flex gap-2">
          {(["data", "loading", "error"] as const).map((s) => (
            <Button key={s} size="sm" variant={tableState === s ? "default" : "outline"} onClick={() => setTableState(s)}>
              {s}
            </Button>
          ))}
        </div>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(r) => r.id}
          searchKeys={["runNo", "period"]}
          pageSize={5}
          loading={tableState === "loading"}
          error={tableState === "error" ? "GET /api/payroll/runs → 500" : undefined}
          onRetry={() => setTableState("data")}
          onRowClick={(r) => setLog((prev) => [`row clicked: ${r.runNo}`, ...prev].slice(0, 3))}
          filters={
            <FilterSelect
              label="Profile"
              value={profileFilter}
              onChange={setProfileFilter}
              allLabel="All"
              options={[
                { value: "GOVERNMENT_IQ", label: "GOVERNMENT_IQ" },
                { value: "PRIVATE_IQ", label: "PRIVATE_IQ" },
              ]}
            />
          }
          footer={
            <>
              <td className="px-3 py-2.5" colSpan={4}>Total</td>
              <td className="px-3 py-2.5 text-end"><MoneyCell value={totals.gross} bold /></td>
              <td className="px-3 py-2.5 text-end"><MoneyCell value={totals.net} bold /></td>
              <td />
            </>
          }
        />
        {log.length > 0 && <p className="text-xs text-muted-foreground">{log.join(" · ")}</p>}
      </Section>

      <Section title="WorkflowActionBar (filtered by the current role) · Modal">
        <p className="text-xs text-muted-foreground">
          Current role: <b>{role ? t(roleLabels[role]) : "none"}</b> — approve = hrManager, post/reverse = financeAccountant, submit = payrollOfficer.
        </p>
        <WorkflowActionBar
          actions={[
            { key: "submit", label: "Submit for approval", icon: Send, roles: ["payrollOfficer"], onClick: () => setLog(["submitted"]) },
            { key: "approve", label: "Approve", icon: BadgeCheck, roles: ["hrManager"], onClick: () => setLog(["approved"]) },
            { key: "post", label: "Post", icon: CheckCircle2, roles: ["financeAccountant"], confirm: { title: "Post this run?", description: "A journal entry will be generated." }, onClick: () => setLog(["posted"]) },
            { key: "reverse", label: "Reverse", icon: Undo2, variant: "destructive", roles: ["financeAccountant"], disabled: true, disabledReason: "Only posted runs can be reversed", onClick: () => setLog(["reversed"]) },
          ]}
        />
        <Button variant="outline" onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Modal title"
          description="Shared dialog wrapper with a footer slot."
          footer={<Button onClick={() => setModalOpen(false)}>Close</Button>}
        >
          <p className="text-sm text-muted-foreground">Body content.</p>
        </Modal>
      </Section>

      <Section title="FormField · MoneyInput · SearchableSelect · EmployeeSelect">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Basic salary" htmlFor="amount" required hint="Minimum wage rule is checked on submit">
            <MoneyInput id="amount" value={amount} onChange={setAmount} />
          </FormField>
          <FormField label="With error" htmlFor="amount2" error="Must be at least 350,000">
            <MoneyInput id="amount2" value={120_000} onChange={() => {}} invalid />
          </FormField>
          <FormField label="Text field" htmlFor="text">
            <Input id="text" placeholder="Reason" />
          </FormField>
          <FormField label="SearchableSelect" htmlFor="opt">
            <SearchableSelect value={option} onValueChange={setOption} options={["GOVERNMENT_IQ", "PRIVATE_IQ"]} placeholder="Select profile" />
          </FormField>
          <FormField label="EmployeeSelect">
            <EmployeeSelect value={employeeId} onValueChange={setEmployeeId} />
          </FormField>
          <div className="text-sm text-muted-foreground">
            amount = <MoneyCell value={amount ?? 0} />, employee = {employeeId || "—"}
          </div>
        </div>
      </Section>

      <Section title="ChipListEditor · MultiSelectChips · SingleFilePicker · Attachments">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChipListEditor
            items={chips}
            input={chipInput}
            onInputChange={setChipInput}
            placeholder="Component code"
            addLabel="Add"
            removeLabel="Remove"
            emptyLabel="No codes"
            onAdd={() => {
              const v = chipInput.trim().toUpperCase();
              if (v && !chips.includes(v)) setChips([...chips, v]);
              setChipInput("");
            }}
            onRemove={(v) => setChips(chips.filter((c) => c !== v))}
          />
          <MultiSelectChips
            options={[
              { value: "GOVERNMENT_IQ", label: "GOVERNMENT_IQ" },
              { value: "PRIVATE_IQ", label: "PRIVATE_IQ" },
            ]}
            selected={multi}
            onAdd={(v) => setMulti([...multi, v])}
            onRemove={(v) => setMulti(multi.filter((m) => m !== v))}
            placeholder="Add profile"
            removeLabel="Remove"
            emptyLabel="None"
          />
          <SingleFilePicker value={fileName} onFileSelected={(f) => setFileName(f.name)} browseLabel="Browse…" emptyLabel="No file chosen" />
          <AttachmentUploader items={attachments} onChange={setAttachments} />
        </div>
      </Section>

      <Section title="PayslipLineTable — example 12.2 (illustrative figures)">
        <PayslipLineTable
          lines={payslipLines}
          summary={{ grossPay: 1_270_300, totalDeductions: 230_415, netPay: 1_039_885, employerCost: 1_410_736 }}
        />
      </Section>

      <Section title="JournalPreview — example 12.3 (balanced) and an unbalanced case">
        <JournalPreview lines={journalLines} reference="JV-PAYRUN-0009" showCostCenter />
        <JournalPreview lines={journalLines.slice(0, 4)} />
      </Section>

      <Section title="Timeline">
        <Timeline
          items={[
            { id: 1, title: "Run calculated", description: "42 payslips generated, 1 warning", timestamp: "20/09/2026 10:12", icon: CheckCircle2 },
            { id: 2, title: "Submitted for approval", timestamp: "20/09/2026 10:40", icon: Send },
            { id: 3, title: "Run created", timestamp: "20/09/2026 09:58" },
          ]}
        />
      </Section>

      <Section title="ModuleScreensGrid — payroll">
        <ModuleScreensGrid moduleKey="payroll" />
      </Section>
    </main>
  );
}
