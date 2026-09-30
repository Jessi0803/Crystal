/**
 * 塔羅方案「占卜前需提供」的資料來源。
 *
 * 同一份資料有兩個用途，必須一致：
 * 1. 客製表單（CustomFormB）依 group 決定要問客人哪些欄位
 * 2. 商品詳細頁提前告訴客人要準備什麼
 *
 * 兩邊都從這裡讀。表單要加減欄位時，記得同步改 TAROT_GROUP_REQUIREMENTS，
 * 否則商品頁會對客人做出錯誤的承諾。
 */

export type TarotGroup =
  | "couple" // 雙方姓名 + 雙方生日 + 感情概況
  | "love_solo" // 姓名 + 生日 + 感情概況
  | "basic" // 姓名 + 生日
  | "startup" // 姓名 + 生日 + 創業項目
  | "career" // 姓名 + 生日 + 工作概況
  | "interview" // 姓名 + 生日 + 面試公司職位
  | "dual_path" // 姓名 + 生日 + A/B + 目前情況 + 原因
  | "friendship" // 雙方姓名 + 雙方生日 + 友情概況
  | "healing" // 姓名 + 生日 + 想療癒的內容
  | "past_life_2" // 雙方姓名 + 雙方生日 + 今生關係
  | "single_q"; // 單題制 → 導向官方 LINE

/** 主題名稱 → 欄位組合。順序即為畫面上的呈現順序。 */
export const TAROT_TOPIC_GROUPS: { label: string; group: TarotGroup }[] = [
  { label: "戀愛指南", group: "couple" },
  { label: "感情復合", group: "couple" },
  { label: "緣來暗戀", group: "couple" },
  { label: "旺桃花運", group: "love_solo" },
  { label: "財富密碼", group: "basic" },
  { label: "進化人生", group: "basic" },
  { label: "前世今生1", group: "basic" },
  { label: "前世今生3", group: "basic" },
  { label: "流年運勢1", group: "basic" },
  { label: "流年運勢2", group: "basic" },
  { label: "流年運勢3", group: "basic" },
  { label: "守護神", group: "basic" },
  { label: "創業衝衝", group: "startup" },
  { label: "職涯探索", group: "career" },
  { label: "面試勝經", group: "interview" },
  { label: "雙向之路", group: "dual_path" },
  { label: "友情可貴", group: "friendship" },
  { label: "心靈療癒", group: "healing" },
  { label: "前世今生2", group: "past_life_2" },
  { label: "單題制（題數制）", group: "single_q" },
];

/** 每個組合占卜前需要提供的資訊；note 用於沒有固定欄位的情況 */
export const TAROT_GROUP_REQUIREMENTS: Record<
  TarotGroup,
  { requirements: string[]; note?: string }
> = {
  couple: { requirements: ["雙方姓名", "雙方西元生日", "感情概況"] },
  love_solo: { requirements: ["姓名", "西元生日", "感情概況"] },
  basic: { requirements: ["姓名", "西元生日"] },
  startup: { requirements: ["姓名", "西元生日", "想創業的項目"] },
  career: { requirements: ["姓名", "西元生日", "工作概況"] },
  interview: { requirements: ["姓名", "西元生日", "面試公司及職位"] },
  dual_path: {
    requirements: ["姓名", "西元生日", "A／B 選項", "目前情況與占卜原因"],
  },
  friendship: { requirements: ["雙方姓名", "雙方西元生日", "友情概況"] },
  healing: { requirements: ["姓名", "西元生日", "想療癒的內容"] },
  past_life_2: { requirements: ["雙方姓名", "雙方西元生日", "今生關係"] },
  single_q: {
    requirements: [],
    note: "需求依題目而定，請透過官方 LINE 與店家確認",
  },
};

export function getTarotGroupByLabel(label: string | null | undefined) {
  if (!label) return undefined;
  return TAROT_TOPIC_GROUPS.find((topic) => topic.label === label)?.group;
}

export type TarotRequirementRow = {
  group: TarotGroup;
  /** 共用同一組欄位的所有主題 */
  topics: string[];
  requirements: string[];
  note?: string;
};

/**
 * 依組合整理成畫面用的列表：共用同一組欄位的主題會合併成一列，
 * 所以 20 個主題只會呈現 11 列。
 */
export function getTarotRequirementRows(): TarotRequirementRow[] {
  const rows: TarotRequirementRow[] = [];
  const indexByGroup = new Map<TarotGroup, number>();

  for (const { label, group } of TAROT_TOPIC_GROUPS) {
    const existing = indexByGroup.get(group);
    if (existing != null) {
      rows[existing].topics.push(label);
      continue;
    }
    indexByGroup.set(group, rows.length);
    rows.push({ group, topics: [label], ...TAROT_GROUP_REQUIREMENTS[group] });
  }

  return rows;
}
