import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { operationAuditEvents } from "../drizzle/schema";
import { getDb } from "./db";

export type AuditOutcome = "success" | "rejected" | "failed" | "duplicate";
export type AuditSeverity = "info" | "warning" | "error";

export type AuditEventInput = {
  source: "admin" | "ecpay" | "paypal" | "logistics" | "system";
  category: string;
  action: string;
  outcome: AuditOutcome;
  severity?: AuditSeverity;
  orderId?: number | null;
  merchantTradeNo?: string | null;
  actorUserId?: number | null;
  summary: string;
  details?: Record<string, unknown> | null;
};

let ensurePromise: Promise<void> | null = null;

async function ensureAuditTable() {
  const db = await getDb();
  if (!db) return null;
  if (!ensurePromise) {
    ensurePromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`operationAuditEvents\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`source\` varchar(32) NOT NULL,
        \`category\` varchar(32) NOT NULL,
        \`action\` varchar(96) NOT NULL,
        \`outcome\` varchar(24) NOT NULL,
        \`severity\` varchar(16) NOT NULL DEFAULT 'info',
        \`orderId\` int NULL,
        \`merchantTradeNo\` varchar(32) NULL,
        \`actorUserId\` int NULL,
        \`summary\` varchar(255) NOT NULL,
        \`details\` json NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`operation_audit_created_at_idx\` (\`createdAt\`),
        INDEX \`operation_audit_order_created_at_idx\` (\`orderId\`, \`createdAt\`),
        INDEX \`operation_audit_merchant_created_at_idx\` (\`merchantTradeNo\`, \`createdAt\`),
        INDEX \`operation_audit_outcome_created_at_idx\` (\`outcome\`, \`createdAt\`)
      )
    `).then(() => undefined).catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
  return db;
}

const SENSITIVE_KEY = /(password|secret|hash|token|receipt|image|base64|checkmac|authorization|cookie)/i;

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 3) return "[truncated]";
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.length > 300 ? `${value.slice(0, 300)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([key, nested]) => [key, SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeValue(nested, depth + 1)])
    );
  }
  return String(value);
}

export function sanitizeAuditDetails(value: unknown): Record<string, unknown> | null {
  const sanitized = sanitizeValue(value, 0);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : null;
}

export async function recordAuditEvent(event: AuditEventInput) {
  const db = await ensureAuditTable();
  if (!db) return false;
  await db.insert(operationAuditEvents).values({
    source: event.source,
    category: event.category.slice(0, 32),
    action: event.action.slice(0, 96),
    outcome: event.outcome,
    severity: event.severity ?? (event.outcome === "failed" ? "error" : event.outcome === "rejected" ? "warning" : "info"),
    orderId: event.orderId ?? null,
    merchantTradeNo: event.merchantTradeNo?.slice(0, 32) ?? null,
    actorUserId: event.actorUserId ?? null,
    summary: event.summary.slice(0, 255),
    details: sanitizeAuditDetails(event.details),
  });
  return true;
}

/** 稽核寫入失敗不可中斷付款或管理員原操作。 */
export async function recordAuditEventSafely(event: AuditEventInput) {
  if (process.env.NODE_ENV === "test" && process.env.ENABLE_AUDIT_IN_TESTS !== "true") return false;
  try {
    return await recordAuditEvent(event);
  } catch (error) {
    console.error("[Audit] Failed to persist event", {
      action: event.action,
      outcome: event.outcome,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function listAuditEvents(input: {
  limit?: number;
  orderId?: number;
  outcome?: AuditOutcome;
  since?: Date;
}) {
  const db = await ensureAuditTable();
  if (!db) throw new Error("Database not available");
  const conditions: SQL[] = [];
  if (input.orderId) conditions.push(eq(operationAuditEvents.orderId, input.orderId));
  if (input.outcome) conditions.push(eq(operationAuditEvents.outcome, input.outcome));
  if (input.since) conditions.push(gte(operationAuditEvents.createdAt, input.since));
  return db
    .select()
    .from(operationAuditEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(operationAuditEvents.createdAt), desc(operationAuditEvents.id))
    .limit(Math.min(Math.max(input.limit ?? 50, 1), 200));
}

export async function getAuditSummary(hours = 24) {
  const db = await ensureAuditTable();
  if (!db) throw new Error("Database not available");
  const since = new Date(Date.now() - hours * 60 * 60_000);
  const rows = await db
    .select({ outcome: operationAuditEvents.outcome, count: sql<number>`count(*)` })
    .from(operationAuditEvents)
    .where(gte(operationAuditEvents.createdAt, since))
    .groupBy(operationAuditEvents.outcome);
  const result = { success: 0, rejected: 0, failed: 0, duplicate: 0 };
  for (const row of rows) {
    const key = row.outcome as keyof typeof result;
    if (key in result) result[key] = Number(row.count ?? 0);
  }
  return { hours, ...result };
}
