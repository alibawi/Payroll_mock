"use client";

import { MoneyCell } from "@/components/payroll/money-cell";
import { useCanSeeAmounts } from "@/lib/payroll/use-can";

/** An IQD amount that is masked for roles without salary visibility (spec-compensation §5). */
export function Amount(props: React.ComponentProps<typeof MoneyCell>) {
  const visible = useCanSeeAmounts();
  if (!visible) {
    return (
      <span dir="ltr" aria-label="hidden" className="whitespace-nowrap tracking-widest text-muted-foreground">
        ••••••
      </span>
    );
  }
  return <MoneyCell {...props} />;
}
