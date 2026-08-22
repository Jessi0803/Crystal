import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { orders } from "../drizzle/schema";
import { getDb } from "./db";
import { sendCustomFormReminderEmail } from "./email";
import { notifyLineCustomFormReminder } from "./lineMessage";

const CUSTOMER_NOTE_MARKER = "【客製需求開始：";

type ReminderStage = "3m" | "24h" | "72h";

type ReminderCandidate = {
  id: number;
  merchantTradeNo: string;
  buyerName: string;
  buyerEmail: string;
  paidAt: Date | null;
  customFormReminder3mSentAt: Date | null;
  customFormReminder24hSentAt: Date | null;
  customFormReminder72hSentAt: Date | null;
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
  if (!candidate.customFormReminder24hSentAt && candidate.paidAt <= hoursAgo(24)) {
    return "24h";
  }
  if (!candidate.customFormReminder72hSentAt && candidate.paidAt <= hoursAgo(72)) {
    return "72h";
  }
  if (!candidate.customFormReminder3mSentAt && candidate.paidAt <= minutesAgo(3)) {
    return "3m";
  }
  return null;
}

async function markReminderSent(orderId: number, reminderStage: ReminderStage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const update =
    reminderStage === "3m"
      ? { customFormReminder3mSentAt: now }
      : reminderStage === "24h"
        ? { customFormReminder24hSentAt: now }
        : { customFormReminder72hSentAt: now };
  await db
    .update(orders)
    .set(update)
    .where(eq(orders.id, orderId));
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const candidates = await db
    .select({
      id: orders.id,
      merchantTradeNo: orders.merchantTradeNo,
      buyerName: orders.buyerName,
      buyerEmail: orders.buyerEmail,
      paidAt: orders.paidAt,
      customFormReminder3mSentAt: orders.customFormReminder3mSentAt,
      customFormReminder24hSentAt: orders.customFormReminder24hSentAt,
      customFormReminder72hSentAt: orders.customFormReminder72hSentAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.isCustomOrder, true),
        eq(orders.orderStatus, "deposit_paid"),
        or(eq(orders.paymentStatus, "paid"), eq(orders.paymentStatus, "confirmed")),
        lte(orders.paidAt, minutesAgo(3)),
        sql`(${orders.customerNote} IS NULL OR TRIM(${orders.customerNote}) = '' OR ${orders.customerNote} NOT LIKE ${`%${CUSTOMER_NOTE_MARKER}%`})`,
        or(
          isNull(orders.customFormReminder3mSentAt),
          isNull(orders.customFormReminder24hSentAt),
          and(lte(orders.paidAt, hoursAgo(72)), isNull(orders.customFormReminder72hSentAt))
        )
      )
    )
    .limit(100);

  const result: ReminderResult = {
    scanned: candidates.length,
    sent3m: 0,
    sent24h: 0,
    sent72h: 0,
    skipped: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
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
