import { beforeEach, describe, expect, it, vi } from "vitest";
import { memberRouter } from "./routers/member";
import * as db from "./db";
import { sendPasswordResetEmail } from "./email";

vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  setResetToken: vi.fn(),
}));

vi.mock("./email", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

const getUserByEmailMock = vi.mocked(db.getUserByEmail);
const sendPasswordResetEmailMock = vi.mocked(sendPasswordResetEmail);

describe("password reset URL security regression coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserByEmailMock.mockResolvedValue({
      id: 1,
      openId: "email:admin@example.com",
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "bcrypt-hash",
    } as Awaited<ReturnType<typeof db.getUserByEmail>>);
  });

  it.fails("ignores an attacker-controlled origin when generating a reset link", async () => {
    const caller = memberRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    await caller.forgotPassword({
      email: "admin@example.com",
      origin: "https://attacker.example",
    });

    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resetUrl: expect.stringMatching(/^https:\/\/goodaytarot\.com\/reset-password\?token=/),
      })
    );
  });
});
