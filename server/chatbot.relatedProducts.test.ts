import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { loadRelatedProducts } from "./routers/chatbot";

const getDbMock = vi.mocked(getDb);

function createQueryChain<T>(result: T) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve(result).catch(reject),
    finally: (handler: () => unknown) => Promise.resolve(result).finally(handler),
  };
  return chain;
}

describe("loadRelatedProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active products from the database for chatbot product cards", async () => {
    getDbMock.mockResolvedValue({
      select: vi.fn(() =>
        createQueryChain([
          {
            id: "prod-1780213199030",
            name: "盛光流年",
            subtitle: "",
            price: 1512,
            image: "/uploads/sheng-guang.jpg",
          },
        ])
      ),
    } as any);

    await expect(loadRelatedProducts(["prod-1780213199030"])).resolves.toEqual([
      {
        id: "prod-1780213199030",
        name: "盛光流年",
        subtitle: "",
        price: 1512,
        image: "/uploads/sheng-guang.jpg",
      },
    ]);
  });

  it("falls back to the static catalog when the database is unavailable", async () => {
    getDbMock.mockResolvedValue(null);

    await expect(loadRelatedProducts(["d001-moon-secret"])).resolves.toEqual([
      expect.objectContaining({
        id: "d001-moon-secret",
        name: "月下密語手鍊",
      }),
    ]);
  });
});
