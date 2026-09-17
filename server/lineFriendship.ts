/**
 * 向 LINE 確認使用者是否為官方帳號好友。前端傳來的好友狀態一律不採信。
 *
 * 1. LINE Login 取得的使用者 access token → Friendship Status API（LINE 官方建議方式，
 *    需在 LINE Login channel 設定 Linked LINE Official Account）
 * 2. 失敗或沒有使用者 token 時 → Messaging API 取得好友 profile（200 = 好友；404 = 非好友或已封鎖）
 */
const LINE_API_TIMEOUT_MS = 8_000;

export type LineFriendshipResult =
  | { status: "friend"; via: "friendship_api" | "messaging_api" }
  | { status: "not_friend"; via: "friendship_api" | "messaging_api" }
  | { status: "unknown"; reason: string };

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINE_API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkWithLoginAccessToken(accessToken: string): Promise<boolean | null> {
  try {
    const res = await fetchWithTimeout("https://api.line.me/friendship/v1/status", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.warn("[LINE Friendship] friendship status API failed", res.status);
      return null;
    }
    const json = (await res.json()) as { friendFlag?: unknown };
    return typeof json.friendFlag === "boolean" ? json.friendFlag : null;
  } catch (error) {
    console.warn("[LINE Friendship] friendship status API error", error);
    return null;
  }
}

async function checkWithMessagingApi(lineUserId: string): Promise<boolean | null> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!channelAccessToken) return null;
  try {
    const res = await fetchWithTimeout(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    });
    await res.arrayBuffer();
    if (res.status === 200) return true;
    if (res.status === 404) return false;
    console.warn("[LINE Friendship] messaging API profile check failed", res.status);
    return null;
  } catch (error) {
    console.warn("[LINE Friendship] messaging API profile check error", error);
    return null;
  }
}

export async function checkLineFriendship(opts: {
  lineUserId: string;
  loginAccessToken?: string | null;
}): Promise<LineFriendshipResult> {
  if (opts.loginAccessToken) {
    const friendFlag = await checkWithLoginAccessToken(opts.loginAccessToken);
    if (friendFlag === true) return { status: "friend", via: "friendship_api" };
    // friendFlag=false 時仍以 Messaging API 再確認一次，避免 Login channel 與官方帳號的連結設定差異造成誤判
    if (friendFlag === false) {
      const viaMessaging = await checkWithMessagingApi(opts.lineUserId);
      if (viaMessaging === true) return { status: "friend", via: "messaging_api" };
      return { status: "not_friend", via: "friendship_api" };
    }
  }

  const viaMessaging = await checkWithMessagingApi(opts.lineUserId);
  if (viaMessaging === true) return { status: "friend", via: "messaging_api" };
  if (viaMessaging === false) return { status: "not_friend", via: "messaging_api" };
  return { status: "unknown", reason: "無法向 LINE 確認好友狀態" };
}

export function lineUserIdFromOpenId(openId: string | null | undefined) {
  return openId?.startsWith("line:") ? openId.slice("line:".length) : null;
}
