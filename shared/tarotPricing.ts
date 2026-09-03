export const TAROT_DEPOSIT_PRODUCT_ID = "tarot-crystal-deposit-product";
export const TAROT_TOPIC_OPTION_PREFIX = "tarot-topic:";

// B 方案商品原價已包含 NT$899 的基本塔羅費用；選擇其他主題時只替換這一段費用。
export const TAROT_BASE_READING_PRICE = 899;

export const TAROT_TOPICS = [
  { id: "love-guide", label: "戀愛指南", originalPrice: 999, price: 899 },
  { id: "reconciliation", label: "感情復合", originalPrice: 999, price: 899 },
  { id: "secret-love", label: "緣來暗戀", originalPrice: 999, price: 899 },
  { id: "romance-luck", label: "旺桃花運", originalPrice: 999, price: 899 },
  { id: "friendship", label: "友情可貴", originalPrice: 999, price: 899 },
  { id: "two-paths", label: "雙向之路", originalPrice: 999, price: 899 },
  { id: "wealth-code", label: "財富密碼", originalPrice: 999, price: 899 },
  { id: "entrepreneurship", label: "創業衝衝", originalPrice: 999, price: 899 },
  { id: "career", label: "職涯探索", originalPrice: 999, price: 899 },
  { id: "interview", label: "面試勝經", originalPrice: 999, price: 899 },
  { id: "evolution", label: "進化人生", originalPrice: 999, price: 899 },
  { id: "healing", label: "心靈療癒", originalPrice: 999, price: 899 },
  { id: "guardian", label: "守護神", originalPrice: 1088, price: 979 },
  { id: "past-life-3", label: "前世今生3", originalPrice: 800, price: 720 },
  { id: "past-life-2", label: "前世今生2", originalPrice: 999, price: 899 },
  { id: "past-life-1", label: "前世今生1", originalPrice: 1288, price: 1159 },
  { id: "annual-fortune-3", label: "流年運勢3", originalPrice: 1088, price: 979 },
  { id: "annual-fortune-1", label: "流年運勢1", originalPrice: 1288, price: 1159 },
  { id: "annual-fortune-2", label: "流年運勢2", originalPrice: 1588, price: 1429 },
] as const;

export type TarotTopic = (typeof TAROT_TOPICS)[number];

export function tarotTopicOptionId(topicId: string) {
  return `${TAROT_TOPIC_OPTION_PREFIX}${topicId}`;
}

export function getTarotTopicByOptionId(optionId?: string | null) {
  if (!optionId?.startsWith(TAROT_TOPIC_OPTION_PREFIX)) return undefined;
  const topicId = optionId.slice(TAROT_TOPIC_OPTION_PREFIX.length);
  return TAROT_TOPICS.find((topic) => topic.id === topicId);
}

export function getTarotTopicByLabel(label?: string | null) {
  if (!label) return undefined;
  const normalized = label.replace(/\s+/g, "");
  return TAROT_TOPICS.find((topic) => topic.label.replace(/\s+/g, "") === normalized);
}

export function getTarotDepositPrice(productBasePrice: number, topic: Pick<TarotTopic, "price">) {
  return productBasePrice - TAROT_BASE_READING_PRICE + topic.price;
}
