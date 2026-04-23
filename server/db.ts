import { eq, and, gt, sql } from "drizzle-orm";
import { normalizeOrderEmail } from "./_core/emailNormalize";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

const ADMIN_EMAIL_ALLOWLIST = new Set(
  [
    "goodaytarot@gmail.com",
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

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
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
