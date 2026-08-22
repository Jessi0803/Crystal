import { sql, type SQL } from "drizzle-orm";
import { CUSTOM_PRODUCT_IDS } from "../shared/const";
import { getDb } from "./db";
import { sendCustomFormReminderEmail } from "./email";
import { notifyLineCustomFormReminder } from "./lineMessage";
import { getOrderWithItems } from "./orderDb";

type ReminderStage = "3m" | "24h" | "72h";

type ReminderCandidate = {
  id: number;
  merchantTradeNo: string;
  buyerName: string;
  buyerEmail: string;
  paidAt: Date | string | null;
  customFormReminder3mSentAt: Date | string | null;
  customFormReminder24hSentAt: Date | string | null;
  customFormReminder72hSentAt: Date | string | null;
};

type ReminderResult = {
  scanned: number;
  sent3m: number;
  sent24h: number;
  sent72h: number;
  skipped: number;
  failed: number;
};

function getSiteUrl(): string {
  return process.env.SITE_URL?.trim().replace(/\/$/, "") || "https://goodaytarot.com";
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function getReminderStage(candidate: ReminderCandidate): ReminderStage | null {
  if (!candidate.paidAt) return null;
  const paidAt = candidate.paidAt instanceof Date ? candidate.paidAt : new Date(candidate.paidAt);
  if (!candidate.customFormReminder24hSentAt && paidAt <= hoursAgo(24)) {
    return "24h";
  }
  if (!candidate.customFormReminder72hSentAt && paidAt <= hoursAgo(72)) {
    return "72h";
  }
  if (!candidate.customFormReminder3mSentAt && paidAt <= minutesAgo(3)) {
    return "3m";
  }
  return null;
}

function getReminderColumn(reminderStage: ReminderStage) {
  if (reminderStage === "3m") return "customFormReminder3mSentAt";
  if (reminderStage === "24h") return "customFormReminder24hSentAt";
  return "customFormReminder72hSentAt";
}

function rowsFromExecuteResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    const first = result[0];
    if (Array.isArray(first)) return first as T[];
    return result as T[];
  }
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function executeRows<T>(query: SQL): Promise<T[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return rowsFromExecuteResult<T>(await db.execute(query));
}

async function hasReminderColumns() {
  const rows = await executeRows<{ columnName: string }>(sql`
    SELECT COLUMN_NAME AS columnName
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME IN (
        'customFormReminder3mSentAt',
        'customFormReminder24hSentAt',
        'customFormReminder72hSentAt'
      )
  `);
  return rows.length === 3;
}

function getCustomConsultationStartMarker(productId: string, orderItemId: number, itemIndex: number) {
  return `【客製需求開始：${productId}:${orderItemId}:${itemIndex}】`;
}

function hasCustomConsultationNote(
  customerNote: string | null | undefined,
  productId: string,
  orderItemId: number,
  itemIndex: number
) {
  if (customerNote?.includes(getCustomConsultationStartMarker(productId, orderItemId, itemIndex))) return true;
  return itemIndex === 1 && Boolean(customerNote?.includes(`【客製需求開始：${productId}】`));
}

async function hasPendingCustomConsultation(merchantTradeNo: string) {
  const order = await getOrderWithItems(merchantTradeNo);
  if (!order) return false;

  for (const item of order.items) {
    if (!CUSTOM_PRODUCT_IDS.includes(item.productId)) continue;
    for (let itemIndex = 1; itemIndex <= item.quantity; itemIndex += 1) {
      if (!hasCustomConsultationNote(order.customerNote, item.productId, item.id, itemIndex)) {
        return true;
      }
    }
  }

  return false;
}

async function markReminderSent(orderId: number, reminderStage: ReminderStage) {
  const column = getReminderColumn(reminderStage);
  await executeRows(sql`
    UPDATE \`orders\`
    SET ${sql.raw(`\`${column}\``)} = NOW()
    WHERE \`id\` = ${orderId}
  `);
}

async function sendReminder(candidate: ReminderCandidate, reminderStage: ReminderStage) {
  const lineResult = await notifyLineCustomFormReminder(candidate.id, reminderStage);
  if (lineResult.sent) {
    await markReminderSent(candidate.id, reminderStage);
    return true;
  }

  if (lineResult.reason !== "missing_order") {
    await sendCustomFormReminderEmail({
      to: candidate.buyerEmail,
      buyerName: candidate.buyerName,
      merchantTradeNo: candidate.merchantTradeNo,
      reminderStage,
      formUrl: `${getSiteUrl()}/order/${encodeURIComponent(candidate.merchantTradeNo)}`,
    });
  }
  if (lineResult.reason === "missing_order") return false;
  await markReminderSent(candidate.id, reminderStage);
  return true;
}

export async function runCustomFormReminderJob(): Promise<ReminderResult> {
  if (!(await hasReminderColumns())) {
    return { scanned: 0, sent3m: 0, sent24h: 0, sent72h: 0, skipped: 0, failed: 0 };
  }

  const candidates = await executeRows<ReminderCandidate>(sql`
    SELECT
      \`id\`,
      \`merchantTradeNo\`,
      \`buyerName\`,
      \`buyerEmail\`,
      \`paidAt\`,
      \`customFormReminder3mSentAt\`,
      \`customFormReminder24hSentAt\`,
      \`customFormReminder72hSentAt\`
    FROM \`orders\`
    WHERE \`isCustomOrder\` = TRUE
      AND \`orderStatus\` = 'deposit_paid'
      AND \`paymentStatus\` IN ('paid', 'confirmed')
      AND \`paidAt\` <= ${minutesAgo(3)}
      AND (
        \`customFormReminder3mSentAt\` IS NULL
        OR \`customFormReminder24hSentAt\` IS NULL
        OR (\`paidAt\` <= ${hoursAgo(72)} AND \`customFormReminder72hSentAt\` IS NULL)
      )
    LIMIT 100
  `);

  const result: ReminderResult = {
    scanned: candidates.length,
    sent3m: 0,
    sent24h: 0,
    sent72h: 0,
    skipped: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    if (!(await hasPendingCustomConsultation(candidate.merchantTradeNo))) {
      result.skipped += 1;
      continue;
    }

    const reminderStage = getReminderStage(candidate);
    if (!reminderStage) {
      result.skipped += 1;
      continue;
    }

    try {
      const sent = await sendReminder(candidate, reminderStage);
      if (!sent) {
        result.skipped += 1;
      } else if (reminderStage === "3m") {
        result.sent3m += 1;
      } else if (reminderStage === "24h") {
        result.sent24h += 1;
      } else {
        result.sent72h += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error("[CustomFormReminders] reminder failed", {
        orderId: candidate.id,
        merchantTradeNo: candidate.merchantTradeNo,
        reminderStage,
        error,
      });
    }
  }

  return result;
}
