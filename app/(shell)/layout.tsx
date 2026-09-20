import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { QuickAccess } from "@/components/shell/quick-access";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <QuickAccess />
        <Breadcrumbs />
        <main className="min-h-0 flex-1 overflow-y-auto bg-launcher-wash p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
