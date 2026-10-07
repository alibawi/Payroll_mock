import { makeEffectiveHandlers } from "@/lib/payroll/effective-route";

const handlers = makeEffectiveHandlers("pension");
export const GET = handlers.GET;
export const POST = handlers.POST;
