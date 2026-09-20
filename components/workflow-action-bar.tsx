"use client";

import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { Modal } from "@/components/modal";
import { useRole, type Role } from "@/components/role-provider";
import { Button } from "@/components/ui/button";
import { commonLabels, componentLabels } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

export type WorkflowAction = {
  key: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
  /** Roles allowed to run this action (omit = everyone). A user with no role is always denied. */
  roles?: readonly Role[];
  /** Disables the button even for allowed roles, e.g. a state-machine guard. */
  disabled?: boolean;
  disabledReason?: string;
  /** When set, a confirmation dialog is shown before `onClick` runs. */
  confirm?: { title: string; description?: string; confirmLabel?: string };
  onClick: () => void;
};

/**
 * Status-driven action buttons for detail screens (calculate / approve / post / reverse…).
 * The page passes only the actions valid for the current state; this bar then filters by the
 * mock role and handles the optional confirmation dialog.
 */
export function WorkflowActionBar({
  actions,
  showDenied = false,
  className,
}: {
  actions: WorkflowAction[];
  /** Render actions the role may not run as disabled buttons instead of hiding them. */
  showDenied?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const { role } = useRole();
  // The action stays in state after closing so the dialog text does not flicker during its exit animation.
  const [pending, setPending] = useState<WorkflowAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allowed = (action: WorkflowAction) =>
    !action.roles || (role !== null && action.roles.includes(role));
  const visible = showDenied ? actions : actions.filter(allowed);

  if (visible.length === 0) return null;

  function run(action: WorkflowAction) {
    if (action.confirm) {
      setPending(action);
      setConfirmOpen(true);
    } else action.onClick();
  }

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {visible.map((action) => {
          const Icon = action.icon;
          const denied = !allowed(action);
          const disabled = denied || action.disabled;
          return (
            <Button
              key={action.key}
              type="button"
              variant={action.variant ?? "default"}
              disabled={disabled}
              title={
                denied ? t(componentLabels.noPermission) : action.disabled ? action.disabledReason : undefined
              }
              onClick={() => run(action)}
            >
              {Icon && <Icon className="size-4" />}
              {action.label}
            </Button>
          );
        })}
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pending?.confirm?.title ?? t(componentLabels.confirmAction)}
        description={pending?.confirm?.description}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              {t(commonLabels.cancel)}
            </Button>
            <Button
              type="button"
              variant={pending?.variant === "destructive" ? "destructive" : "default"}
              onClick={() => {
                setConfirmOpen(false);
                pending?.onClick();
              }}
            >
              {pending?.confirm?.confirmLabel ?? t(commonLabels.confirm)}
            </Button>
          </>
        }
      />
    </>
  );
}
