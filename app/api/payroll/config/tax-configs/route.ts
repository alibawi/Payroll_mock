import { makeEffectiveHandlers } from "@/lib/payroll/effective-route";

// GET ?profileId=pf-gov  ·  POST new effective-dated record (closes the previous one).
const handlers = makeEffectiveHandlers("tax");
export const GET = handlers.GET;
export const POST = handlers.POST;
