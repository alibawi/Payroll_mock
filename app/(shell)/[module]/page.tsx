import { notFound } from "next/navigation";

import { ComingSoon } from "@/components/coming-soon";
import { moduleNavItems } from "@/lib/navigation";

// Every non-payroll module is launcher decoration (docs/identity.md 2.3) and opens a ComingSoon screen.
const decorativeSlugs = moduleNavItems
  .filter((item) => !item.live)
  .map((item) => item.href.slice(1));

export const dynamicParams = false;

export function generateStaticParams() {
  return decorativeSlugs.map((module) => ({ module }));
}

export default async function DecorativeModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (!decorativeSlugs.includes(module)) notFound();
  return <ComingSoon />;
}
