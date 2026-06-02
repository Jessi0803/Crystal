import { eq, and, gt, sql } from "drizzle-orm";
import { normalizeOrderEmail } from "./_core/emailNormalize";
import { drizzle } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import { chatbotLogs, InsertUser, orders, users } from "../drizzle/schema";
import { ENV } from './_core/env';

const ADMIN_EMAIL_ALLOWLIST = new Set(
  [
    "goodaytarot@gmail.com",
    "baby90522@gmail.com",
    ...(process.env.ADMIN_EMAILS?.split(",") ?? []),
  ]
    .map((email) => email.trim())
    .filter(Boolean)
    .map(normalizeOrderEmail)
);

export function shouldGrantAdminRole(openId: string, email?: string | null) {
  if (openId === ENV.ownerOpenId) return true;
  if (!email) return false;
  return ADMIN_EMAIL_ALLOWLIST.has(normalizeOrderEmail(email));
}

let _pool: Pool | null = null;

function shouldUseTls(databaseUrl: string) {
  if (process.env.DATABASE_SSL === "true") return true;

  try {
    const url = new URL(databaseUrl);
    return url.hostname.includes("tidbcloud.com");
  } catch {
    return false;
  }
}

function createDb(databaseUrl: string) {
  if (!shouldUseTls(databaseUrl)) {
    return drizzle(databaseUrl);
  }

  const url = new URL(databaseUrl);
  _pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    waitForConnections: true,
    connectionLimit: Number(process.env.DATABASE_CONNECTION_LIMIT || 10),
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    },
  });

  return drizzle(_pool);
}

let _db: ReturnType<typeof createDb> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = createDb(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (shouldGrantAdminRole(user.openId, user.email)) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (user.emailVerified !== undefined) {
      values.emailVerified = user.emailVerified;
      updateSet.emailVerified = user.emailVerified;
      if (user.emailVerified) {
        updateSet.verifyToken = null;
        updateSet.verifyTokenExpiresAt = null;
      }
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const key = normalizeOrderEmail(email);
  const result = await db
    .select()
    .from(users)
    .where(sql`LOWER(TRIM(${users.email})) = ${key}`)
    .orderBy(sql`CASE WHEN ${users.openId} LIKE 'line:%' THEN 0 ELSE 1 END`, sql`${users.updatedAt} DESC`)
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

async function mergeDuplicateMemberIntoPrimary(opts: {
  primaryUserId: number;
  duplicateUserId: number;
  lineOpenId: string;
  email: string;
  name?: string | null;
  lastSignedIn: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (opts.primaryUserId === opts.duplicateUserId) return;

  const [primary] = await db.select().from(users).where(eq(users.id, opts.primaryUserId)).limit(1);
  const [duplicate] = await db.select().from(users).where(eq(users.id, opts.duplicateUserId)).limit(1);
  if (!primary || !duplicate) return;

  await db.update(orders).set({ userId: opts.primaryUserId }).where(eq(orders.userId, opts.duplicateUserId));
  await db
    .update(chatbotLogs)
    .set({ userId: opts.primaryUserId })
    .where(eq(chatbotLogs.userId, opts.duplicateUserId));

  const shouldKeepAdmin = primary.role === "admin" || duplicate.role === "admin" || shouldGrantAdminRole(opts.lineOpenId, opts.email);
  await db
    .update(users)
    .set({
      openId: opts.lineOpenId,
      name: opts.name?.trim() || primary.name || duplicate.name,
      email: opts.email,
      passwordHash: primary.passwordHash ?? duplicate.passwordHash,
      emailVerified: true,
      verifyToken: null,
      verifyTokenExpiresAt: null,
      resetToken: primary.resetToken ?? duplicate.resetToken,
      resetTokenExpiresAt: primary.resetTokenExpiresAt ?? duplicate.resetTokenExpiresAt,
      loginMethod: "line",
      role: shouldKeepAdmin ? "admin" : "user",
      lastSignedIn: opts.lastSignedIn,
      updatedAt: new Date(),
    })
    .where(eq(users.id, opts.primaryUserId));

  try {
    await db.execute(sql`
      UPDATE \`users\` primary_user
      JOIN \`users\` duplicate_user ON duplicate_user.\`id\` = ${opts.duplicateUserId}
      SET primary_user.\`vipTier\` = CASE
            WHEN COALESCE(primary_user.\`vipTier\`, 'none') = 'none'
            THEN COALESCE(duplicate_user.\`vipTier\`, 'none')
            ELSE primary_user.\`vipTier\`
          END,
          primary_user.\`vipNote\` = COALESCE(primary_user.\`vipNote\`, duplicate_user.\`vipNote\`)
      WHERE primary_user.\`id\` = ${opts.primaryUserId}
    `);
  } catch (error) {
    if (!String(error).includes("Unknown column")) {
      console.warn("[Database] Failed to merge member VIP fields:", error);
    }
  }

  await db.delete(users).where(eq(users.id, opts.duplicateUserId));
}

export async function upsertLineUserAsPrimary(data: {
  openId: string;
  email?: string | null;
  name?: string | null;
  lastSignedIn?: Date;
}) {
  if (!data.openId.startsWith("line:")) {
    throw new Error("LINE openId is required");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert LINE user: database not available");
    return;
  }

  const email = data.email ? normalizeOrderEmail(data.email) : null;
  const lastSignedIn = data.lastSignedIn ?? new Date();
  const name = data.name?.trim() || null;

  const [lineUser] = await db.select().from(users).where(eq(users.openId, data.openId)).limit(1);
  const [sameEmailUser] = email
    ? await db
        .select()
        .from(users)
        .where(sql`LOWER(TRIM(${users.email})) = ${email} AND ${users.openId} <> ${data.openId}`)
        .limit(1)
    : [];

  if (lineUser && sameEmailUser) {
    await mergeDuplicateMemberIntoPrimary({
      primaryUserId: lineUser.id,
      duplicateUserId: sameEmailUser.id,
      lineOpenId: data.openId,
      email: email!,
      name,
      lastSignedIn,
    });
    return;
  }

  if (lineUser) {
    await db
      .update(users)
      .set({
        name: name || lineUser.name,
        email: email ?? lineUser.email,
        loginMethod: "line",
        emailVerified: true,
        verifyToken: null,
        verifyTokenExpiresAt: null,
        role: shouldGrantAdminRole(data.openId, email ?? lineUser.email) || lineUser.role === "admin" ? "admin" : lineUser.role,
        lastSignedIn,
        updatedAt: new Date(),
      })
      .where(eq(users.id, lineUser.id));
    return;
  }

  if (sameEmailUser) {
    await db
      .update(users)
      .set({
        openId: data.openId,
        name: name || sameEmailUser.name,
        email,
        loginMethod: "line",
        emailVerified: true,
        verifyToken: null,
        verifyTokenExpiresAt: null,
        role:
          shouldGrantAdminRole(data.openId, email) || sameEmailUser.role === "admin"
            ? "admin"
            : sameEmailUser.role,
        lastSignedIn,
        updatedAt: new Date(),
      })
      .where(eq(users.id, sameEmailUser.id));
    return;
  }

  await upsertUser({
    openId: data.openId,
    name: name ?? undefined,
    email: email ?? undefined,
    loginMethod: "line",
    lastSignedIn,
    emailVerified: true,
  });
}

export async function createEmailUser(data: {
  email: string;
  passwordHash: string;
  name: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const emailNorm = normalizeOrderEmail(data.email);
  // 使用 email 作為 openId 前置，避免與 Manus OAuth openId 衝突
  const openId = `email:${emailNorm}`;
  const role = shouldGrantAdminRole(openId, emailNorm) ? "admin" : "user";
  await db.insert(users).values({
    openId,
    email: emailNorm,
    passwordHash: data.passwordHash,
    name: data.name,
    loginMethod: 'email',
    role,
    lastSignedIn: new Date(),
  });
  return getUserByEmail(emailNorm);
}

export async function setResetToken(email: string, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const key = normalizeOrderEmail(email);
  await db.update(users)
    .set({ resetToken: token, resetTokenExpiresAt: expiresAt })
    .where(sql`LOWER(TRIM(${users.email})) = ${key}`);
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db.select().from(users)
    .where(and(eq(users.resetToken, token), gt(users.resetTokenExpiresAt, now)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePasswordAndClearToken(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(users)
    .set({ passwordHash, resetToken: null, resetTokenExpiresAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function setVerifyToken(email: string, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const key = normalizeOrderEmail(email);
  await db.update(users)
    .set({ verifyToken: token, verifyTokenExpiresAt: expiresAt })
    .where(sql`LOWER(TRIM(${users.email})) = ${key}`);
}

export async function getUserByVerifyToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db.select().from(users)
    .where(and(eq(users.verifyToken, token), gt(users.verifyTokenExpiresAt, now)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markEmailVerified(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(users)
    .set({ emailVerified: true, verifyToken: null, verifyTokenExpiresAt: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// TODO: add feature queries here as your schema grows.
