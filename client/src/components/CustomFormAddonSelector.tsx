import { Check } from "lucide-react";
import {
  CUSTOM_WRIST_SIZE_MAX,
  CUSTOM_WRIST_SIZE_MIN,
  CUSTOM_WRIST_SIZE_STEP,
  isValidCustomWristSize,
} from "@/lib/customOrderingContent";
import ClaspDurabilityNotice from "@/components/ClaspDurabilityNotice";
import CustomFormPendantCharmField from "@/components/CustomFormPendantCharmField";

export type CustomAddonId = "pure" | "tarot" | "chakra" | "numerology";

type TarotGroup =
  | "couple"
  | "love_solo"
  | "basic"
  | "startup"
  | "career"
  | "interview"
  | "dual_path"
  | "friendship"
  | "healing"
  | "past_life_2"
  | "single_q";

const TAROT_TOPIC_CONTENT: Record<string, { desc?: string; items: string[] }> =
  {
    戀愛指南: {
      items: [
        "他對你的想法",
        "你們適合嗎",
        "相處上的建議",
        "未來三個月你和他的感情運勢",
        "如何突破過往在愛情中的盲點",
      ],
    },
    感情復合: {
      items: [
        "他對復合的態度",
        "他對你的想法",
        "未來三個月有機會復合嗎",
        "你需要改善的點",
        "若要復合，你們的阻礙是甚麼",
      ],
    },
    緣來暗戀: {
      items: [
        "他喜歡你嗎",
        "他是我得正緣嗎",
        "他理想中的愛情是怎麼樣的",
        "他現在是否有喜歡的人",
        "是否要展開追求",
      ],
    },
    旺桃花運: {
      items: [
        "未來三個月的感情運勢",
        "如何提升感情運",
        "怎樣的人適合你",
        "你需要改善的點",
        "如何突破過往在愛情中的盲點",
      ],
    },
    財富密碼: {
      items: [
        "求財面對的阻礙",
        "支出風險",
        "有利於增加財富的條件",
        "暗示生活中帶來財富的機遇",
        "影響財運的原因",
      ],
    },
    創業衝衝: {
      items: [
        "現在的你適合創業嗎",
        "創業會成功嗎",
        "創業需注意的事",
        "如何解決困難",
        "創業會對你的生活帶來的影響",
      ],
    },
    職涯探索: {
      items: [
        "你適合什麼工作",
        "如何提升自己的工作能力",
        "你的優勢是什麼",
        "未來三個月的工作運勢",
        "如何獲得他人支持或幫助",
      ],
    },
    面試勝經: {
      items: [
        "內心糾結的問題",
        "眼前的工作機會適合自己嗎",
        "有機率成功嗎",
        "目前的阻礙",
        "這份工作機會最終的結果",
      ],
    },
    進化人生: {
      items: [
        "如何提升自信",
        "你的優勢與缺點",
        "你的人生使命",
        "未來三個月的整體運勢",
        "與他人相處上的建議或提醒",
      ],
    },
    雙向之路: {
      items: [
        "你當前的狀態",
        "選擇A的未來三個月發展",
        "選擇B的未來三個月發展",
        "選擇A的結果",
        "選擇B的結果",
      ],
    },
    友情可貴: {
      items: [
        "他對你的想法",
        "你們之間產生的問題",
        "問題如何解決",
        "對方隱藏的心結",
        "未來三個月的友情運勢",
      ],
    },
    心靈療癒: {
      items: [
        "痛苦真正的根源",
        "這件事帶給生活的影響",
        "如何讓自己平靜",
        "為了療癒自己，你要採取的行動",
        "療癒完能獲得的成長與改變",
      ],
    },
    前世今生1: {
      desc: "每一世，都有需要經歷的課題，你的靈魂造就了現在的你。讓塔羅帶領你探討前世今生的奧妙。",
      items: [
        "為何轉世來到今生",
        "前世的外在印象 / 外表個性特質",
        "前世的內心世界",
        "前世的家庭生活",
        "前世的情感與愛人",
        "前世的職涯方向",
        "今生的課題 / 想得到的一個目標",
      ],
    },
    前世今生2: {
      desc: "你曾覺得和他人莫名的有熟悉感？你們的前世有什麼聯繫…",
      items: [
        "你和他前世的關係",
        "你和他前世如何相遇 / 發生了什麼事",
        "今生你們在這段關係的課題",
        "如何跨過你們今生的課題",
        "神諭卡祝福",
      ],
    },
    前世今生3: {
      desc: "前世的你是誰，住在哪，過著怎麼樣的生活，遇到了什麼事…",
      items: ["以故事的模式闡述前世的一生（約 500–1000 字）"],
    },
    流年運勢1: {
      desc: "以黃道十二宮幫助了解未來一年各個領域的運勢",
      items: [
        "第一宮：整體運勢",
        "第二宮：財運",
        "第三宮：溝通、學習、交通",
        "第四宮：家庭、親情、房產",
        "第五宮：感情、創意、娛樂",
        "第六宮：健康、工作、日常事務",
        "第七宮：人際、合作、婚姻",
        "第八宮：潛意識、轉化、死亡",
        "第九宮：信仰、遠方、旅行",
        "第十宮：事業、社會地位、名聲",
        "第十一宮：友誼、理想、團體",
        "第十二宮：自我犧牲、困境、隱藏",
      ],
    },
    流年運勢2: {
      desc: "未來一年，每個月會遇到的事情、阻礙、建議",
      items: [
        "未來一年 主要會是怎樣的狀態",
        "未來一年 每月會遇到的事與建議",
        "未來一年 神諭卡祝福",
      ],
    },
    流年運勢3: {
      desc: "未來一年，每個季節會遇到的事情、阻礙、建議",
      items: [
        "未來一年主要會是怎樣的狀態",
        "春夏秋冬 每季會遇到的事與建議",
        "神諭卡祝福",
      ],
    },
    守護神: {
      desc: "你的守護神是誰？它想提醒你甚麼…讓能量帶領你與守護神進行連結，帶你認識自己的守護神。",
      items: [
        "我的守護星",
        "我的守護神",
        "守護神的過去與故事",
        "守護神與你之間的連結",
        "守護神想提醒你的事",
        "要如何與守護神有更深刻的感應",
      ],
    },
  };

const TAROT_TOPICS: { label: string; group: TarotGroup }[] = [
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

export const CUSTOM_ADDON_PRODUCT_IDS: Record<CustomAddonId, string> = {
  pure: "custom-deposit-product",
  tarot: "tarot-crystal-deposit-product",
  chakra: "chakra-crystal-deposit-product",
  numerology: "numerology-crystal-deposit-product",
};

export const CUSTOM_ADDON_OPTIONS: {
  id: CustomAddonId;
  label: string;
  description: string;
}[] = [
  {
    id: "pure",
    label: "純客製水晶手鍊",
    description: "依想要的功效、色系與風格，單純為您搭配專屬水晶手鍊。",
  },
  {
    id: "tarot",
    label: "塔羅 × 水晶手鍊",
    description: "先透過塔羅解析需求與能量狀態，再延伸成水晶搭配方向。",
  },
  {
    id: "chakra",
    label: "脈輪檢測 × 水晶手鍊",
    description: "加做七脈輪能量檢測，依檢測結果補足需要加強的能量。",
  },
  {
    id: "numerology",
    label: "生命靈數 × 水晶手鍊",
    description: "以生日與生命靈數分析能量特質，再搭配對應的水晶設計。",
  },
];

type CommonBraceletFields = {
  effect: string;
  wristSize: string;
  fitPreference: "" | "just-right" | "loose";
  metalPreference: "" | "gold" | "silver" | "either";
  silverTube: "" | "yes" | "no";
  beadFrame: "" | "yes" | "no";
  claspType: "" | "lobster" | "magnet" | "elastic";
  pendantCharm: "" | "yes" | "no";
  colorPreference: string;
  specialRequests: string;
  igHandle: string;
};

type PureAddonFields = CommonBraceletFields;
type TarotAddonFields = CommonBraceletFields & {
  topic: string;
  group: TarotGroup | "";
  name: string;
  birthday: string;
  partnerName: string;
  partnerBirthday: string;
  situation: string;
  startupItem: string;
  interviewTarget: string;
  optionA: string;
  optionB: string;
  currentStatus: string;
  reason: string;
  healingContent: string;
  relationship: string;
};
type ProfileAddonFields = CommonBraceletFields & {
  name: string;
  birthday: string;
};

export type CustomAddonSupplementData = {
  pure: PureAddonFields;
  tarot: TarotAddonFields;
  chakra: ProfileAddonFields;
  numerology: ProfileAddonFields;
};

const EMPTY_COMMON_BRACELET_FIELDS: CommonBraceletFields = {
  effect: "",
  wristSize: "",
  fitPreference: "",
  metalPreference: "",
  silverTube: "",
  beadFrame: "",
  claspType: "",
  pendantCharm: "",
  colorPreference: "",
  specialRequests: "",
  igHandle: "",
};

export const EMPTY_CUSTOM_ADDON_SUPPLEMENTS: CustomAddonSupplementData = {
  pure: { ...EMPTY_COMMON_BRACELET_FIELDS },
  tarot: {
    ...EMPTY_COMMON_BRACELET_FIELDS,
    topic: "",
    group: "",
    name: "",
    birthday: "",
    partnerName: "",
    partnerBirthday: "",
    situation: "",
    startupItem: "",
    interviewTarget: "",
    optionA: "",
    optionB: "",
    currentStatus: "",
    reason: "",
    healingContent: "",
    relationship: "",
  },
  chakra: { ...EMPTY_COMMON_BRACELET_FIELDS, name: "", birthday: "" },
  numerology: { ...EMPTY_COMMON_BRACELET_FIELDS, name: "", birthday: "" },
};

interface CustomFormAddonSelectorProps {
  currentAddonId: CustomAddonId;
  selectedAddonIds: CustomAddonId[];
  onChange: (selectedAddonIds: CustomAddonId[]) => void;
  supplements: CustomAddonSupplementData;
  onSupplementsChange: (supplements: CustomAddonSupplementData) => void;
}

export function formatCustomAddonNote(
  selectedAddonIds: CustomAddonId[]
): string {
  const selectedLabels = CUSTOM_ADDON_OPTIONS.filter(option =>
    selectedAddonIds.includes(option.id)
  ).map(option => option.label);

  return [
    "",
    "── 一併選擇其他客製化方案 ──",
    selectedLabels.length > 0 ? selectedLabels.join("、") : "未選擇其他方案",
  ].join("\n");
}

function formatCommonBraceletNote(fields: CommonBraceletFields): string[] {
  return [
    `想額外指定的功效：${fields.effect || "無特別指定"}`,
    `手圍：${fields.wristSize ? `${fields.wristSize} cm` : "（未填）"}`,
    `鬆緊偏好：${fields.fitPreference === "just-right" ? "剛好（有水晶壓痕但不掐肉）" : fields.fitPreference === "loose" ? "微鬆（可輕微滑動）" : "（未填）"}`,
    `金飾 / 銀飾：${fields.metalPreference === "gold" ? "金飾" : fields.metalPreference === "silver" ? "銀飾" : fields.metalPreference === "either" ? "都可以" : "（未填）"}`,
    `加銀管：${fields.silverTube === "yes" ? "要" : fields.silverTube === "no" ? "不要" : "（未填）"}`,
    `珠框：${fields.beadFrame === "yes" ? "要" : fields.beadFrame === "no" ? "不要" : "（未填）"}`,
    `扣具：${fields.claspType === "lobster" ? "龍蝦扣（+200元）" : fields.claspType === "magnet" ? "磁扣（+200元）" : fields.claspType === "elastic" ? "不用，彈力繩就好" : "（未填）"}`,
    `吊飾：${fields.pendantCharm === "yes" ? "要加" : fields.pendantCharm === "no" ? "不要" : "（未填）"}`,
    `特定顏色水晶：${fields.colorPreference || "無特別指定"}`,
    `其餘特殊需求：${fields.specialRequests || "無"}`,
    `Instagram 帳號 / LINE ID：${fields.igHandle || "（未填）"}`,
  ];
}

export function formatCustomAddonSupplementNote(
  addonId: CustomAddonId,
  supplements: CustomAddonSupplementData
): string {
  if (addonId === "pure") {
    return [
      "【純客製水晶手鍊完整表單】",
      "",
      ...formatCommonBraceletNote(supplements.pure),
    ].join("\n");
  }

  if (addonId === "tarot") {
    const tarot = supplements.tarot;
    return [
      "【塔羅 × 水晶手鍊完整表單】",
      "",
      "── 塔羅占卜資料 ──",
      ...formatTarotAddonNote(tarot),
      "",
      "── 水晶手鍊偏好 ──",
      ...formatCommonBraceletNote(tarot),
    ].join("\n");
  }

  if (addonId === "chakra") {
    return [
      "【脈輪檢測 × 水晶手鍊完整表單】",
      "",
      `姓名：${supplements.chakra.name || "（未填）"}`,
      `西元生日：${supplements.chakra.birthday || "（未填）"}`,
      ...formatCommonBraceletNote(supplements.chakra),
    ].join("\n");
  }

  return [
    "【生命靈數 × 水晶手鍊完整表單】",
    "",
    `姓名：${supplements.numerology.name || "（未填）"}`,
    `西元生日：${supplements.numerology.birthday || "（未填）"}`,
    ...formatCommonBraceletNote(supplements.numerology),
  ].join("\n");
}

function formatTarotAddonNote(tarot: TarotAddonFields): string[] {
  const lines = [`占卜主題：${tarot.topic || "（未填）"}`];
  const needsPartner = isPartnerTarotGroup(tarot.group);

  lines.push(
    `${needsPartner ? "自己姓名" : "姓名"}：${tarot.name || "（未填）"}`
  );
  lines.push(
    `${needsPartner ? "自己西元生日" : "西元生日"}：${tarot.birthday || "（未填）"}`
  );

  if (needsPartner) {
    lines.push(`對方姓名：${tarot.partnerName || "（未填）"}`);
    lines.push(`對方西元生日：${tarot.partnerBirthday || "（未填）"}`);
  }
  if (tarot.group === "couple")
    lines.push(`感情概況：${tarot.situation || "（未填）"}`);
  if (tarot.group === "love_solo")
    lines.push(`感情概況：${tarot.situation || "（未填）"}`);
  if (tarot.group === "friendship")
    lines.push(`友情概況：${tarot.situation || "（未填）"}`);
  if (tarot.group === "startup")
    lines.push(`想創業的項目：${tarot.startupItem || "（未填）"}`);
  if (tarot.group === "career")
    lines.push(`工作概況：${tarot.situation || "（未填）"}`);
  if (tarot.group === "interview")
    lines.push(`面試公司及職位：${tarot.interviewTarget || "（未填）"}`);
  if (tarot.group === "dual_path") {
    lines.push(`A 是：${tarot.optionA || "（未填）"}`);
    lines.push(`B 是：${tarot.optionB || "（未填）"}`);
    lines.push(`目前情況：${tarot.currentStatus || "（未填）"}`);
    lines.push(`想占卜的原因：${tarot.reason || "（未填）"}`);
  }
  if (tarot.group === "healing")
    lines.push(`想療癒的內容：${tarot.healingContent || "（未填）"}`);
  if (tarot.group === "past_life_2")
    lines.push(`今生關係：${tarot.relationship || "（未填）"}`);

  return lines;
}

function isPartnerTarotGroup(group: TarotGroup | "") {
  return (
    group === "couple" || group === "friendship" || group === "past_life_2"
  );
}

function validateCommonBraceletFields(
  label: string,
  fields: CommonBraceletFields
): string | null {
  if (!fields.wristSize) return `請填寫${label}手圍尺寸`;
  if (!isValidCustomWristSize(fields.wristSize)) {
    return `${label}手圍尺寸請輸入 13 至 19 cm（以 0.5 cm 為單位）`;
  }
  if (!fields.fitPreference) return `請選擇${label}鬆緊偏好`;
  if (!fields.metalPreference) return `請選擇${label}金飾 / 銀飾偏好`;
  if (!fields.silverTube || !fields.beadFrame)
    return `請選擇${label}銀管和珠框偏好`;
  if (!fields.claspType) return `請選擇${label}扣具`;
  if (!fields.pendantCharm) return `請選擇${label}是否要加吊飾`;
  if (!fields.igHandle.trim())
    return `請填寫${label}IG 帳號；若沒有 IG，請填寫 LINE ID`;
  return null;
}

export function validateCustomAddonSupplements(
  selectedAddonIds: CustomAddonId[],
  supplements: CustomAddonSupplementData
): string | null {
  if (selectedAddonIds.includes("pure")) {
    if (!supplements.pure.effect.trim()) return "請填寫純客製想要的功效";
    const error = validateCommonBraceletFields("純客製", supplements.pure);
    if (error) return error;
  }

  if (selectedAddonIds.includes("tarot")) {
    const tarotError = validateTarotAddonFields(supplements.tarot);
    if (tarotError) return tarotError;
    const error = validateCommonBraceletFields("塔羅方案", supplements.tarot);
    if (error) return error;
  }

  if (selectedAddonIds.includes("chakra")) {
    if (!supplements.chakra.name.trim()) return "請填寫脈輪檢測姓名";
    if (!supplements.chakra.birthday.trim()) return "請填寫脈輪檢測西元生日";
    const error = validateCommonBraceletFields("脈輪檢測", supplements.chakra);
    if (error) return error;
  }

  if (selectedAddonIds.includes("numerology")) {
    if (!supplements.numerology.name.trim()) return "請填寫生命靈數姓名";
    if (!supplements.numerology.birthday.trim())
      return "請填寫生命靈數西元生日";
    const error = validateCommonBraceletFields(
      "生命靈數",
      supplements.numerology
    );
    if (error) return error;
  }

  return null;
}

function validateTarotAddonFields(tarot: TarotAddonFields): string | null {
  if (!tarot.topic.trim() || !tarot.group) return "請選擇塔羅占卜主題";
  if (tarot.group === "single_q") {
    return "單題制（題數制）請直接聯絡官方 LINE 預約";
  }
  if (!tarot.name.trim()) return "請填寫塔羅方案姓名";
  if (!tarot.birthday.trim()) return "請填寫塔羅方案西元生日";
  if (isPartnerTarotGroup(tarot.group)) {
    if (!tarot.partnerName.trim()) return "請填寫塔羅方案對方姓名";
    if (!tarot.partnerBirthday.trim()) return "請填寫塔羅方案對方西元生日";
  }
  if (
    (tarot.group === "couple" ||
      tarot.group === "love_solo" ||
      tarot.group === "friendship" ||
      tarot.group === "career") &&
    !tarot.situation.trim()
  ) {
    return "請填寫塔羅方案概況說明";
  }
  if (tarot.group === "startup" && !tarot.startupItem.trim()) {
    return "請填寫塔羅方案想創業的項目";
  }
  if (tarot.group === "interview" && !tarot.interviewTarget.trim()) {
    return "請填寫塔羅方案面試公司及職位";
  }
  if (tarot.group === "dual_path") {
    if (!tarot.optionA.trim() || !tarot.optionB.trim()) {
      return "請填寫塔羅方案 A 和 B 的選項";
    }
    if (!tarot.currentStatus.trim()) return "請填寫塔羅方案目前情況";
  }
  if (tarot.group === "healing" && !tarot.healingContent.trim()) {
    return "請填寫塔羅方案想療癒的內容";
  }
  if (tarot.group === "past_life_2" && !tarot.relationship.trim()) {
    return "請填寫塔羅方案今生關係";
  }
  return null;
}

export default function CustomFormAddonSelector({
  currentAddonId,
  selectedAddonIds,
  onChange,
  supplements,
  onSupplementsChange,
}: CustomFormAddonSelectorProps) {
  const addonOptions = CUSTOM_ADDON_OPTIONS.filter(
    option => option.id !== currentAddonId
  );
  const selectedOptions = CUSTOM_ADDON_OPTIONS.filter(option =>
    selectedAddonIds.includes(option.id)
  );

  const toggleAddon = (addonId: CustomAddonId) => {
    if (selectedAddonIds.includes(addonId)) {
      onChange(selectedAddonIds.filter(id => id !== addonId));
      return;
    }

    onChange([...selectedAddonIds, addonId]);
  };

  const updateSupplement = <T extends CustomAddonId>(
    addonId: T,
    value: CustomAddonSupplementData[T]
  ) => {
    onSupplementsChange({ ...supplements, [addonId]: value });
  };

  return (
    <section className="bg-white border border-[oklch(0.92_0_0)] rounded-sm p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2
          className="text-lg font-medium text-[oklch(0.1_0_0)]"
          style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
        >
          想一併選擇其他客製化嗎？
        </h2>
        <span className="shrink-0 text-xs font-body text-[oklch(0.65_0_0)]">
          選填
        </span>
      </div>
      <p className="text-sm text-[oklch(0.55_0_0)] mb-5 font-body leading-relaxed">
        可同時搭配其他客製服務，勾選後請直接填寫該方案的完整表單。
      </p>

      <div className="space-y-3">
        {addonOptions.map(option => {
          const checked = selectedAddonIds.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={checked}
              onClick={() => toggleAddon(option.id)}
              className={`w-full rounded-sm border-2 px-4 py-4 text-left transition-colors ${
                checked
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                  : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                    checked
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.1_0_0)] text-white"
                      : "border-[oklch(0.78_0_0)] bg-white"
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-body font-semibold text-[oklch(0.15_0_0)]">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs font-body leading-relaxed text-[oklch(0.5_0_0)]">
                    {option.description}
                  </span>
                  <span className="mt-2 block text-[0.7rem] font-body text-[oklch(0.62_0_0)]">
                    一併安排
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedOptions.length > 0 && (
        <div className="mt-5 rounded-sm border border-[oklch(0.9_0_0)] bg-[oklch(0.98_0_0)] p-4">
          <p className="text-xs font-body text-[oklch(0.45_0_0)]">
            已選擇 {selectedOptions.length} 項其他客製服務，請填寫以下完整表單。
          </p>
          <div className="mt-4 space-y-4">
            {selectedOptions.map(option => (
              <AddonFullForm
                key={option.id}
                addonId={option.id}
                label={option.label}
                value={supplements[option.id]}
                onChange={value => updateSupplement(option.id, value as never)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AddonFullForm<T extends CustomAddonId>({
  addonId,
  label,
  value,
  onChange,
}: {
  addonId: T;
  label: string;
  value: CustomAddonSupplementData[T];
  onChange: (value: CustomAddonSupplementData[T]) => void;
}) {
  const fields = value as CustomAddonSupplementData[CustomAddonId];

  return (
    <div
      data-testid={`custom-addon-full-form-${addonId}`}
      className="rounded-sm border border-[oklch(0.86_0_0)] bg-white p-4"
    >
      <p className="text-sm font-body font-semibold text-[oklch(0.16_0_0)]">
        {label}
      </p>

      {addonId === "tarot" && (
        <div className="mt-3 space-y-3">
          <TarotTopicField
            value={value as TarotAddonFields}
            onChange={next => onChange(next as CustomAddonSupplementData[T])}
          />
          <TarotAddonDataFields
            value={value as TarotAddonFields}
            onChange={next => onChange(next as CustomAddonSupplementData[T])}
          />
        </div>
      )}

      {(addonId === "chakra" || addonId === "numerology") && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField
            label="姓名"
            value={(fields as ProfileAddonFields).name}
            onChange={name =>
              onChange({
                ...(value as ProfileAddonFields),
                name,
              } as CustomAddonSupplementData[T])
            }
            placeholder="請填寫真實姓名"
          />
          <TextField
            label="西元生日"
            value={(fields as ProfileAddonFields).birthday}
            onChange={birthday =>
              onChange({
                ...(value as ProfileAddonFields),
                birthday,
              } as CustomAddonSupplementData[T])
            }
            placeholder="例如：1995/08/22"
          />
        </div>
      )}

      <CommonBraceletForm
        value={fields}
        onChange={next =>
          onChange({ ...value, ...next } as CustomAddonSupplementData[T])
        }
      />
    </div>
  );
}

function CommonBraceletForm({
  value,
  onChange,
}: {
  value: CommonBraceletFields;
  onChange: (value: CommonBraceletFields) => void;
}) {
  return (
    <div className="mt-4 space-y-4 border-t border-[oklch(0.9_0_0)] pt-4">
      <TextAreaField
        label="想要的功效"
        value={value.effect}
        onChange={effect => onChange({ ...value, effect })}
        placeholder="例如：招財、愛情、療癒、保護氣場……"
      />
      <div>
        <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
          手圍尺寸
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={value.wristSize}
            onChange={event =>
              onChange({ ...value, wristSize: event.target.value })
            }
            placeholder="例如：15.5"
            step={CUSTOM_WRIST_SIZE_STEP}
            min={CUSTOM_WRIST_SIZE_MIN}
            max={CUSTOM_WRIST_SIZE_MAX}
            className="w-40 border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
          />
          <span className="text-sm font-body text-[oklch(0.5_0_0)]">cm</span>
        </div>
      </div>
      <OptionButtons
        label="手圍的鬆緊偏好"
        value={value.fitPreference}
        options={[
          { id: "just-right", label: "剛好" },
          { id: "loose", label: "微鬆" },
        ]}
        onChange={fitPreference =>
          onChange({
            ...value,
            fitPreference:
              fitPreference as CommonBraceletFields["fitPreference"],
          })
        }
      />
      <MetalPreferenceField
        value={value.metalPreference}
        onChange={metalPreference => onChange({ ...value, metalPreference })}
      />
      <BeadFrameField
        silverTube={value.silverTube}
        beadFrame={value.beadFrame}
        onSilverTubeChange={silverTube => onChange({ ...value, silverTube })}
        onBeadFrameChange={beadFrame => onChange({ ...value, beadFrame })}
      />
      <ClaspTypeField
        value={value.claspType}
        onChange={claspType => onChange({ ...value, claspType })}
      />
      <div>
        <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">吊飾</p>
        <CustomFormPendantCharmField
          value={value.pendantCharm}
          onChange={pendantCharm => onChange({ ...value, pendantCharm })}
        />
      </div>
      <TextAreaField
        label="想要的水晶顏色"
        value={value.colorPreference}
        onChange={colorPreference => onChange({ ...value, colorPreference })}
        placeholder="例如：偏粉色系、紫色、透明……沒有指定可以留空"
      />
      <TextAreaField
        label="其他特殊需求"
        value={value.specialRequests}
        onChange={specialRequests => onChange({ ...value, specialRequests })}
        placeholder="例如過敏材質、特別風格、紀念意義……"
      />
      <TextField
        label="Instagram 帳號 / LINE ID"
        value={value.igHandle}
        onChange={igHandle => onChange({ ...value, igHandle })}
        placeholder="例如：@your_ig_handle 或 LINE ID"
      />
    </div>
  );
}

function TarotTopicField({
  value,
  onChange,
}: {
  value: TarotAddonFields;
  onChange: (value: TarotAddonFields) => void;
}) {
  const selectedContent = value.topic
    ? TAROT_TOPIC_CONTENT[value.topic]
    : undefined;

  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">
        想占卜哪個主題？
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TAROT_TOPICS.map(topic => {
          const isSelected = value.topic === topic.label;
          const hasContent = Boolean(TAROT_TOPIC_CONTENT[topic.label]);

          return (
            <button
              key={topic.label}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  topic: topic.label,
                  group: topic.group,
                })
              }
              className={`rounded-sm border-2 px-3 py-2.5 text-center text-sm font-body transition-colors ${
                isSelected
                  ? "border-[oklch(0.65_0.12_290)] bg-[oklch(0.97_0_0)] font-semibold text-[oklch(0.1_0_0)]"
                  : topic.group === "single_q"
                    ? "border-[oklch(0.88_0_0)] text-[oklch(0.6_0_0)] hover:border-[oklch(0.6_0_0)]"
                    : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <span className="block">{topic.label}</span>
              {hasContent && !isSelected && (
                <span className="mt-1 block text-[0.6rem] font-normal text-[oklch(0.65_0.12_290)]">
                  點選查看內容 ↓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedContent && (
        <div className="mt-5 rounded-sm border border-[oklch(0.88_0.04_290)] bg-[oklch(0.97_0.01_290)] p-5">
          <p className="mb-3 text-xs font-body font-semibold uppercase tracking-widest text-[oklch(0.55_0.12_290)]">
            {value.topic} ── 占卜內容
          </p>
          {selectedContent.desc && (
            <p className="mb-3 text-sm font-body leading-relaxed text-[oklch(0.4_0_0)]">
              {selectedContent.desc}
            </p>
          )}
          <ul className="space-y-1.5">
            {selectedContent.items.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm font-body text-[oklch(0.25_0_0)]"
              >
                <span className="mt-0.5 shrink-0 text-[oklch(0.65_0.12_290)]">
                  ·
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {value.group === "single_q" && (
        <div className="mt-4 rounded-sm border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-body leading-relaxed text-amber-800">
            單題制（題數制）需要直接聯絡官方小編預約，無法透過此表單下單。
          </p>
        </div>
      )}
    </div>
  );
}

function TarotAddonDataFields({
  value,
  onChange,
}: {
  value: TarotAddonFields;
  onChange: (value: TarotAddonFields) => void;
}) {
  if (!value.group || value.group === "single_q") return null;

  const needsPartner = isPartnerTarotGroup(value.group);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={needsPartner ? "自己的姓名" : "姓名"}
          value={value.name}
          onChange={name => onChange({ ...value, name })}
          placeholder="請填寫真實姓名"
        />
        <TextField
          label={needsPartner ? "自己的西元生日" : "西元生日"}
          value={value.birthday}
          onChange={birthday => onChange({ ...value, birthday })}
          placeholder="例如：1995/08/22"
        />
      </div>

      {needsPartner && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="對方的姓名"
            value={value.partnerName}
            onChange={partnerName => onChange({ ...value, partnerName })}
            placeholder="請填寫對方真實姓名"
          />
          <TextField
            label="對方的西元生日"
            value={value.partnerBirthday}
            onChange={partnerBirthday =>
              onChange({ ...value, partnerBirthday })
            }
            placeholder="例如：1993/03/15"
          />
        </div>
      )}

      {(value.group === "couple" || value.group === "love_solo") && (
        <TextAreaField
          label="感情概況"
          value={value.situation}
          onChange={situation => onChange({ ...value, situation })}
          placeholder="例如：目前的相處狀況、發生什麼事、為什麼想占卜……"
        />
      )}
      {value.group === "friendship" && (
        <TextAreaField
          label="友情概況"
          value={value.situation}
          onChange={situation => onChange({ ...value, situation })}
          placeholder="例如：目前的相處狀況、發生什麼事、為什麼想占卜……"
        />
      )}
      {value.group === "startup" && (
        <TextField
          label="想創業的項目"
          value={value.startupItem}
          onChange={startupItem => onChange({ ...value, startupItem })}
          placeholder="例如：手作飾品、餐飲業……"
        />
      )}
      {value.group === "career" && (
        <TextAreaField
          label="工作概況"
          value={value.situation}
          onChange={situation => onChange({ ...value, situation })}
          placeholder="例如：目前從事什麼工作、工作上有沒有發生什麼事、為什麼想占卜……"
        />
      )}
      {value.group === "interview" && (
        <TextField
          label="面試的公司及職位"
          value={value.interviewTarget}
          onChange={interviewTarget => onChange({ ...value, interviewTarget })}
          placeholder="例如：XX 公司，行銷專員"
        />
      )}
      {value.group === "dual_path" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="A 是什麼？"
              value={value.optionA}
              onChange={optionA => onChange({ ...value, optionA })}
              placeholder="例如：繼續現在的工作"
            />
            <TextField
              label="B 是什麼？"
              value={value.optionB}
              onChange={optionB => onChange({ ...value, optionB })}
              placeholder="例如：轉職到新公司"
            />
          </div>
          <TextAreaField
            label="目前情況"
            value={value.currentStatus}
            onChange={currentStatus => onChange({ ...value, currentStatus })}
            placeholder="描述目前的狀況"
          />
          <TextAreaField
            label="為什麼想占卜？"
            value={value.reason}
            onChange={reason => onChange({ ...value, reason })}
            placeholder="說說您的想法"
          />
        </>
      )}
      {value.group === "healing" && (
        <TextAreaField
          label="內心想療癒的內容"
          value={value.healingContent}
          onChange={healingContent => onChange({ ...value, healingContent })}
          placeholder="說說您想療癒的事情……"
        />
      )}
      {value.group === "past_life_2" && (
        <TextField
          label="今生關係"
          value={value.relationship}
          onChange={relationship => onChange({ ...value, relationship })}
          placeholder="例如：戀人、朋友、同事……"
        />
      )}
    </div>
  );
}

function MetalPreferenceField({
  value,
  onChange,
}: {
  value: CommonBraceletFields["metalPreference"];
  onChange: (value: CommonBraceletFields["metalPreference"]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">
        喜歡金飾還是銀飾
      </p>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "gold" as const, label: "金飾", img: "/golden.jpg" },
            { id: "silver" as const, label: "銀飾", img: "/silver.jpg" },
          ].map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`overflow-hidden rounded-sm border-2 text-left transition-colors ${
                value === option.id
                  ? "border-[oklch(0.1_0_0)]"
                  : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <img
                src={option.img}
                alt={option.label}
                className="h-32 w-full object-cover sm:h-40"
              />
              <p
                className={`py-2.5 text-center text-sm font-body ${
                  value === option.id
                    ? "bg-[oklch(0.97_0_0)] font-semibold"
                    : "text-[oklch(0.45_0_0)]"
                }`}
              >
                {option.label}
              </p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange("either")}
          className={`w-full rounded-sm border-2 px-4 py-3 text-sm font-body transition-colors ${
            value === "either"
              ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
              : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
          }`}
        >
          都可以
        </button>
      </div>
    </div>
  );
}

function BeadFrameField({
  silverTube,
  beadFrame,
  onSilverTubeChange,
  onBeadFrameChange,
}: {
  silverTube: CommonBraceletFields["silverTube"];
  beadFrame: CommonBraceletFields["beadFrame"];
  onSilverTubeChange: (value: CommonBraceletFields["silverTube"]) => void;
  onBeadFrameChange: (value: CommonBraceletFields["beadFrame"]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">
        要加銀管或珠框嗎？
      </p>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <img
            src="/bead-frame-1.jpg"
            alt="珠框銀管參考1"
            className="h-40 w-full rounded-sm object-cover sm:h-56"
          />
          <img
            src="/bead-frame-2.jpg"
            alt="珠框銀管參考2"
            className="h-40 w-full rounded-sm object-cover sm:h-56"
          />
        </div>
        <ChoicePair
          label="銀管"
          description="穿在水晶珠之間的小金屬管，可增加層次感與精緻度"
          value={silverTube}
          onChange={onSilverTubeChange}
        />
        <ChoicePair
          label="珠框"
          description="套在主石外的金屬框，可突顯主石、增加立體感"
          value={beadFrame}
          onChange={onBeadFrameChange}
        />
      </div>
    </div>
  );
}

function ChoicePair({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: "" | "yes" | "no";
  onChange: (value: "yes" | "no") => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-body font-medium text-[oklch(0.15_0_0)]">
        {label}
      </p>
      <p className="mb-3 text-xs font-body leading-relaxed text-[oklch(0.55_0_0)]">
        {description}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "yes" as const, label: "要" },
          { id: "no" as const, label: "不要" },
        ].map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-sm border-2 px-4 py-4 text-base font-body transition-colors ${
              value === option.id
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
                : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClaspTypeField({
  value,
  onChange,
}: {
  value: CommonBraceletFields["claspType"];
  onChange: (value: CommonBraceletFields["claspType"]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">
        要換龍蝦扣或磁扣嗎？
      </p>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: "lobster" as const,
              label: "龍蝦扣",
              sub: "+200元",
              img: "/lobster-clasp.jpg",
            },
            {
              id: "magnet" as const,
              label: "磁扣",
              sub: "+200元",
              img: "/magnet-clasp.png",
            },
            {
              id: "elastic" as const,
              label: "彈力繩",
              sub: "免費",
              img: "/elastic-cord.jpg",
            },
          ].map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`overflow-hidden rounded-sm border-2 text-center transition-colors ${
                value === option.id
                  ? "border-[oklch(0.1_0_0)]"
                  : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <div className="flex aspect-square items-center justify-center bg-[oklch(0.97_0_0)] p-1">
                <img
                  src={option.img}
                  alt={option.label}
                  className="h-full w-full object-contain"
                />
              </div>
              <p
                className={`py-2 text-xs font-body ${
                  value === option.id
                    ? "bg-[oklch(0.97_0_0)] font-semibold"
                    : "text-[oklch(0.45_0_0)]"
                }`}
              >
                {option.label}
                <br />
                <span className="text-[0.6rem] text-[oklch(0.55_0_0)]">
                  （{option.sub}）
                </span>
              </p>
            </button>
          ))}
        </div>
        <ClaspDurabilityNotice />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
        {label}
      </label>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body leading-relaxed focus:border-[oklch(0.4_0_0)] focus:outline-none"
      />
    </div>
  );
}

function OptionButtons({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">{label}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`min-h-10 rounded-sm border-2 px-3 py-2 text-sm font-body transition-colors ${
              value === option.id
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
                : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
