// 椛˙Crystal — 塔羅 × 水晶手鍊報名表單
import { useState } from "react";
import { ChevronRight, ChevronLeft, Check, ExternalLink } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { products } from "@/lib/data";
import { toast } from "sonner";

const LINE_URL = "https://line.me/R/ti/p/@011tymeh";

// ── 塔羅主題定義 ────────────────────────────────────────────────────────────

type TarotGroup =
  | "couple"        // 雙方姓名 + 雙方生日 + 感情概況
  | "love_solo"     // 姓名 + 生日 + 感情概況
  | "basic"         // 姓名 + 生日
  | "startup"       // 姓名 + 生日 + 創業項目
  | "career"        // 姓名 + 生日 + 工作概況
  | "interview"     // 姓名 + 生日 + 面試公司職位
  | "dual_path"     // 姓名 + 生日 + A/B + 目前情況 + 原因
  | "friendship"    // 雙方姓名 + 雙方生日 + 友情概況
  | "healing"       // 姓名 + 生日 + 想療癒的內容
  | "past_life_2"   // 雙方姓名 + 雙方生日 + 今生關係
  | "single_q";     // 單題制 → 導向 LINE

const tarotTopics: { label: string; group: TarotGroup }[] = [
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

// ── Form State ──────────────────────────────────────────────────────────────

interface TarotData {
  topic: string;
  group: TarotGroup | "";
  selfName: string;
  selfBirthday: string;
  partnerName: string;
  partnerBirthday: string;
  situation: string;    // 感情/友情/工作概況
  startupItem: string;
  interviewTarget: string;
  optionA: string;
  optionB: string;
  currentStatus: string;
  reason: string;
  healingContent: string;
  relationship: string; // 今生關係（前世今生2）
}

interface BraceletData {
  effect: string;
  wristSize: string;
  fitPreference: "" | "just-right" | "loose";
  metalPreference: "" | "gold" | "silver" | "either";
  silverTube: "" | "yes" | "no";
  beadFrame: "" | "yes" | "no";
  claspType: "" | "lobster" | "magnet" | "elastic";
  colorPreference: string;
  specialRequests: string;
  igHandle: string;
}

const EMPTY_TAROT: TarotData = {
  topic: "", group: "",
  selfName: "", selfBirthday: "",
  partnerName: "", partnerBirthday: "",
  situation: "", startupItem: "", interviewTarget: "",
  optionA: "", optionB: "", currentStatus: "", reason: "",
  healingContent: "", relationship: "",
};

const EMPTY_BRACELET: BraceletData = {
  effect: "", wristSize: "", fitPreference: "",
  metalPreference: "", silverTube: "", beadFrame: "",
  claspType: "", colorPreference: "", specialRequests: "", igHandle: "",
};

function buildNote(tarot: TarotData, bracelet: BraceletData): string {
  const tarotLines = [
    "【塔羅 × 水晶手鍊諮詢表單】",
    "",
    "── 塔羅占卜資料 ──",
    `占卜主題：${tarot.topic}`,
  ];

  const g = tarot.group;
  if (g === "couple" || g === "friendship" || g === "past_life_2") {
    tarotLines.push(`自己姓名：${tarot.selfName}`);
    tarotLines.push(`自己西元生日：${tarot.selfBirthday}`);
    tarotLines.push(`對方姓名：${tarot.partnerName}`);
    tarotLines.push(`對方西元生日：${tarot.partnerBirthday}`);
    if (g === "couple") tarotLines.push(`感情概況：${tarot.situation}`);
    if (g === "friendship") tarotLines.push(`友情概況：${tarot.situation}`);
    if (g === "past_life_2") tarotLines.push(`今生關係：${tarot.relationship}`);
  } else if (g === "love_solo") {
    tarotLines.push(`姓名：${tarot.selfName}`);
    tarotLines.push(`西元生日：${tarot.selfBirthday}`);
    tarotLines.push(`感情概況：${tarot.situation}`);
  } else if (g === "basic") {
    tarotLines.push(`姓名：${tarot.selfName}`);
    tarotLines.push(`西元生日：${tarot.selfBirthday}`);
  } else if (g === "startup") {
    tarotLines.push(`姓名：${tarot.selfName}`);
    tarotLines.push(`西元生日：${tarot.selfBirthday}`);
    tarotLines.push(`想創業的項目：${tarot.startupItem}`);
  } else if (g === "career") {
    tarotLines.push(`姓名：${tarot.selfName}`);
    tarotLines.push(`西元生日：${tarot.selfBirthday}`);
    tarotLines.push(`工作概況：${tarot.situation}`);
  } else if (g === "interview") {
    tarotLines.push(`姓名：${tarot.selfName}`);
    tarotLines.push(`西元生日：${tarot.selfBirthday}`);
    tarotLines.push(`面試公司及職位：${tarot.interviewTarget}`);
  } else if (g === "dual_path") {
    tarotLines.push(`姓名：${tarot.selfName}`);
    tarotLines.push(`西元生日：${tarot.selfBirthday}`);
    tarotLines.push(`A 是：${tarot.optionA}`);
    tarotLines.push(`B 是：${tarot.optionB}`);
    tarotLines.push(`目前情況：${tarot.currentStatus}`);
    tarotLines.push(`想占卜的原因：${tarot.reason}`);
  } else if (g === "healing") {
    tarotLines.push(`姓名：${tarot.selfName}`);
    tarotLines.push(`西元生日：${tarot.selfBirthday}`);
    tarotLines.push(`想療癒的內容：${tarot.healingContent}`);
  }

  const braceletLines = [
    "",
    "── 水晶手鍊偏好 ──",
    `想額外指定的功效：${bracelet.effect || "無特別指定"}`,
    `手圍：${bracelet.wristSize ? `${bracelet.wristSize} cm` : "（未填）"}`,
    `鬆緊偏好：${bracelet.fitPreference === "just-right" ? "剛好" : bracelet.fitPreference === "loose" ? "微鬆" : "（未填）"}`,
    `金飾 / 銀飾：${bracelet.metalPreference === "gold" ? "金飾" : bracelet.metalPreference === "silver" ? "銀飾" : bracelet.metalPreference === "either" ? "都可以" : "（未填）"}`,
    `加銀管：${bracelet.silverTube === "yes" ? "要" : bracelet.silverTube === "no" ? "不要" : "（未填）"}`,
    `珠框：${bracelet.beadFrame === "yes" ? "要" : bracelet.beadFrame === "no" ? "不要" : "（未填）"}`,
    `扣具：${bracelet.claspType === "lobster" ? "龍蝦扣（+200元）" : bracelet.claspType === "magnet" ? "磁扣（+200元）" : bracelet.claspType === "elastic" ? "不用，彈力繩就好" : "（未填）"}`,
    `特定顏色水晶：${bracelet.colorPreference || "無特別指定"}`,
    `其餘特殊需求：${bracelet.specialRequests || "無"}`,
    `Instagram 帳號：${bracelet.igHandle || "（未提供）"}`,
  ];

  return [...tarotLines, ...braceletLines].join("\n");
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CustomFormB() {
  const [tarot, setTarot] = useState<TarotData>(EMPTY_TAROT);
  const [bracelet, setBracelet] = useState<BraceletData>(EMPTY_BRACELET);
  const [phase, setPhase] = useState<"tarot-topic" | "tarot-data" | "bracelet">("tarot-topic");
  const [braceletStep, setBraceletStep] = useState(0);
  const [, navigate] = useLocation();
  const { addToCart, setIsOpen } = useCart();

  const depositProduct = products.find((p) => p.id === "tarot-crystal-deposit-product");

  // ── 塔羅資料欄位（依主題動態產生）────────────────────────────────────────

  function tarotDataFields() {
    const g = tarot.group as TarotGroup;
    const needsPartner = g === "couple" || g === "friendship" || g === "past_life_2";

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">
            {needsPartner ? "自己的姓名" : "姓名"}
          </label>
          <input
            type="text"
            value={tarot.selfName}
            onChange={(e) => setTarot({ ...tarot, selfName: e.target.value })}
            placeholder="請填寫真實姓名"
            className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
          />
        </div>
        <div>
          <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">
            {needsPartner ? "自己的西元生日" : "西元生日"}
          </label>
          <input
            type="text"
            value={tarot.selfBirthday}
            onChange={(e) => setTarot({ ...tarot, selfBirthday: e.target.value })}
            placeholder="例如：1995/08/22"
            className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
          />
        </div>

        {needsPartner && (
          <>
            <div>
              <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">對方的姓名</label>
              <input
                type="text"
                value={tarot.partnerName}
                onChange={(e) => setTarot({ ...tarot, partnerName: e.target.value })}
                placeholder="請填寫對方真實姓名"
                className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">對方的西元生日</label>
              <input
                type="text"
                value={tarot.partnerBirthday}
                onChange={(e) => setTarot({ ...tarot, partnerBirthday: e.target.value })}
                placeholder="例如：1993/03/15"
                className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
              />
            </div>
          </>
        )}

        {(g === "couple" || g === "love_solo") && (
          <div>
            <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">感情概況</label>
            <textarea
              value={tarot.situation}
              onChange={(e) => setTarot({ ...tarot, situation: e.target.value })}
              placeholder="例如：目前的相處狀況、發生什麼事、為什麼想占卜……"
              rows={4}
              className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none"
            />
          </div>
        )}
        {g === "friendship" && (
          <div>
            <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">友情概況</label>
            <textarea
              value={tarot.situation}
              onChange={(e) => setTarot({ ...tarot, situation: e.target.value })}
              placeholder="例如：目前的相處狀況、發生什麼事、為什麼想占卜……"
              rows={4}
              className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none"
            />
          </div>
        )}
        {g === "startup" && (
          <div>
            <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">想創業的項目</label>
            <input
              type="text"
              value={tarot.startupItem}
              onChange={(e) => setTarot({ ...tarot, startupItem: e.target.value })}
              placeholder="例如：手作飾品、餐飲業……"
              className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
            />
          </div>
        )}
        {g === "career" && (
          <div>
            <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">工作概況</label>
            <textarea
              value={tarot.situation}
              onChange={(e) => setTarot({ ...tarot, situation: e.target.value })}
              placeholder="例如：目前從事什麼工作、工作上有沒有發生什麼事、為什麼想占卜……"
              rows={4}
              className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none"
            />
          </div>
        )}
        {g === "interview" && (
          <div>
            <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">面試的公司及職位</label>
            <input
              type="text"
              value={tarot.interviewTarget}
              onChange={(e) => setTarot({ ...tarot, interviewTarget: e.target.value })}
              placeholder="例如：XX 公司，行銷專員"
              className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
            />
          </div>
        )}
        {g === "dual_path" && (
          <>
            <div>
              <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">A 是什麼？</label>
              <input type="text" value={tarot.optionA} onChange={(e) => setTarot({ ...tarot, optionA: e.target.value })}
                placeholder="例如：繼續現在的工作" className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]" />
            </div>
            <div>
              <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">B 是什麼？</label>
              <input type="text" value={tarot.optionB} onChange={(e) => setTarot({ ...tarot, optionB: e.target.value })}
                placeholder="例如：轉職到新公司" className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]" />
            </div>
            <div>
              <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">目前情況</label>
              <textarea value={tarot.currentStatus} onChange={(e) => setTarot({ ...tarot, currentStatus: e.target.value })}
                placeholder="描述目前的狀況" rows={3} className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none" />
            </div>
            <div>
              <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">為什麼想占卜？</label>
              <textarea value={tarot.reason} onChange={(e) => setTarot({ ...tarot, reason: e.target.value })}
                placeholder="說說您的想法" rows={3} className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none" />
            </div>
          </>
        )}
        {g === "healing" && (
          <div>
            <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">內心想療癒的內容</label>
            <textarea value={tarot.healingContent} onChange={(e) => setTarot({ ...tarot, healingContent: e.target.value })}
              placeholder="說說您想療癒的事情……" rows={4} className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none" />
          </div>
        )}
        {g === "past_life_2" && (
          <div>
            <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">今生關係</label>
            <input type="text" value={tarot.relationship} onChange={(e) => setTarot({ ...tarot, relationship: e.target.value })}
              placeholder="例如：戀人、朋友、同事……" className="w-full border border-[oklch(0.88_0_0)] px-4 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]" />
          </div>
        )}
      </div>
    );
  }

  // ── 手鍊步驟 ─────────────────────────────────────────────────────────────

  const braceletSteps = [
    {
      title: "有想額外指定的功效嗎？",
      subtitle: "例如：招財、愛情、療癒……沒有特別想法也沒關係，留空即可",
      required: false,
      field: (
        <textarea value={bracelet.effect} onChange={(e) => setBracelet({ ...bracelet, effect: e.target.value })}
          placeholder="寫下想要的功效，沒有的話留空" rows={5}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed" />
      ),
    },
    {
      title: "手圍尺寸是多少？",
      subtitle: "請用皮尺量淨手圍（cm），不需要自行加減",
      required: true,
      field: (
        <div className="flex items-center gap-3">
          <input type="number" value={bracelet.wristSize} onChange={(e) => setBracelet({ ...bracelet, wristSize: e.target.value })}
            placeholder="例如：15.5" step="0.5" min="10" max="25"
            className="w-48 border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]" />
          <span className="text-sm font-body text-[oklch(0.5_0_0)]">cm</span>
        </div>
      ),
    },
    {
      title: "手圍的鬆緊偏好？",
      subtitle: "這會影響手鍊的實際製作尺寸",
      required: true,
      field: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: "just-right" as const, label: "剛好", desc: "會有水晶壓痕但不掐肉" },
            { id: "loose" as const, label: "微鬆", desc: "可輕微滑動" },
          ].map((opt) => (
            <button key={opt.id} type="button" onClick={() => setBracelet({ ...bracelet, fitPreference: opt.id })}
              className={`px-5 py-4 text-sm font-body border-2 text-left transition-colors rounded-sm ${bracelet.fitPreference === opt.id ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]" : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"}`}>
              <span className="block font-semibold text-base mb-1">{opt.label}</span>
              <span className="block text-xs leading-relaxed opacity-80">{opt.desc}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "喜歡金飾還是銀飾？",
      subtitle: "這會影響配件（銀管、珠框等）的材質選擇",
      required: true,
      field: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[{ id: "gold" as const, label: "金飾", img: "/golden.jpg" }, { id: "silver" as const, label: "銀飾", img: "/silver.jpg" }].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setBracelet({ ...bracelet, metalPreference: opt.id })}
                className={`border-2 rounded-sm overflow-hidden transition-colors ${bracelet.metalPreference === opt.id ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"}`}>
                <img src={opt.img} alt={opt.label} className="w-full h-40 object-cover" />
                <p className={`text-sm font-body text-center py-2.5 ${bracelet.metalPreference === opt.id ? "bg-[oklch(0.97_0_0)] font-semibold" : "text-[oklch(0.45_0_0)]"}`}>{opt.label}</p>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setBracelet({ ...bracelet, metalPreference: "either" })}
            className={`w-full px-4 py-3 text-sm font-body border-2 transition-colors rounded-sm ${bracelet.metalPreference === "either" ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold" : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"}`}>
            都可以
          </button>
        </div>
      ),
    },
    {
      title: "要加銀管或珠框嗎？",
      subtitle: "可分開選擇，以下附上參考圖片",
      required: true,
      field: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <img src="/bead-frame-1.jpg" alt="珠框銀管參考1" className="w-full h-56 object-cover rounded-sm" />
            <img src="/bead-frame-2.jpg" alt="珠框銀管參考2" className="w-full h-56 object-cover rounded-sm" />
          </div>
          <div>
            <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-1">銀管</p>
            <p className="text-xs font-body text-[oklch(0.55_0_0)] mb-3">穿在水晶珠之間的小金屬管，可增加層次感與精緻度</p>
            <div className="grid grid-cols-2 gap-3">
              {[{ id: "yes" as const, label: "要" }, { id: "no" as const, label: "不要" }].map((opt) => (
                <button key={opt.id} type="button" onClick={() => setBracelet({ ...bracelet, silverTube: opt.id })}
                  className={`px-4 py-4 text-base font-body border-2 transition-colors rounded-sm ${bracelet.silverTube === opt.id ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold" : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-1">珠框</p>
            <p className="text-xs font-body text-[oklch(0.55_0_0)] mb-3">套在主石外的金屬框，可突顯主石、增加立體感</p>
            <div className="grid grid-cols-2 gap-3">
              {[{ id: "yes" as const, label: "要" }, { id: "no" as const, label: "不要" }].map((opt) => (
                <button key={opt.id} type="button" onClick={() => setBracelet({ ...bracelet, beadFrame: opt.id })}
                  className={`px-4 py-4 text-base font-body border-2 transition-colors rounded-sm ${bracelet.beadFrame === opt.id ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold" : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "要換龍蝦扣或磁扣嗎？",
      subtitle: "預設為彈力繩；若更換扣具需額外加收 200 元",
      required: false,
      field: (
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "lobster" as const, label: "龍蝦扣", sub: "+200元", img: "/lobster-clasp.jpg" },
            { id: "magnet" as const, label: "磁扣", sub: "+200元", img: "/magnet-clasp.png" },
            { id: "elastic" as const, label: "彈力繩", sub: "免費", img: "/elastic-cord.jpg" },
          ].map((opt) => (
            <button key={opt.id} type="button" onClick={() => setBracelet({ ...bracelet, claspType: opt.id })}
              className={`border-2 rounded-sm overflow-hidden text-center transition-colors ${bracelet.claspType === opt.id ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"}`}>
              <div className="bg-[oklch(0.97_0_0)] p-1">
                <img src={opt.img} alt={opt.label} className="w-full h-44 object-contain" />
              </div>
              <p className={`text-xs font-body py-2 ${bracelet.claspType === opt.id ? "bg-[oklch(0.97_0_0)] font-semibold" : "text-[oklch(0.45_0_0)]"}`}>
                {opt.label}<br /><span className="text-[0.6rem] text-[oklch(0.55_0_0)]">（{opt.sub}）</span>
              </p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "有想要的水晶顏色嗎？",
      subtitle: "例如：偏粉色系、紫色、透明……沒有指定可以留空",
      required: false,
      field: (
        <textarea value={bracelet.colorPreference} onChange={(e) => setBracelet({ ...bracelet, colorPreference: e.target.value })}
          placeholder="寫下喜歡的顏色或色系，沒有指定可以留空" rows={5}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed" />
      ),
    },
    {
      title: "還有其他特殊需求嗎？",
      subtitle: "例如過敏材質、特別風格、紀念意義……沒有的話留空即可",
      required: false,
      field: (
        <textarea value={bracelet.specialRequests} onChange={(e) => setBracelet({ ...bracelet, specialRequests: e.target.value })}
          placeholder="有任何其他想說的都可以寫在這裡" rows={5}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed" />
      ),
    },
    {
      title: "完成！付完訂金後記得加入 LINE",
      subtitle: "",
      required: false,
      field: (
        <div className="space-y-6">
          <div className="p-5 rounded-sm" style={{ backgroundColor: "oklch(0.97 0.03 145)", border: "1px solid oklch(0.85 0.06 145)" }}>
            <p className="text-sm font-body text-[oklch(0.15_0_0)] leading-relaxed mb-4">
              付完訂金後，請加入官方 LINE 並傳送<br />
              <strong>「訂單編號 ＋ 姓名」</strong>，<br />
              老闆才能將客製化水晶的<strong>成品圖</strong>傳送給您！
            </p>
            <a href="https://line.me/R/ti/p/@011tymeh" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-body text-white rounded-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#06C755" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              加入官方 LINE
            </a>
          </div>
          <div>
            <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">
              Instagram 帳號（選填）
            </label>
            <input type="text" value={bracelet.igHandle}
              onChange={(e) => setBracelet({ ...bracelet, igHandle: e.target.value })}
              placeholder="例如：@your_ig_handle"
              className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]" />
            <p className="mt-1.5 text-xs font-body text-[oklch(0.6_0_0)]">
              若有提供 IG 帳號，老闆也可透過 IG 私訊聯絡您
            </p>
          </div>
        </div>
      ),
    },
  ];

  // ── 進度顯示 ──────────────────────────────────────────────────────────────

  const totalSteps = 2 + braceletSteps.length; // 選主題 + 塔羅資料 + 8 手鍊步驟
  const currentStepNum =
    phase === "tarot-topic" ? 1
    : phase === "tarot-data" ? 2
    : 2 + braceletStep + 1;

  // ── 驗證 ──────────────────────────────────────────────────────────────────

  function validateTarotData(): boolean {
    const g = tarot.group as TarotGroup;
    if (!tarot.selfName.trim()) { toast.error("請填寫姓名"); return false; }
    if (!tarot.selfBirthday.trim()) { toast.error("請填寫西元生日"); return false; }
    const needsPartner = g === "couple" || g === "friendship" || g === "past_life_2";
    if (needsPartner) {
      if (!tarot.partnerName.trim()) { toast.error("請填寫對方姓名"); return false; }
      if (!tarot.partnerBirthday.trim()) { toast.error("請填寫對方西元生日"); return false; }
    }
    if ((g === "couple" || g === "love_solo" || g === "friendship" || g === "career") && !tarot.situation.trim()) {
      toast.error("請填寫概況說明"); return false;
    }
    if (g === "startup" && !tarot.startupItem.trim()) { toast.error("請填寫想創業的項目"); return false; }
    if (g === "interview" && !tarot.interviewTarget.trim()) { toast.error("請填寫面試公司及職位"); return false; }
    if (g === "dual_path") {
      if (!tarot.optionA.trim() || !tarot.optionB.trim()) { toast.error("請填寫 A 和 B 的選項"); return false; }
      if (!tarot.currentStatus.trim()) { toast.error("請填寫目前情況"); return false; }
    }
    if (g === "healing" && !tarot.healingContent.trim()) { toast.error("請填寫想療癒的內容"); return false; }
    if (g === "past_life_2" && !tarot.relationship.trim()) { toast.error("請填寫今生關係"); return false; }
    return true;
  }

  function validateBraceletStep(): boolean {
    if (braceletStep === 1 && !bracelet.wristSize) { toast.error("請填寫手圍尺寸"); return false; }
    if (braceletStep === 2 && !bracelet.fitPreference) { toast.error("請選擇鬆緊偏好"); return false; }
    if (braceletStep === 3 && !bracelet.metalPreference) { toast.error("請選擇金飾 / 銀飾偏好"); return false; }
    if (braceletStep === 4 && (!bracelet.silverTube || !bracelet.beadFrame)) { toast.error("請選擇銀管和珠框的偏好"); return false; }
    return true;
  }

  // ── 送出 ──────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!depositProduct) { toast.error("找不到訂金商品，請聯繫客服"); return; }
    sessionStorage.setItem("customConsultationNote", buildNote(tarot, bracelet));
    addToCart(depositProduct);
    setIsOpen(false);
    navigate("/checkout");
    toast.success("諮詢內容已儲存，請完成結帳以預約訂金");
  }

  // ── 上一步 ────────────────────────────────────────────────────────────────

  function handleBack() {
    if (phase === "tarot-topic") { navigate("/custom"); return; }
    if (phase === "tarot-data") { setPhase("tarot-topic"); return; }
    if (phase === "bracelet" && braceletStep === 0) { setPhase("tarot-data"); return; }
    setBraceletStep((s) => s - 1);
  }

  // ── 下一步 ────────────────────────────────────────────────────────────────

  function handleNext() {
    if (phase === "tarot-topic") {
      if (!tarot.topic) { toast.error("請選擇占卜主題"); return; }
      if (tarot.group === "single_q") return; // 單題制不繼續
      setPhase("tarot-data");
      return;
    }
    if (phase === "tarot-data") {
      if (!validateTarotData()) return;
      setPhase("bracelet");
      setBraceletStep(0);
      return;
    }
    if (phase === "bracelet") {
      if (!validateBraceletStep()) return;
      if (braceletStep === braceletSteps.length - 1) {
        handleSubmit();
      } else {
        setBraceletStep((s) => s + 1);
      }
    }
  }

  const isLastStep = phase === "bracelet" && braceletStep === braceletSteps.length - 1;
  const currentStep = phase === "bracelet" ? braceletSteps[braceletStep] : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_240)] page-enter">
      {/* Header */}
      <div className="border-b border-[oklch(0.93_0_0)] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/custom">
            <button className="flex items-center gap-1.5 text-sm font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.2_0_0)] transition-colors">
              <ChevronLeft className="w-4 h-4" />
              返回
            </button>
          </Link>
          <div>
            <p className="text-[0.6rem] tracking-[0.2em] text-[oklch(0.55_0_0)] uppercase">塔羅 × 水晶手鍊</p>
            <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">報名表單</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < currentStepNum ? "bg-[oklch(0.65_0.12_290)]" : "bg-[oklch(0.88_0_0)]"}`} />
            ))}
          </div>
          <p className="text-xs font-body text-[oklch(0.55_0_0)]">
            步驟 {currentStepNum} / {totalSteps}
            {currentStep && !currentStep.required && <span className="ml-2 text-[oklch(0.65_0_0)]">（選填）</span>}
          </p>
        </div>

        {/* ── Phase: 塔羅主題選擇 ── */}
        {phase === "tarot-topic" && (
          <div className="bg-white border border-[oklch(0.92_0_0)] rounded-sm p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-medium text-[oklch(0.1_0_0)] mb-2" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              想占卜哪個主題？
            </h2>
            <p className="text-sm text-[oklch(0.55_0_0)] mb-6 font-body leading-relaxed">
              選擇後我們會請您填入對應的資料，如需搭配多個題組，完成後可再次填寫（搭配手鍊的題組享 9 折優惠）
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tarotTopics.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTarot({ ...EMPTY_TAROT, topic: t.label, group: t.group })}
                  className={`px-3 py-2.5 text-sm font-body border-2 transition-colors rounded-sm text-center ${
                    tarot.topic === t.label
                      ? "border-[oklch(0.65_0.12_290)] bg-[oklch(0.97_0_0)] font-semibold text-[oklch(0.1_0_0)]"
                      : t.group === "single_q"
                      ? "border-[oklch(0.88_0_0)] text-[oklch(0.6_0_0)] hover:border-[oklch(0.6_0_0)]"
                      : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 單題制提示 */}
            {tarot.group === "single_q" && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-sm">
                <p className="text-sm font-body text-amber-800 mb-3">
                  單題制（題數制）需要直接聯絡官方小編預約，無法透過此表單下單，謝謝！
                </p>
                <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-body text-white transition-opacity hover:opacity-90 rounded-sm"
                  style={{ backgroundColor: "#06C755" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  聯繫 LINE 客服
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Phase: 塔羅資料填寫 ── */}
        {phase === "tarot-data" && (
          <div className="bg-white border border-[oklch(0.92_0_0)] rounded-sm p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-medium text-[oklch(0.1_0_0)] mb-1" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              {tarot.topic} — 占卜所需資料
            </h2>
            <p className="text-sm text-[oklch(0.55_0_0)] mb-6 font-body">請填寫以下資料，讓老闆為您進行解析</p>
            {tarotDataFields()}
          </div>
        )}

        {/* ── Phase: 手鍊偏好 ── */}
        {phase === "bracelet" && currentStep && (
          <div className="bg-white border border-[oklch(0.92_0_0)] rounded-sm p-6 sm:p-8 mb-6">
            <p className="text-[0.6rem] tracking-[0.2em] text-[oklch(0.55_0_0)] uppercase mb-2">水晶手鍊偏好</p>
            <h2 className="text-xl font-medium text-[oklch(0.1_0_0)] mb-2" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              {currentStep.title}
            </h2>
            <p className="text-sm text-[oklch(0.55_0_0)] mb-6 font-body leading-relaxed">{currentStep.subtitle}</p>
            {currentStep.field}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.2_0_0)] border border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)] transition-colors rounded-sm">
            <ChevronLeft className="w-4 h-4" />
            {phase === "tarot-topic" ? "返回方案頁" : "上一步"}
          </button>

          {tarot.group !== "single_q" && (
            isLastStep ? (
              <button type="button" onClick={handleNext}
                className="flex items-center gap-2 px-8 py-2.5 text-sm font-body text-white transition-opacity hover:opacity-90 rounded-sm"
                style={{ backgroundColor: "oklch(0.65 0.12 290)" }}>
                <Check className="w-4 h-4" />
                確認，前往下訂金
              </button>
            ) : (
              <button type="button" onClick={handleNext}
                className="flex items-center gap-2 px-8 py-2.5 text-sm font-body text-white transition-opacity hover:opacity-90 rounded-sm"
                style={{ backgroundColor: "oklch(0.65 0.12 290)" }}>
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
