import { redirect } from "next/navigation";

// "/payroll/config" only exists as a breadcrumb step; the module home lists every configuration screen.
export default function PayrollConfigIndexPage() {
  redirect("/payroll");
}
