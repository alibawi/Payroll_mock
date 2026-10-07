// Shared payroll types. Entity types are added here module by module (docs/spec-payroll-*.md §2);
// this first slice only covers what the shared components (0.8) render.

export type ComponentType =
  | "Earning"
  | "Deduction"
  | "EmployerContribution"
  | "Informational";

/** Where a payslip line came from (docs/spec-payroll-runs.md 2.6). */
export type PayslipLineSource =
  | "Structure"
  | "Override"
  | "Input"
  | "Loan"
  | "Statutory"
  | "Penalty"
  | "Attendance";

export type PayslipLine = {
  id: string;
  componentCode: string;
  componentName: { ar: string; en: string };
  componentType: ComponentType;
  base?: number;
  rate?: number;
  quantity?: number;
  amount: number;
  source?: PayslipLineSource;
  remark?: string;
};

/** One line of a payroll / loan / end-of-service journal entry (docs/spec-payroll-runs.md 2.7). */
export type JournalLine = {
  id: string;
  accountCode: string;
  accountName: { ar: string; en: string };
  debit: number;
  credit: number;
  memo?: string;
  costCenter?: string;
};

// ---------------------------------------------------------------------------------------------
// Module 1 — configuration entities (docs/spec-payroll-config.md §2)
// ---------------------------------------------------------------------------------------------

export type LocalizedText = { ar: string; en: string };

export type ComponentCategory =
  | "Basic"
  | "Allowance"
  | "Overtime"
  | "Bonus"
  | "StatutoryPension"
  | "StatutorySocialSecurity"
  | "IncomeTax"
  | "LoanRepayment"
  | "UnionDues"
  | "AbsenceDeduction"
  | "LatenessDeduction"
  | "DisciplinaryPenalty"
  | "CourtOrder"
  | "Other";

export type CalculationMethod =
  | "FixedAmount"
  | "PercentOfBase"
  | "Formula"
  | "RateTable"
  | "AttendanceDriven"
  | "Manual";

export type PayrollComponent = {
  id: string;
  code: string;
  name: LocalizedText;
  componentType: ComponentType;
  category: ComponentCategory;
  calculationMethod: CalculationMethod;
  percentValue: number | null;
  baseComponentCodes: string[];
  isTaxable: boolean;
  isPensionable: boolean;
  isSocialSecurityBase: boolean;
  isProratable: boolean;
  reducesGross: boolean;
  expenseAccountCode: string | null;
  payableAccountCode: string | null;
  sequence: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GlAccount = {
  id: string;
  code: string;
  name: LocalizedText;
  type: "Asset" | "Liability" | "Revenue" | "Expense";
};

export type PayFrequency = "Monthly" | "Weekly" | "Daily";
export type RoundingRule = 1 | 250 | 500 | 1000;
export type DayRateBasis = "WorkingDays" | "CalendarDays";
export type LatenessMethod = "PerMinute" | "Tiers" | "CountBased";
export type OverBreachAction = "AutoSpread" | "Block";

export type LatenessTier = {
  id: string;
  fromMinutes: number;
  /** `null` = open-ended last tier. */
  toMinutes: number | null;
  /** Fraction of a day's pay deducted per late event in this tier (0.25 = quarter day). */
  dayFraction: number;
};

export type AttendancePenaltyPolicy = {
  graceMinutes: number;
  latenessMethod: LatenessMethod;
  latenessTiers: LatenessTier[];
  latenessRatePerMinute: number | null;
  maxLateEventsBeforeDayCut: number | null;
  absenceDayRateComponentCodes: string[];
  maxMonthlyDeductionPercent: number;
  overBreachAction: OverBreachAction;
};

export type PayrollProfile = {
  id: string;
  code: "GOVERNMENT_IQ" | "PRIVATE_IQ";
  name: LocalizedText;
  description: LocalizedText;
  enablePension: boolean;
  enableSocialSecurity: boolean;
  enableIncomeTax: boolean;
  payFrequency: PayFrequency;
  roundingRule: RoundingRule;
  currencyCode: string;
  cutoffDay: number;
  overtimeMultiplierNormal: number;
  overtimeMultiplierRest: number;
  overtimeMultiplierHoliday: number;
  dayRateBasis: DayRateBasis;
  attendancePenaltyPolicy: AttendancePenaltyPolicy;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SalaryStructureLine = {
  id: string;
  componentId: string;
  overrideMethod: CalculationMethod | null;
  overrideAmount: number | null;
  overridePercent: number | null;
  overrideExpenseAccountCode: string | null;
  overridePayableAccountCode: string | null;
  sequence: number;
};

export type SalaryStructure = {
  id: string;
  code: string;
  name: LocalizedText;
  profileId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  lines: SalaryStructureLine[];
  createdAt: string;
  updatedAt: string;
};

export type GovtGradeStep = {
  id: string;
  grade: number;
  step: number;
  nominalSalary: number;
  annualIncrementAmount: number;
};

export type GovtGradeScale = {
  id: string;
  code: string;
  name: LocalizedText;
  profileId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  steps: GovtGradeStep[];
  createdAt: string;
  updatedAt: string;
};

/** Effective-dated settings share these fields; status is derived from the dates (spec §3). */
export type EffectiveDated = {
  id: string;
  profileId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes?: LocalizedText;
  createdAt: string;
};
export type EffectiveStatus = "Upcoming" | "Current" | "Expired";

export type TaxBracket = { id: string; fromAmount: number; toAmount: number | null; rate: number };
export type TaxExemptionKind = "Personal" | "Married" | "Spouse" | "PerChild" | "AgeOver63" | "Disability";
export type TaxExemption = { id: string; kind: TaxExemptionKind; annualAmount: number };

export type TaxConfiguration = EffectiveDated & {
  calcBasis: "MonthlyDirect" | "Annualized";
  currencyCode: string;
  brackets: TaxBracket[];
  exemptions: TaxExemption[];
};

type StatutoryRates = EffectiveDated & {
  employeeRate: number;
  employerRate: number;
  baseComponentCodes: string[];
  employeePayableAccountCode: string;
  employerExpenseAccountCode: string;
  employerPayableAccountCode: string;
};

export type PensionConfiguration = StatutoryRates;

export type SocialSecurityConfiguration = StatutoryRates & {
  establishmentFileNo: string;
  remittanceCycle: "Monthly" | "Quarterly";
  activityRateOverrides: { id: string; activity: LocalizedText; employerRate: number }[];
};

export type ConfigEntityType =
  | "component"
  | "profile"
  | "structure"
  | "gradeScale"
  | "tax"
  | "pension"
  | "socialSecurity";

export type ConfigActivity = {
  id: string;
  entityType: ConfigEntityType;
  entityId: string;
  action: "Created" | "Updated" | "Activated" | "Deactivated" | "Closed";
  actor: { name: LocalizedText; role: string };
  timestamp: string;
  summary: LocalizedText;
  changes: { field: string; from: string; to: string }[] | null;
};

/** Field-level validation failures returned with HTTP 422 (rule ids from spec §4). */
export type FieldErrors = Record<string, { rule: string; message: LocalizedText }>;

// ---------------------------------------------------------------------------------------------
// Module 2 — employee compensation (docs/spec-payroll-compensation.md §2)
// ---------------------------------------------------------------------------------------------

export type PaymentMethod = "Bank" | "Cash";
export type TaxMaritalStatus = "Single" | "Married" | "Divorced" | "Widowed";
export type CompensationStatus = "Upcoming" | "Current" | "Superseded";

export type EmployeeCompensation = {
  id: string;
  employeeId: string;
  profileId: string;
  salaryStructureId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  currencyCode: string;
  paymentMethod: PaymentMethod;
  bankAccountNo: string | null;
  costCenterId: string | null;
  projectId: string | null;
  /** Government: derives nominal salary and increment from the grade scale cell. */
  gradeStepId: string | null;
  /** Private: contractual basic wage. */
  baseSalary: number | null;
  taxMaritalStatus: TaxMaritalStatus;
  eligibleChildrenCount: number;
  isPensionExempt: boolean;
  changeReason: string | null;
  createdBy: string;
  createdAt: string;
};

/** Per-employee override of a structure component (e.g. contractual housing allowance, actual position allowance). */
export type EmployeeCompensationComponent = {
  id: string;
  compensationId: string;
  componentId: string;
  amount: number | null;
  percent: number | null;
};

export type CompensationActivity = {
  id: string;
  employeeId: string;
  compensationId: string | null;
  action: "Assigned" | "Increment" | "Promotion" | "Imported" | "Adjusted";
  actor: { name: LocalizedText; role: string };
  timestamp: string;
  summary: LocalizedText;
  changes: { field: string; from: string; to: string }[] | null;
};

export type PayrollSettings = { id: "settings"; minimumWage: number };

/** Row of GET /api/payroll/compensations (one per payroll-relevant employee). */
export type CompensationRow = {
  employee: import("@/lib/types/hr").Employee;
  compensation: EmployeeCompensation | null;
  isCurrent: boolean;
  hasUpcoming: boolean;
  recordCount: number;
  gross: number | null;
  net: number | null;
  belowMinimum: boolean;
  missing: boolean;
};

/** Parses a grade-scale cell id such as `gs-7-3` into `{ grade: 7, step: 3 }`. */
export function parseGradeStepId(id: string | null | undefined): { grade: number; step: number } | null {
  const match = /^gs-(\d+)-(\d+)$/.exec(id ?? "");
  return match ? { grade: Number(match[1]), step: Number(match[2]) } : null;
}

// ---------------------------------------------------------------------------------------------
// Module 3 — employee loans & advances (docs/spec-payroll-loans.md §2)
// ---------------------------------------------------------------------------------------------

export type LoanType = "PersonalLoan" | "SalaryAdvance";
export type LoanStatus =
  | "Draft"
  | "PendingApproval"
  | "Approved"
  | "Disbursed"
  | "Active"
  | "Settled"
  | "Cancelled";
export type RepaymentMethod = "FullNextPayroll" | "Installments";
export type InstallmentStatus = "Pending" | "Deducted" | "Waived" | "Deferred";

export type EmployeeLoan = {
  id: string;
  loanNo: string;
  employeeId: string;
  loanType: LoanType;
  loanDate: string;
  principal: number;
  currencyCode: string;
  interestType: "None" | "Flat";
  interestRate: number | null;
  totalRepayable: number;
  repaymentMethod: RepaymentMethod;
  installmentCount: number;
  installmentAmount: number;
  firstDeductionPeriodId: string;
  outstandingBalance: number;
  status: LoanStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  guarantorEmployeeId: string | null;
  reason: string;
  costCenterId: string | null;
  comments: string | null;
  loanReceivableAccountCode: string;
  disbursementAccountCode: string;
  journalEntryId: string | null;
  journalRef: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeLoanInstallment = {
  id: string;
  loanId: string;
  seqNo: number;
  duePeriodId: string;
  dueDate: string;
  amount: number;
  deductedAmount: number;
  status: InstallmentStatus;
  /** Set for an instalment created by deferring another one (the instalment it replaces). */
  deferredFromSeqNo: number | null;
  settlementSource: "Cash" | "Payroll" | null;
  payslipId: string | null;
  deductedOn: string | null;
  /** Module 5: set on an instalment created for the part of another one the monthly cap pushed out. */
  carriedByRunId?: string | null;
};

export type LoanActivity = {
  id: string;
  loanId: string;
  action:
    | "Created"
    | "Updated"
    | "Submitted"
    | "Approved"
    | "Rejected"
    | "Disbursed"
    | "Cancelled"
    | "EarlySettled"
    | "Deferred"
    | "Waived"
    | "Deducted"
    | "Settled"
    | "Comment";
  actor: { name: LocalizedText; role: string };
  timestamp: string;
  summary: LocalizedText;
};

/** Row of GET /api/payroll/loans. */
export type LoanRow = EmployeeLoan & {
  employee: import("@/lib/types/hr").Employee | null;
  nextInstallment: { seqNo: number; duePeriodId: string; amount: number } | null;
  hasDeferred: boolean;
};

// ---------------------------------------------------------------------------------------------
// Module 4 — disciplinary penalties and attendance (docs/spec-payroll-penalties.md §2)
// ---------------------------------------------------------------------------------------------

export type PenaltyType = "FixedAmount" | "DaysOfPay" | "OneMonthSalary" | "PercentOfSalary";
export type PenaltyStatus = "Draft" | "Approved" | "Applying" | "Applied" | "Cancelled";

export type DisciplinaryPenalty = {
  id: string;
  penaltyNo: string;
  employeeId: string;
  penaltyType: PenaltyType;
  /** Amount, number of days or percentage (unused for OneMonthSalary). */
  value: number | null;
  computedAmount: number;
  reason: string;
  decisionRef: string;
  decisionDate: string;
  issuedByUserId: string;
  spreadOverMonths: number;
  startPeriodId: string;
  remainingAmount: number;
  status: PenaltyStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PenaltyInstallment = {
  id: string;
  penaltyId: string;
  seqNo: number;
  duePeriodId: string;
  amount: number;
  deductedAmount: number;
  status: "Pending" | "Deducted";
  payslipId: string | null;
  carriedByRunId?: string | null;
  deferredFromSeqNo?: number | null;
};

export type PenaltyActivity = {
  id: string;
  penaltyId: string;
  action: "Created" | "Updated" | "Approved" | "Cancelled" | "Deducted" | "Applied" | "Comment";
  actor: { name: LocalizedText; role: string };
  timestamp: string;
  summary: LocalizedText;
};

/** HR attendance placeholder: one row per employee × period (IAttendancePeriodSummaryProvider — study 8.5). */
export type AttendanceSummary = {
  id: string;
  employeeId: string;
  periodId: string;
  workingDays: number;
  calendarDays: number;
  absenceDays: number;
  /** Minutes late of each late arrival in the period. */
  lateEvents: number[];
  lwpDays: number;
  overtimeHours: number;
};

/** Row of GET /api/payroll/penalties. */
export type PenaltyRow = DisciplinaryPenalty & {
  employee: import("@/lib/types/hr").Employee | null;
  installmentCount: number;
  deductedCount: number;
};

// ---------------------------------------------------------------------------------------------
// Module 5 — payroll periods, inputs and runs (docs/spec-payroll-runs.md §2)
// ---------------------------------------------------------------------------------------------

export type PeriodStatus = "Open" | "Locked" | "Closed";

/**
 * One month of one profile. `periodKey` is the `YYYY-MM` id that loans, penalties and attendance already use;
 * `id` is unique per (profile, month).
 */
export type PayrollPeriod = {
  id: string;
  periodKey: string;
  profileId: string;
  periodType: "Monthly";
  year: number;
  sequenceNo: number;
  startDate: string;
  endDate: string;
  /** Attendance cut-off (from the profile's `cutoffDay`). */
  cutoffDate: string;
  payDate: string;
  /** Core placeholder: the fiscal posting period the journal lands in. */
  postingPeriodId: string;
  status: PeriodStatus;
  createdAt: string;
};

export type PayrollInputStatus = "Pending" | "Applied" | "Cancelled";

/** A one-off bonus, adjustment or deduction for an employee in a month (also manual retro adjustments — R-11). */
export type PayrollInput = {
  id: string;
  periodKey: string;
  employeeId: string;
  componentId: string;
  amount: number;
  quantity: number | null;
  reason: string;
  isRetroAdjustment: boolean;
  status: PayrollInputStatus;
  /** The run that picked the input up (set at calculate, kept until reversal / recalculation). */
  appliedRunId: string | null;
  /** Set when the monthly cap cut the input: the amount actually deducted (the remainder moved to the next period). */
  originalAmount?: number;
  /** The run whose net protection carried this input (or its remainder) to the next period. */
  carriedByRunId?: string | null;
  carriedFromPeriodKey?: string | null;
  createdBy: string;
  createdAt: string;
};

export type RunType = "Regular" | "OffCycle" | "Bonus" | "Adjustment";
export type RunStatus = "Draft" | "Calculated" | "PendingApproval" | "Approved" | "Posted" | "Paid" | "Reversed";

export type RunScope = { departments: string[]; costCenters: string[]; employeeIds: string[] };

export type WarningSeverity = "Blocker" | "Warning" | "Info";
export type WarningCode =
  | "NO_COMPENSATION"
  | "NET_PROTECTION_SPREAD"
  | "NET_PROTECTION_BLOCK"
  | "NEGATIVE_NET"
  | "STATUTORY_CONFIG_MISSING"
  | "TAX_CONFIG_MISSING"
  | "PRORATED"
  | "NO_ATTENDANCE"
  | "BELOW_MINIMUM_WAGE"
  | "SUPPLEMENTARY_NO_TAX";

export type RunWarning = {
  id: string;
  severity: WarningSeverity;
  code: WarningCode;
  employeeId: string | null;
  payslipId: string | null;
  message: LocalizedText;
  amount?: number;
};

export type PayrollRun = {
  id: string;
  runNo: string;
  profileId: string;
  payrollPeriodId: string;
  periodKey: string;
  organizationId: string;
  runType: RunType;
  scopeFilter: RunScope;
  status: RunStatus;
  employeeCount: number;
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  employerCostTotal: number;
  journalEntryId: string | null;
  journalRef: string | null;
  paymentRef: string | null;
  baseType: "PAYRUN";
  /** The run created after this one was reversed (to redo the period). */
  reversalRunId: string | null;
  reversalReason: string | null;
  rejectionReason: string | null;
  warnings: RunWarning[];
  calculatedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  postedAt: string | null;
  paidAt: string | null;
  reversedAt: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PaidStatus = "Unpaid" | "Paid" | "Failed";

export type Payslip = {
  id: string;
  runId: string;
  periodKey: string;
  employeeId: string;
  compensationId: string;
  currencyCode: string;
  workedDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  absenceDays: number;
  lateEvents: number;
  lateMinutes: number;
  dayRate: number;
  grossEarnings: number;
  absenceDeduction: number;
  latenessDeduction: number;
  grossPay: number;
  taxableBase: number;
  pensionableBase: number;
  socialSecurityBase: number;
  incomeTax: number;
  totalEmployeeDeductions: number;
  netPay: number;
  employerContribution: number;
  employerCost: number;
  paymentMethod: PaymentMethod;
  bankAccountNo: string | null;
  costCenterId: string | null;
  paidStatus: PaidStatus;
  paidDate: string | null;
  paymentDocRef: string | null;
  netProtectionFlag: "Spread" | "Blocked" | null;
  trace: TraceStep[];
};

export type PayslipLineRecord = PayslipLine & {
  payslipId: string;
  componentId: string;
  category: ComponentCategory;
  isEmployerContribution: boolean;
  expenseAccountCode: string | null;
  payableAccountCode: string | null;
  sequence: number;
};

export type ScheduleSource = "EmployeeLoan" | "DisciplinaryPenalty" | "CourtOrder" | "Manual";
export type ScheduleStatus = "Planned" | "Applied" | "Released";

/** The bridge "what is due this month" built at calculation time (spec §2.3). */
export type PayrollDeductionScheduleItem = {
  id: string;
  runId: string;
  employeeId: string;
  periodKey: string;
  sourceType: ScheduleSource;
  sourceId: string;
  sourceRef: string;
  amount: number;
  appliedAmount: number;
  deferredAmount: number;
  status: ScheduleStatus;
  payslipId: string | null;
};

/** One line of the run's journal(s): `kind` separates the posting entry from the payment and reversal ones. */
export type RunJournalLine = {
  id: string;
  runId: string;
  kind: "Posting" | "Payment" | "Reversal";
  journalRef: string;
  accountCode: string;
  accountName: LocalizedText;
  debit: number;
  credit: number;
  costCenterId: string | null;
  projectId: string | null;
  baseType: "PAYRUN";
  baseEntry: string;
  baseRef: string;
  fiscalPeriodId: string;
  isAutoGenerated: boolean;
  isReversal: boolean;
  memo?: string;
};

export type RunActivity = {
  id: string;
  runId: string;
  action:
    | "Created"
    | "Calculated"
    | "Recalculated"
    | "Submitted"
    | "Approved"
    | "Rejected"
    | "Posted"
    | "Paid"
    | "Reversed"
    | "Deleted"
    | "Comment";
  actor: { name: LocalizedText; role: string };
  timestamp: string;
  summary: LocalizedText;
};

/** HR placeholders (leave-periods / holidays): informative time data behind a payslip. */
export type LeavePeriod = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  leaveType: "Annual" | "Sick" | "Unpaid" | "Maternity";
  isPaid: boolean;
};
export type Holiday = { id: string; date: string; name: LocalizedText };

export type TraceRow = { label: LocalizedText; formula?: string; value?: number | string };
export type TraceStep = { step: string; title: LocalizedText; rows: TraceRow[] };

/** Row of GET /api/payroll/runs. */
export type RunRow = PayrollRun & {
  profileCode: PayrollProfile["code"];
  blockerCount: number;
  warningCount: number;
};

/** Row of GET /api/payroll/periods (period + the runs that live on it). */
export type PeriodRow = PayrollPeriod & {
  runCount: number;
  pendingInputs: number;
  mainRun: { id: string; runNo: string; status: RunStatus } | null;
};

// ---------------------------------------------------------------------------------------------
// Module 6 — reports, remittances and end of service (docs/spec-payroll-reports.md §2)
// ---------------------------------------------------------------------------------------------

export type TerminationReason = "Resignation" | "ContractEnd" | "Termination" | "DismissalDisciplinary";
/** Gap G4: the study gives no status values — Draft → Approved → Paid (+ Cancelled). */
export type EosStatus = "Draft" | "Approved" | "Paid" | "Cancelled";

export type EndOfServiceCalculation = {
  id: string;
  eosNo: string;
  employeeId: string;
  terminationDate: string;
  terminationReason: TerminationReason;
  serviceYears: number;
  lastWage: number;
  gratuityAmount: number;
  accruedLeaveDays: number;
  accruedLeavePay: number;
  /** Arbitrary-dismissal compensation, when a court / the employer awards one. */
  arbitraryDismissalCompensation: number;
  totalAmount: number;
  status: EosStatus;
  journalRef: string | null;
  paymentRef: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EosActivity = {
  id: string;
  eosId: string;
  action: "Created" | "Updated" | "Approved" | "Paid" | "Cancelled" | "Comment";
  actor: { name: LocalizedText; role: string };
  timestamp: string;
  summary: LocalizedText;
};

export type RemittanceKind = "tax" | "pension" | "socialSecurity";
/** Placeholder state of paying the amounts over to the authority (Finance integration). */
export type RemittanceRecord = {
  id: string;
  periodKey: string;
  kind: RemittanceKind;
  status: "NotRemitted" | "Remitted";
  remittedAt: string | null;
  voucherRef: string | null;
};

export type LeaveBalance = { id: string; employeeId: string; annualDays: number };
