import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getAuditSummary, listAuditEvents } from "../auditDb";

export const auditRouter = router({
  list: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).optional().default(50),
      orderId: z.number().int().positive().optional(),
      outcome: z.enum(["success", "rejected", "failed", "duplicate"]).optional(),
    }).optional())
    .query(({ input }) => listAuditEvents(input ?? {})),

  summary: adminProcedure
    .input(z.object({ hours: z.number().int().min(1).max(168).optional().default(24) }).optional())
    .query(({ input }) => getAuditSummary(input?.hours ?? 24)),
});
