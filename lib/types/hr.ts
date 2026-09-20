// Shapes of the HR integration placeholders (docs/roadmap.md 1): mock-data/hr/*.json, served by
// /api/hr/*. Payroll never owns these entities — it only reads them (docs/payroll-study 8.5).

export type EmploymentType = "Permanent" | "Temporary" | "Contract" | "PartTime" | "Internship";

export type EmployeeStatus = "active" | "on_leave" | "resigned" | "terminated" | "archived";

export type Employee = {
  id: string;
  employeeCode: string;
  fullNameAr: string;
  fullNameEn: string;
  gender: "male" | "female";
  dateOfBirth: string;
  nationality: string;
  maritalStatus: "single" | "married" | "divorced" | "widowed";
  nationalId: string;
  mobileNo: string;
  email: string;
  address: string;
  status: EmployeeStatus;
  joiningDate: string;
  probationEndDate: string | null;
  /** Set for leavers (resigned / terminated / archived) — feeds end-of-service cases. */
  terminationDate: string | null;
  workLocation: string;
  department: string;
  departmentEn: string;
  position: string;
  positionEn: string;
  jobGrade: string;
  costCenter: string;
  directManager: string | null;
  employmentType: EmploymentType;
  salaryType: "Monthly" | "Weekly" | "Daily";
  currencyCode: string;
  numOfChildren: number;
  bankCardNo: string;
};

export type Position = {
  id: string;
  positionCode: string;
  titleAr: string;
  titleEn: string;
  department: string;
  jobGrade: string;
  employmentType: string;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  attendanceStatus: "present" | "late" | "absent" | "on_leave";
  lateMinutes: number;
  overtimeMinutes: number;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  finalStatus: string;
};

export type RewardDisciplineRecord = {
  id: string;
  type: "reward" | "disciplinary";
  subType: string;
  employeeId: string;
  reason: string;
  decisionDate: string;
};
