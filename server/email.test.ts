/**
 * email.test.ts — 驗證 Resend API Key 有效性
 */
import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API Key", () => {
  it("should have RESEND_API_KEY set", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeTruthy();
    expect(key).toMatch(/^re_/);
  });

  it("should be able to connect to Resend API (send-only key)", async () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not set");

    const resend = new Resend(key);
    // 使用 domains.list() 測試 — send-only key 會回傳 403，但不會是 401
    // 這代表 key 本身有效，只是權限受限（這是正常的 send-only key 行為）
    const result = await resend.domains.list();
    // send-only key 回傳 error 但不是 "Invalid API key"
    if (result.error) {
      expect(result.error.message).not.toContain("Invalid API key");
      expect(result.error.message).not.toContain("Unauthorized");
    } else {
      // 如果有完整權限，直接通過
      expect(result.data).toBeDefined();
    }
  }, 10000);
});
