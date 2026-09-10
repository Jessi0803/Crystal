import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { enforceRateLimit, resetRateLimitsForTests } from "./rateLimit";
import { enforceTrustedOrigin, publicServerError, setSecurityHeaders } from "./httpSecurity";

function mockResponse() {
  const headers = new Map<string, string>();
  return {
    headers,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
  };
}

describe("HTTP security controls", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("limits repeated requests from the same client", () => {
    const req = { headers: {}, ip: "203.0.113.8", socket: {} } as any;
    const res = mockResponse() as any;
    enforceRateLimit(req, res, "login", 2, 60_000);
    enforceRateLimit(req, res, "login", 2, 60_000);
    expect(() => enforceRateLimit(req, res, "login", 2, 60_000)).toThrowError(TRPCError);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("rejects a cross-site browser mutation", () => {
    const req = {
      method: "POST",
      protocol: "https",
      get: (name: string) => ({ origin: "https://attacker.example", host: "goodaytarot.com" } as Record<string, string>)[name],
    } as any;
    const res = mockResponse() as any;
    const next = vi.fn();
    enforceTrustedOrigin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a same-origin browser mutation and sets baseline headers", () => {
    const req = {
      method: "POST",
      protocol: "https",
      get: (name: string) => ({ origin: "https://goodaytarot.com", host: "goodaytarot.com" } as Record<string, string>)[name],
    } as any;
    const res = mockResponse() as any;
    const next = vi.fn();
    enforceTrustedOrigin(req, res, next);
    setSecurityHeaders(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("does not expose stack traces outside development", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(publicServerError(new Error("database password leaked in stack"))).toBe("Internal Server Error");
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  });
});
