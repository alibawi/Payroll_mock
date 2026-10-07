import { makeEffectiveHandlers } from "@/lib/payroll/effective-route";

const handlers = makeEffectiveHandlers("socialSecurity");
export const GET = handlers.GET;
export const POST = handlers.POST;
