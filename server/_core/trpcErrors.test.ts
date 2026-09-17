import { afterEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { z } from "zod";

vi.mock("../auditDb", () => ({ recordAuditEventSafely: vi.fn() }));

import { logTrpcError, PUBLIC_INTERNAL_ERROR_MESSAGE, publicProcedure, router } from "./trpc";

const SQL_MESSAGE =
  "Failed query: select `id`, `email` from `users` where LOWER(TRIM(`users`.`email`)) = ? limit ? params: member@example.com,1";

const testRouter = router({
  dbFailure: publicProcedure.query(() => {
    throw new Error(SQL_MESSAGE, { cause: new Error("Unknown column 'birthYear' in 'field list'") });
  }),
  explicitInternal: publicProcedure.query(() => {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "註冊失敗，請稍後再試" });
  }),
  wrappedInternal: publicProcedure.query(() => {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: new Error(SQL_MESSAGE) });
  }),
  userFacing: publicProcedure.query(() => {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Email 或密碼錯誤" });
  }),
  validated: publicProcedure.input(z.object({ day: z.number().min(1, "生日日期不正確") })).query(() => "ok"),
});

async function call(path: string, input?: unknown) {
  // 路由使用 superjson：輸入包在 json 內，錯誤也放在 error.json
  const query = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const onError = vi.fn(logTrpcError);
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(`http://localhost/api/trpc/${path}${query}`),
    router: testRouter,
    createContext: () => ({ user: null, req: {} as any, res: {} as any }),
    onError,
  });
  const body = (await response.json()) as { error: { json: { message: string; data: { code: string } } } };
  return { status: response.status, error: body.error.json, onError };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tRPC public error messages", () => {
  it("hides SQL and parameters from unexpected server errors but logs them", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, error } = await call("dbFailure");

    expect(status).toBe(500);
    expect(error.message).toBe(PUBLIC_INTERNAL_ERROR_MESSAGE);
    expect(JSON.stringify(error)).not.toContain("member@example.com");
    expect(JSON.stringify(error)).not.toContain("Failed query");
    expect(consoleError).toHaveBeenCalledWith(
      "[tRPC] query dbFailure failed:",
      expect.objectContaining({ message: SQL_MESSAGE })
    );
  });

  it("hides the raw message when a TRPCError only wraps an internal cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { error } = await call("wrappedInternal");
    expect(error.message).toBe(PUBLIC_INTERNAL_ERROR_MESSAGE);
  });

  it("keeps messages written for users", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("explicitInternal")).error.message).toBe("註冊失敗，請稍後再試");
    expect((await call("userFacing")).error).toMatchObject({
      message: "Email 或密碼錯誤",
      data: { code: "UNAUTHORIZED" },
    });
  });

  it("keeps validation messages and does not log them as server errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { error } = await call("validated", { day: 0 });

    expect(error.data.code).toBe("BAD_REQUEST");
    expect(error.message).toContain("生日日期不正確");
    expect(consoleError).not.toHaveBeenCalled();
  });
});
