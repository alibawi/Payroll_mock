import { ComingSoon } from "@/components/coming-soon";

// Catch-all for payroll screens that are not built yet (/payroll itself has its own page.tsx).
// Concrete routes added by each module (e.g. app/(shell)/payroll/config/components) take precedence.
export default function PayrollComingSoonPage() {
  return <ComingSoon />;
}
