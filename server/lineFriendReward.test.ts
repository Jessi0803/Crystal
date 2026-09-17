import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("./couponDb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./couponDb")>();
  return {
    ...actual,
    getLineFriendRewardForUser: vi.fn(),
    getLineFriendRewardOffer: vi.fn(),
    grantLineFriendReward: vi.fn(),
  };
});

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertLineUserAsPrimary: vi.fn(),
  bindLineToUser: vi.fn(),
  shouldGrantAdminRole: vi.fn().mockReturnValue(false),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
    createSessionToken: vi.fn().mockResolvedValue("session-token"),
  },
}));

import { couponRouter } from "./routers/coupons";
import {
  getLineFriendRewardForUser,
  getLineFriendRewardOffer,
  grantLineFriendReward,
} from "./couponDb";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { checkLineFriendship } from "./lineFriendship";
import { lineOAuthCallback, lineOAuthStart } from "./lineOAuthRoutes";

const getLineFriendRewardForUserMock = vi.mocked(getLineFriendRewardForUser);
const getLineFriendRewardOfferMock = vi.mocked(getLineFriendRewardOffer);
const grantLineFriendRewardMock = vi.mocked(grantLineFriendReward);
const getUserByOpenIdMock = vi.mocked(db.getUserByOpenId);
const upsertLineUserAsPrimaryMock = vi.mocked(db.upsertLineUserAsPrimary);
const bindLineToUserMock = vi.mocked(db.bindLineToUser);
const authenticateRequestMock = vi.mocked(sdk.authenticateRequest);
const fetchMock = vi.fn();

const LINE_USER_ID = "U1234567890abcdef";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** 依網址回應 LINE API；friendFlag / botProfileStatus 控制好友狀態 */
function mockLineApis(opts: { friendFlag?: boolean | "error"; botProfileStatus?: number }) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes("/oauth2/v2.1/token")) {
      return jsonResponse(200, { access_token: "login-access-token" });
    }
    if (url.endsWith("/v2/profile")) {
      return jsonResponse(200, { userId: LINE_USER_ID, displayName: "LINE 會員" });
    }
    if (url.includes("/friendship/v1/status")) {
      if (opts.friendFlag === "error" || opts.friendFlag === undefined) return jsonResponse(403, { message: "not linked" });
      return jsonResponse(200, { friendFlag: opts.friendFlag });
    }
    if (url.includes("/v2/bot/profile/")) {
      return jsonResponse(opts.botProfileStatus ?? 404, {});
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

function memberCaller(openId: string) {
  return couponRouter.createCaller({
    user: { id: 42, openId, role: "user" } as any,
    req: { headers: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}` } } as any,
    res: {} as any,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "channel-token";
  process.env.LINE_CHANNEL_ID = "channel-id";
  process.env.LINE_CHANNEL_SECRET = "channel-secret";
  process.env.LINE_CALLBACK_URL = "https://example.test/api/oauth/callback";
  getLineFriendRewardOfferMock.mockResolvedValue({ name: "LINE 好友禮", discountAmount: 50, minOrderAmount: 0 });
  getLineFriendRewardForUserMock.mockResolvedValue(null);
  grantLineFriendRewardMock.mockResolvedValue({ status: "granted", coupon: { id: 1 } as any });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkLineFriendship", () => {
  it("uses the LINE Login friendship status API when available", async () => {
    mockLineApis({ friendFlag: true });
    await expect(checkLineFriendship({ lineUserId: LINE_USER_ID, loginAccessToken: "t" })).resolves.toEqual({
      status: "friend",
      via: "friendship_api",
    });
  });

  it("double-checks a false friendFlag with the Messaging API", async () => {
    mockLineApis({ friendFlag: false, botProfileStatus: 200 });
    await expect(checkLineFriendship({ lineUserId: LINE_USER_ID, loginAccessToken: "t" })).resolves.toEqual({
      status: "friend",
      via: "messaging_api",
    });
  });

  it("reports not_friend when both LINE APIs say so", async () => {
    mockLineApis({ friendFlag: false, botProfileStatus: 404 });
    await expect(checkLineFriendship({ lineUserId: LINE_USER_ID, loginAccessToken: "t" })).resolves.toMatchObject({
      status: "not_friend",
    });
  });

  it("falls back to the Messaging API when the friendship API fails", async () => {
    mockLineApis({ friendFlag: "error", botProfileStatus: 200 });
    await expect(checkLineFriendship({ lineUserId: LINE_USER_ID, loginAccessToken: "t" })).resolves.toEqual({
      status: "friend",
      via: "messaging_api",
    });
  });

  it("returns unknown instead of guessing when LINE cannot be reached", async () => {
    mockLineApis({ friendFlag: "error", botProfileStatus: 500 });
    await expect(checkLineFriendship({ lineUserId: LINE_USER_ID })).resolves.toMatchObject({ status: "unknown" });
  });
});

describe("coupons.claimLineFriendReward", () => {
  it("requires a LINE-bound account", async () => {
    await expect(memberCaller("email:a@example.com").claimLineFriendReward()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(grantLineFriendRewardMock).not.toHaveBeenCalled();
  });

  it("grants the reward only after the server confirms friendship", async () => {
    mockLineApis({ botProfileStatus: 200 });
    const result = await memberCaller(`line:${LINE_USER_ID}`).claimLineFriendReward();

    expect(result.status).toBe("granted");
    expect(grantLineFriendRewardMock).toHaveBeenCalledWith({ userId: 42, lineUserId: LINE_USER_ID });
  });

  it("does not grant when the member is not a friend", async () => {
    mockLineApis({ botProfileStatus: 404 });
    const result = await memberCaller(`line:${LINE_USER_ID}`).claimLineFriendReward();

    expect(result.status).toBe("not_friend");
    expect(grantLineFriendRewardMock).not.toHaveBeenCalled();
  });

  it("ignores client claims and does not call LINE again once claimed", async () => {
    getLineFriendRewardForUserMock.mockResolvedValue({ id: 1 } as any);
    const caller = memberCaller(`line:${LINE_USER_ID}`) as any;
    const result = await caller.claimLineFriendReward({ isLineFriend: true });

    expect(result.status).toBe("already");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(grantLineFriendRewardMock).not.toHaveBeenCalled();
  });

  it("surfaces LINE outages instead of granting", async () => {
    mockLineApis({ botProfileStatus: 500 });
    await expect(memberCaller(`line:${LINE_USER_ID}`).claimLineFriendReward()).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    expect(grantLineFriendRewardMock).not.toHaveBeenCalled();
  });
});

type CapturedResponse = {
  redirectedTo?: string;
  cookies: Record<string, string>;
  statusCode?: number;
};

function createCallbackRequest(cookies: Record<string, string>): Request {
  const cookieHeader = Object.entries({ line_oauth_state: "state-1", ...cookies })
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("; ");
  return {
    query: { code: "code-1", state: "state-1" },
    headers: { cookie: cookieHeader },
    get: () => undefined,
    protocol: "https",
  } as unknown as Request;
}

function createResponse(): Response & { captured: CapturedResponse } {
  const captured: CapturedResponse = { cookies: {} };
  const res = {
    captured,
    cookie: vi.fn((name: string, value: string) => {
      captured.cookies[name] = value;
    }),
    clearCookie: vi.fn(),
    redirect: vi.fn((_status: number, url: string) => {
      captured.redirectedTo = url;
    }),
    status: vi.fn((code: number) => {
      captured.statusCode = code;
      return res;
    }),
    send: vi.fn(),
  };
  return res as unknown as Response & { captured: CapturedResponse };
}

describe("LINE OAuth start", () => {
  it("remembers link mode for the callback", () => {
    const res = createResponse();
    lineOAuthStart(
      { query: { mode: "link", returnTo: "/member" }, headers: {}, get: () => undefined, protocol: "https" } as unknown as Request,
      res
    );
    expect(res.captured.cookies.line_oauth_mode).toBe("link");
    expect(res.captured.redirectedTo).toContain("bot_prompt=aggressive");
  });
});

describe("LINE OAuth callback friend reward", () => {
  const lineUser = { id: 42, openId: `line:${LINE_USER_ID}`, name: "LINE 會員", email: null, role: "user", emailVerified: true };

  beforeEach(() => {
    getUserByOpenIdMock.mockResolvedValue(lineUser as any);
  });

  it("binds LINE to the signed-in email member and grants the reward for a friend", async () => {
    mockLineApis({ friendFlag: true });
    authenticateRequestMock.mockResolvedValue({ id: 42, openId: "email:a@example.com" } as any);
    bindLineToUserMock.mockResolvedValue("bound");
    const res = createResponse();

    await lineOAuthCallback(createCallbackRequest({ line_oauth_mode: "link", line_oauth_return_to: "/member" }), res);

    expect(bindLineToUserMock).toHaveBeenCalledWith({ userId: 42, lineOpenId: `line:${LINE_USER_ID}`, lineEmail: null });
    expect(upsertLineUserAsPrimaryMock).not.toHaveBeenCalled();
    expect(grantLineFriendRewardMock).toHaveBeenCalledWith({ userId: 42, lineUserId: LINE_USER_ID });
    expect(res.captured.cookies.app_session_id).toBe("session-token");
    expect(res.captured.redirectedTo).toBe("/member?line=bound&lineReward=granted");
  });

  it("binds without a reward when the member is not a friend", async () => {
    mockLineApis({ friendFlag: false, botProfileStatus: 404 });
    authenticateRequestMock.mockResolvedValue({ id: 42, openId: "email:a@example.com" } as any);
    bindLineToUserMock.mockResolvedValue("bound");
    const res = createResponse();

    await lineOAuthCallback(createCallbackRequest({ line_oauth_mode: "link" }), res);

    expect(grantLineFriendRewardMock).not.toHaveBeenCalled();
    expect(res.captured.redirectedTo).toBe("/member?line=bound&lineReward=not_friend");
  });

  it("refuses to bind a LINE account owned by another member", async () => {
    mockLineApis({ friendFlag: true });
    authenticateRequestMock.mockResolvedValue({ id: 42, openId: "email:a@example.com" } as any);
    bindLineToUserMock.mockResolvedValue("line_in_use");
    const res = createResponse();

    await lineOAuthCallback(createCallbackRequest({ line_oauth_mode: "link" }), res);

    expect(grantLineFriendRewardMock).not.toHaveBeenCalled();
    expect(res.captured.cookies.app_session_id).toBeUndefined();
    expect(res.captured.redirectedTo).toBe("/member?line=line_in_use");
  });

  it("sends a signed-out link attempt back to login", async () => {
    mockLineApis({ friendFlag: true });
    authenticateRequestMock.mockRejectedValue(new Error("no session"));
    const res = createResponse();

    await lineOAuthCallback(createCallbackRequest({ line_oauth_mode: "link" }), res);

    expect(bindLineToUserMock).not.toHaveBeenCalled();
    expect(res.captured.redirectedTo).toBe("/login?returnTo=%2Fmember");
  });

  it("grants the reward on a normal LINE login for an existing friend", async () => {
    mockLineApis({ friendFlag: true });
    const res = createResponse();

    await lineOAuthCallback(createCallbackRequest({ line_oauth_return_to: "/checkout?step=2" }), res);

    expect(upsertLineUserAsPrimaryMock).toHaveBeenCalled();
    expect(grantLineFriendRewardMock).toHaveBeenCalledTimes(1);
    expect(res.captured.redirectedTo).toBe("/checkout?step=2&lineReward=granted");
  });

  it("does not check friendship again after the reward was claimed", async () => {
    getLineFriendRewardForUserMock.mockResolvedValue({ id: 1 } as any);
    mockLineApis({ friendFlag: true });
    const res = createResponse();

    await lineOAuthCallback(createCallbackRequest({}), res);

    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("friendship"), expect.anything());
    expect(grantLineFriendRewardMock).not.toHaveBeenCalled();
    expect(res.captured.redirectedTo).toBe("/products");
  });

  it("still signs the member in when the reward step fails", async () => {
    mockLineApis({ friendFlag: true });
    grantLineFriendRewardMock.mockRejectedValue(new Error("db down"));
    const res = createResponse();

    await lineOAuthCallback(createCallbackRequest({}), res);

    expect(res.captured.cookies.app_session_id).toBe("session-token");
    expect(res.captured.redirectedTo).toBe("/products");
  });
});
