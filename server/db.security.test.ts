import { describe, expect, it } from "vitest";
import { shouldGrantAdminRole } from "./db";

describe("admin role security regression coverage", () => {
  it("does not grant admin solely because an unverified registration uses an allowlisted email", () => {
    expect(
      shouldGrantAdminRole("email:goodaytarot@gmail.com", "goodaytarot@gmail.com")
    ).toBe(false);
  });

  it("grants an allowlisted email only after it has been verified", () => {
    expect(
      shouldGrantAdminRole("email:goodaytarot@gmail.com", "goodaytarot@gmail.com", true)
    ).toBe(true);
  });
});
