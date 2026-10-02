/**
 * 會員與訂單的歸屬規則（單一來源）
 *
 * 訪客訂單不會回填 orders.userId，所以「這筆訂單算不算這位會員的」有兩條路：
 * 1. 訂單本來就綁在這個會員身上
 * 2. 訂單沒有綁會員，而 buyerEmail 跟會員「已驗證」的 email 相同
 *
 * 未驗證的 Email 不算，否則註冊成別人的信箱就能看到對方的訂單。
 *
 * 這裡同時放「會員中心可見」與「可否評價」兩條規則，讓它們並排、不會各自走偏。
 * 兩者只差一個邊緣情況：訂單已綁在「別的」userId、但 buyerEmail 對上另一位已驗證
 * 會員時，會員中心看得到（沿用既有行為），評價資格則不給。正式站目前這種訂單是 0 筆。
 */
import { eq, or, sql, type SQL } from "drizzle-orm";
import { orders } from "../drizzle/schema";
import { normalizeOrderEmail } from "./_core/emailNormalize";
import { getUserByOpenId } from "./db";

export type MemberIdentity = {
  userId: number;
  /** 已驗證的 Email；未驗證或沒有就是 null */
  verifiedEmail: string | null;
};

/** 以資料庫裡的最新狀態為準，不要用 session 裡可能過期的 emailVerified */
export async function resolveMemberIdentity(sessionUser: {
  id: number;
  openId: string;
  email?: string | null;
  emailVerified?: boolean | null;
}): Promise<MemberIdentity> {
  const current = (await getUserByOpenId(sessionUser.openId)) ?? sessionUser;
  return {
    userId: current.id,
    verifiedEmail: current.emailVerified ? current.email ?? null : null,
  };
}

/**
 * 會員中心「我的訂單」的可見條件（既有行為，未收緊）。
 * 兩者都沒有時回 null，代表查不到任何訂單。
 */
export function memberVisibleOrdersWhere(opts: { userId?: number | null; email?: string | null }): SQL | null {
  const conditions: SQL[] = [];
  if (opts.userId != null) {
    conditions.push(eq(orders.userId, opts.userId));
  }
  if (opts.email) {
    const key = normalizeOrderEmail(opts.email);
    conditions.push(sql`LOWER(TRIM(${orders.buyerEmail})) = ${key}`);
  }
  if (conditions.length === 0) return null;
  return conditions.length === 1 ? conditions[0] : or(...conditions)!;
}

/**
 * 評價資格用的歸屬判斷：已綁會員的訂單只認同一個 userId，
 * 訪客訂單才看已驗證 Email。
 */
export function isOrderOwnedByMember(
  order: { userId: number | null; buyerEmail: string },
  identity: MemberIdentity
) {
  if (order.userId != null) return order.userId === identity.userId;
  if (!identity.verifiedEmail) return false;
  return normalizeOrderEmail(order.buyerEmail) === normalizeOrderEmail(identity.verifiedEmail);
}
