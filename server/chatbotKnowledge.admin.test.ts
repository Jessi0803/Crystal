import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./auditDb", () => ({ recordAuditEventSafely: vi.fn() }));
vi.mock("./crystalKnowledge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./crystalKnowledge")>();
  return {
    ...actual,
    embedKnowledgeText: vi.fn(),
    ensureChatbotKnowledgeTable: vi.fn(),
    syncProductKnowledgeById: vi.fn(),
  };
});

import { getDb } from "./db";
import { embedKnowledgeText, syncProductKnowledgeById } from "./crystalKnowledge";
import { deleteFaq, refreshKnowledgeVector, saveFaq, setFaqActive } from "./chatbotKnowledgeAdmin";
import { chatbotRouter } from "./routers/chatbot";
import { buildFaqEmbedText, parseKeywords } from "@shared/chatbotKnowledge";

const getDbMock = vi.mocked(getDb);
const embedMock = vi.mocked(embedKnowledgeText);
const syncMock = vi.mocked(syncProductKnowledgeById);

type Row = Record<string, unknown>;

function fakeDb(rows: Row[]) {
  const calls: { op: string; values?: Row }[] = [];
  const db = {
    calls,
    select: () => {
      const chain: any = {
        from: () => chain,
        where: () => chain,
        orderBy: () => Promise.resolve(rows),
        limit: () => Promise.resolve(rows),
      };
      return chain;
    },
    insert: () => ({
      values: (values: Row) => {
        calls.push({ op: "insert", values });
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (values: Row) => {
        calls.push({ op: "update", values });
        return { where: () => Promise.resolve() };
      },
    }),
    delete: () => {
      calls.push({ op: "delete" });
      return { where: () => Promise.resolve() };
    },
  };
  getDbMock.mockResolvedValue(db as any);
  return db;
}

const faqInput = {
  question: "手鍊斷掉可以修嗎？",
  answer: "三個月內可免費維修一次。",
  keywords: ["維修", "斷掉"],
  category: "常見問題" as const,
  active: true,
};

const existingFaq = {
  id: "faq-warranty",
  sourceType: "faq",
  sourceId: "faq-warranty",
  question: faqInput.question,
  answer: "舊答案",
  embedText: buildFaqEmbedText(faqInput.question, faqInput.keywords),
  keywords: faqInput.keywords,
  category: "常見問題",
  vector: [0.1, 0.2],
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  embedMock.mockResolvedValue([0.3, 0.4]);
});

describe("keyword and embed text helpers", () => {
  it("splits, trims and de-duplicates keywords", () => {
    expect(parseKeywords(" 保固, 維修，保固 、 換線\n壞掉 ")).toEqual(["保固", "維修", "換線", "壞掉"]);
    expect(parseKeywords(["A", "a", " "])).toEqual(["A"]);
  });

  it("builds the embedding text from the question and keywords", () => {
    expect(buildFaqEmbedText(" 手鍊有保固嗎？ ", ["保固", "維修"])).toBe("手鍊有保固嗎？ 保固 維修");
  });
});

describe("saveFaq", () => {
  it("creates a managed FAQ with a fresh vector", async () => {
    const db = fakeDb([]);

    const result = await saveFaq(faqInput);

    expect(result.vectorReady).toBe(true);
    expect(result.id).toMatch(/^faq-/);
    expect(embedMock).toHaveBeenCalledWith("手鍊斷掉可以修嗎？ 維修 斷掉");
    expect(db.calls[0]).toMatchObject({
      op: "insert",
      values: { sourceType: "faq", sourceId: result.id, category: "常見問題", vector: [0.3, 0.4], active: true },
    });
  });

  it("still saves when the vector cannot be generated", async () => {
    const db = fakeDb([]);
    embedMock.mockResolvedValue(null);

    const result = await saveFaq(faqInput);

    expect(result.vectorReady).toBe(false);
    expect(db.calls[0].values).toMatchObject({ vector: null });
  });

  it("keeps the existing vector when only the answer changes", async () => {
    const db = fakeDb([existingFaq]);

    await saveFaq({ ...faqInput, id: "faq-warranty", answer: "新答案" });

    expect(embedMock).not.toHaveBeenCalled();
    expect(db.calls[0]).toMatchObject({ op: "update", values: { answer: "新答案", vector: [0.1, 0.2] } });
  });

  it("regenerates the vector when the question or keywords change", async () => {
    const db = fakeDb([existingFaq]);

    await saveFaq({ ...faqInput, id: "faq-warranty", keywords: ["維修", "換線"] });

    expect(embedMock).toHaveBeenCalledWith("手鍊斷掉可以修嗎？ 維修 換線");
    expect(db.calls[0].values).toMatchObject({ vector: [0.3, 0.4] });
  });

  it("refuses to edit, disable or delete product knowledge", async () => {
    fakeDb([{ ...existingFaq, id: "product-p1", sourceType: "product", sourceId: "p1" }]);

    await expect(saveFaq({ ...faqInput, id: "product-p1" })).rejects.toMatchObject({ code: "READ_ONLY" });
    await expect(setFaqActive("product-p1", false)).rejects.toMatchObject({ code: "READ_ONLY" });
    await expect(deleteFaq("product-p1")).rejects.toMatchObject({ code: "READ_ONLY" });
  });

  it("reports a missing entry", async () => {
    fakeDb([]);
    await expect(saveFaq({ ...faqInput, id: "faq-missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("refreshKnowledgeVector", () => {
  it("re-syncs product knowledge from the product", async () => {
    fakeDb([{ ...existingFaq, id: "product-p1", sourceType: "product", sourceId: "p1" }]);

    await refreshKnowledgeVector("product-p1");

    expect(syncMock).toHaveBeenCalledWith("p1");
    expect(embedMock).not.toHaveBeenCalled();
  });

  it("re-embeds a FAQ", async () => {
    const db = fakeDb([{ ...existingFaq, vector: null }]);

    await refreshKnowledgeVector("faq-warranty");

    expect(embedMock).toHaveBeenCalledWith(existingFaq.embedText);
    expect(db.calls[0]).toMatchObject({ op: "update", values: { vector: [0.3, 0.4] } });
  });
});

describe("chatbot knowledge admin procedures", () => {
  const caller = (user: { id: number; role: string } | null) =>
    chatbotRouter.createCaller({ user: user as any, req: { headers: {} } as any, res: {} as any });
  const admin = caller({ id: 1, role: "admin" });

  it.each([
    ["a guest", null],
    ["a normal member", { id: 2, role: "user" }],
  ])("rejects %s", async (_label, user) => {
    const c = caller(user);
    await expect(c.knowledgeList()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.knowledgeSave(faqInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.knowledgeSetActive({ id: "faq-1", active: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.knowledgeDelete({ id: "faq-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.knowledgeRefreshVector({ id: "faq-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.knowledgeTestSearch({ question: "保固" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each([
    ["an empty question", { question: "  " }],
    ["an empty answer", { answer: "" }],
    ["a too long answer", { answer: "字".repeat(2001) }],
    ["an unknown category", { category: "商品推薦" }],
    ["too many keywords", { keywords: Array.from({ length: 31 }, (_, i) => `k${i}`) }],
    ["a too long keyword", { keywords: ["字".repeat(31)] }],
  ])("rejects %s", async (_label, overrides) => {
    const db = fakeDb([]);
    await expect(admin.knowledgeSave({ ...faqInput, ...overrides } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.calls).toHaveLength(0);
  });

  it("normalizes keywords before saving", async () => {
    const db = fakeDb([]);

    await admin.knowledgeSave({ ...faqInput, keywords: [" 維修 ", "維修", "", "斷掉"] });

    expect(db.calls[0].values).toMatchObject({ keywords: ["維修", "斷掉"] });
  });

  it("returns a readable error for product knowledge edits", async () => {
    fakeDb([{ ...existingFaq, id: "product-p1", sourceType: "product", sourceId: "p1" }]);

    await expect(admin.knowledgeDelete({ id: "product-p1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "商品知識由商品資料自動產生，請到商品管理修改",
    });
  });
});
