import { beforeEach, describe, expect, it, vi } from "vitest";
import { memberRouter } from "./routers/member";
import * as db from "./db";
import { sendPasswordResetEmail } from "./email";
import { getOrdersForMember } from "./orderDb";

vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserByOpenId: vi.fn(),
  setResetToken: vi.fn(),
}));

vi.mock("./orderDb", () => ({
  getOrdersForMember: vi.fn(),
}));

vi.mock("./email", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

const getUserByEmailMock = vi.mocked(db.getUserByEmail);
const getUserByOpenIdMock = vi.mocked(db.getUserByOpenId);
const sendPasswordResetEmailMock = vi.mocked(sendPasswordResetEmail);
const getOrdersForMemberMock = vi.mocked(getOrdersForMember);

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

  it("ignores an attacker-controlled origin when generating a reset link", async () => {
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

describe("myOrders email matching", () => {
  const baseUser = {
    id: 7,
    openId: "email:victim@example.com",
    email: "victim@example.com",
    name: "Member",
    role: "user",
  };

  function callerFor(user: typeof baseUser & { emailVerified: boolean }) {
    return memberRouter.createCaller({
      user: user as any,
      req: {} as any,
      res: {} as any,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getOrdersForMemberMock.mockResolvedValue([]);
  });

  it("does not match guest orders by an unverified email", async () => {
    const user = { ...baseUser, emailVerified: false };
    getUserByOpenIdMock.mockResolvedValue(user as Awaited<ReturnType<typeof db.getUserByOpenId>>);

    await callerFor(user).myOrders();

    expect(getOrdersForMemberMock).toHaveBeenCalledWith({ userId: 7, email: null });
  });

  it("matches orders by email once the email is verified", async () => {
    const user = { ...baseUser, emailVerified: true };
    getUserByOpenIdMock.mockResolvedValue(user as Awaited<ReturnType<typeof db.getUserByOpenId>>);

    await callerFor(user).myOrders();

    expect(getOrdersForMemberMock).toHaveBeenCalledWith({ userId: 7, email: "victim@example.com" });
  });
});
