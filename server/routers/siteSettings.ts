import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { siteSettings } from "../../drizzle/schema";

const DEFAULT_ANNOUNCEMENT_TEXT = "任選兩件商品免運 · 6/1–6/10 全面九折 ·";
const ANNOUNCEMENT_TEXT_KEY = "announcementText";
const ANNOUNCEMENT_ENABLED_KEY = "announcementEnabled";

let tableEnsured = false;

async function ensureSiteSettingsTable() {
  if (tableEnsured) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`siteSettings\` (
      \`key\` varchar(64) NOT NULL,
      \`value\` text NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`key\`)
    )
  `);
  tableEnsured = true;
}

async function getSettingValue(key: string) {
  const db = await getDb();
  if (!db) return null;
  await ensureSiteSettingsTable();
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

async function upsertSettingValue(key: string, value: string) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫尚未連線，無法儲存網站設定" });
  }
  await ensureSiteSettingsTable();
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

export const siteSettingsRouter = router({
  public: publicProcedure.query(async () => {
    const [announcementText, announcementEnabled] = await Promise.all([
      getSettingValue(ANNOUNCEMENT_TEXT_KEY),
      getSettingValue(ANNOUNCEMENT_ENABLED_KEY),
    ]);

    return {
      announcementText: announcementText ?? DEFAULT_ANNOUNCEMENT_TEXT,
      announcementEnabled: announcementEnabled == null ? true : announcementEnabled === "true",
    };
  }),

  admin: adminProcedure.query(async () => {
    const [announcementText, announcementEnabled] = await Promise.all([
      getSettingValue(ANNOUNCEMENT_TEXT_KEY),
      getSettingValue(ANNOUNCEMENT_ENABLED_KEY),
    ]);

    return {
      announcementText: announcementText ?? DEFAULT_ANNOUNCEMENT_TEXT,
      announcementEnabled: announcementEnabled == null ? true : announcementEnabled === "true",
    };
  }),

  update: adminProcedure
    .input(z.object({
      announcementText: z.string().trim().max(200, "公告文字最多 200 字"),
      announcementEnabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      await Promise.all([
        upsertSettingValue(ANNOUNCEMENT_TEXT_KEY, input.announcementText),
        upsertSettingValue(ANNOUNCEMENT_ENABLED_KEY, String(input.announcementEnabled)),
      ]);

      return {
        announcementText: input.announcementText,
        announcementEnabled: input.announcementEnabled,
      };
    }),
});
