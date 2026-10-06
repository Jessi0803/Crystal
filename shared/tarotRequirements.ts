/**
 * 塔羅方案「占卜前需提供」與「表單要問哪些欄位」的單一來源。
 *
 * 同一份知識原本散在四個地方，靠註解提醒彼此同步：
 *   1. 商品頁提前告訴客人要準備什麼（TAROT_GROUP_REQUIREMENTS）
 *   2. CustomFormB 依 group 渲染欄位
 *   3. CustomFormB 依 group 驗證必填
 *   4. CustomFormB 依 group 把答案寫進訂單備註
 *
 * 現在 2～4 都從 TAROT_GROUP_SPEC[group].fields 衍生，而 1 的顯示文字就放在
 * 同一個物件裡（requirements）。加減欄位時兩者在同一個畫面上，漏改很難發生，
 * 而 server/tarotRequirements.test.ts 會再擋一次。
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
  | "single_q"; // 單題制 → 導向官方 LINE，表單不收單

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

/** 表單上塔羅前置欄位的 key，對應 CustomFormB 的 TarotData */
export type TarotFieldKey =
  | "selfName"
  | "selfBirthday"
  | "partnerName"
  | "partnerBirthday"
  | "situation"
  | "startupItem"
  | "interviewTarget"
  | "optionA"
  | "optionB"
  | "currentStatus"
  | "reason"
  | "healingContent"
  | "relationship";

export type TarotField = {
  key: TarotFieldKey;
  /** 表單上的欄位標題 */
  label: string;
  /** 寫進訂單備註時的前綴；省略時沿用 label */
  noteLabel?: string;
  placeholder: string;
  /** 多行輸入的列數；省略即單行 input */
  rows?: number;
  /** 未填時的錯誤訊息；省略即非必填 */
  errorMessage?: string;
};

export type TarotGroupSpec = {
  /**
   * 商品頁「占卜前需提供」的顯示文字。
   * 刻意比 fields 粗（「雙方姓名」一句涵蓋 selfName + partnerName），
   * 因為客人只需要知道要準備什麼，不需要看到欄位結構。
   */
  requirements: string[];
  /** 沒有固定欄位時的說明 */
  note?: string;
  /** 表單實際要問的欄位，順序即畫面順序 */
  fields: TarotField[];
};

// ── 欄位組件 ────────────────────────────────────────────────────────────────

const SOLO_IDENTITY: TarotField[] = [
  { key: "selfName", label: "姓名", placeholder: "請填寫真實姓名", errorMessage: "請填寫姓名" },
  {
    key: "selfBirthday",
    label: "西元生日",
    placeholder: "例如：1995/08/22",
    errorMessage: "請填寫西元生日",
  },
];

/** 需要對方資料的主題：自己的欄位要加「自己的」前綴，避免兩組姓名混淆 */
const PAIR_IDENTITY: TarotField[] = [
  {
    key: "selfName",
    label: "自己的姓名",
    noteLabel: "自己姓名",
    placeholder: "請填寫真實姓名",
    errorMessage: "請填寫姓名",
  },
  {
    key: "selfBirthday",
    label: "自己的西元生日",
    noteLabel: "自己西元生日",
    placeholder: "例如：1995/08/22",
    errorMessage: "請填寫西元生日",
  },
  {
    key: "partnerName",
    label: "對方的姓名",
    noteLabel: "對方姓名",
    placeholder: "請填寫對方真實姓名",
    errorMessage: "請填寫對方姓名",
  },
  {
    key: "partnerBirthday",
    label: "對方的西元生日",
    noteLabel: "對方西元生日",
    placeholder: "例如：1993/03/15",
    errorMessage: "請填寫對方西元生日",
  },
];

/** 三種「概況」共用 situation 欄位，只有標題與範例不同 */
function situationField(label: string, placeholder: string): TarotField {
  return { key: "situation", label, placeholder, rows: 4, errorMessage: "請填寫概況說明" };
}

const RELATIONSHIP_SITUATION = situationField(
  "感情概況",
  "例如：目前的相處狀況、發生什麼事、為什麼想占卜……"
);
const FRIENDSHIP_SITUATION = situationField(
  "友情概況",
  "例如：目前的相處狀況、發生什麼事、為什麼想占卜……"
);
const CAREER_SITUATION = situationField(
  "工作概況",
  "例如：目前從事什麼工作、工作上有沒有發生什麼事、為什麼想占卜……"
);

// ── 組合定義 ────────────────────────────────────────────────────────────────

export const TAROT_GROUP_SPEC: Record<TarotGroup, TarotGroupSpec> = {
  couple: {
    requirements: ["雙方姓名", "雙方西元生日", "感情概況"],
    fields: [...PAIR_IDENTITY, RELATIONSHIP_SITUATION],
  },
  love_solo: {
    requirements: ["姓名", "西元生日", "感情概況"],
    fields: [...SOLO_IDENTITY, RELATIONSHIP_SITUATION],
  },
  basic: {
    requirements: ["姓名", "西元生日"],
    fields: SOLO_IDENTITY,
  },
  startup: {
    requirements: ["姓名", "西元生日", "想創業的項目"],
    fields: [
      ...SOLO_IDENTITY,
      {
        key: "startupItem",
        label: "想創業的項目",
        placeholder: "例如：手作飾品、餐飲業……",
        errorMessage: "請填寫想創業的項目",
      },
    ],
  },
  career: {
    requirements: ["姓名", "西元生日", "工作概況"],
    fields: [...SOLO_IDENTITY, CAREER_SITUATION],
  },
  interview: {
    requirements: ["姓名", "西元生日", "面試公司及職位"],
    fields: [
      ...SOLO_IDENTITY,
      {
        key: "interviewTarget",
        label: "面試的公司及職位",
        noteLabel: "面試公司及職位",
        placeholder: "例如：XX 公司，行銷專員",
        errorMessage: "請填寫面試公司及職位",
      },
    ],
  },
  dual_path: {
    requirements: ["姓名", "西元生日", "A／B 選項", "目前情況與占卜原因"],
    fields: [
      ...SOLO_IDENTITY,
      {
        key: "optionA",
        label: "A 是什麼？",
        noteLabel: "A 是",
        placeholder: "例如：繼續現在的工作",
        errorMessage: "請填寫 A 和 B 的選項",
      },
      {
        key: "optionB",
        label: "B 是什麼？",
        noteLabel: "B 是",
        placeholder: "例如：轉職到新公司",
        errorMessage: "請填寫 A 和 B 的選項",
      },
      {
        key: "currentStatus",
        label: "目前情況",
        placeholder: "描述目前的狀況",
        rows: 3,
        errorMessage: "請填寫目前情況",
      },
      {
        key: "reason",
        label: "為什麼想占卜？",
        noteLabel: "想占卜的原因",
        placeholder: "說說您的想法",
        rows: 3,
        errorMessage: "請填寫想占卜的原因",
      },
    ],
  },
  friendship: {
    requirements: ["雙方姓名", "雙方西元生日", "友情概況"],
    fields: [...PAIR_IDENTITY, FRIENDSHIP_SITUATION],
  },
  healing: {
    requirements: ["姓名", "西元生日", "想療癒的內容"],
    fields: [
      ...SOLO_IDENTITY,
      {
        key: "healingContent",
        label: "內心想療癒的內容",
        noteLabel: "想療癒的內容",
        placeholder: "說說您想療癒的事情……",
        rows: 4,
        errorMessage: "請填寫想療癒的內容",
      },
    ],
  },
  past_life_2: {
    requirements: ["雙方姓名", "雙方西元生日", "今生關係"],
    fields: [
      ...PAIR_IDENTITY,
      {
        key: "relationship",
        label: "今生關係",
        placeholder: "例如：戀人、朋友、同事……",
        errorMessage: "請填寫今生關係",
      },
    ],
  },
  single_q: {
    requirements: [],
    note: "需求依題目而定，請透過官方 LINE 與店家確認",
    // 單題制不透過表單收單，CustomFormB 會擋在送出之前
    fields: [],
  },
};

/**
 * 商品頁「占卜前需提供」用的檢視。
 * 由 TAROT_GROUP_SPEC 衍生，所以不會和表單欄位脫鉤。
 */
export const TAROT_GROUP_REQUIREMENTS: Record<
  TarotGroup,
  { requirements: string[]; note?: string }
> = Object.fromEntries(
  Object.entries(TAROT_GROUP_SPEC).map(([group, spec]) => [
    group,
    spec.note ? { requirements: spec.requirements, note: spec.note } : { requirements: spec.requirements },
  ])
) as Record<TarotGroup, { requirements: string[]; note?: string }>;

/** 表單要渲染／驗證／寫進備註的欄位。group 還沒決定時回空陣列。 */
export function getTarotGroupFields(group: TarotGroup | "" | null | undefined): TarotField[] {
  if (!group) return [];
  return TAROT_GROUP_SPEC[group].fields;
}

/**
 * 商品頁與表單的主題名稱空白寫法不一致（「前世今生 1」vs「前世今生1」），
 * 比對前先去除空白，與 tarotPricing 的 getTarotTopicByLabel 同一套規則。
 */
export function getTarotGroupByLabel(label: string | null | undefined) {
  if (!label) return undefined;
  const normalized = label.replace(/\s+/g, "");
  return TAROT_TOPIC_GROUPS.find(
    (topic) => topic.label.replace(/\s+/g, "") === normalized
  )?.group;
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
