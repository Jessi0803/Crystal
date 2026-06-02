import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { getDefaultAllowPreorder } from "./inventoryDb";

const getDbMock = vi.mocked(getDb);

function createQueryChain<T>(result: T) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
}

function createMockDb(isMonthlyLimited: boolean) {
  return {
    select: vi.fn(() => createQueryChain([{ isMonthlyLimited }])),
  };
}

describe("inventory defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows preorder by default for regular products", async () => {
    getDbMock.mockResolvedValue(createMockDb(false) as any);

    await expect(getDefaultAllowPreorder("d004-morning-whisper")).resolves.toBe(true);
  });

  it("disables preorder by default for monthly limited products", async () => {
    getDbMock.mockResolvedValue(createMockDb(true) as any);

    await expect(getDefaultAllowPreorder("prod-1780212635593")).resolves.toBe(false);
  });
});
