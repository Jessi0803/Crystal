import { describe, expect, it } from "vitest";
import {
  getTarotDepositPrice,
  getTarotTopicByOptionId,
  tarotTopicOptionId,
} from "@shared/tarotPricing";

describe("tarot deposit pricing", () => {
  it.each([
    ["love-guide", 1399],
    ["past-life-3", 1220],
    ["past-life-1", 1659],
    ["annual-fortune-3", 1479],
    ["annual-fortune-1", 1659],
    ["annual-fortune-2", 1929],
    ["guardian", 1479],
  ])("calculates %s from the B-plan base price", (topicId, expected) => {
    const topic = getTarotTopicByOptionId(tarotTopicOptionId(topicId));
    expect(topic).toBeDefined();
    expect(getTarotDepositPrice(1399, topic!)).toBe(expected);
  });

  it("rejects unrelated purchase option ids", () => {
    expect(getTarotTopicByOptionId("standard-option")).toBeUndefined();
  });
});
