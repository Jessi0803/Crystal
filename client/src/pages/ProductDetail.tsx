// 日日好日 — Product Detail Page
// Design: Vacanza-inspired — large image + clean product info
import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { products } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  CUSTOM_BRACELET_NOTICES,
  CUSTOM_LINE_URL,
  isCustomDepositProduct,
} from "@/lib/customOrderingContent";
import { IN_STOCK_FULFILLMENT_NOTE, PREORDER_FULFILLMENT_NOTE } from "@shared/fulfillment";

const tarotReadingCategories = [
  {
    id: "love",
    label: "感情關係",
    items: [
      { name: "戀愛指南", originalPrice: 999, discountedPrice: 899, details: ["他對你的想法", "你們適合嗎", "相處上的建議", "未來三個月你和他的感情運勢", "如何突破過往在愛情中的盲點"] },
      { name: "感情復合", originalPrice: 999, discountedPrice: 899, details: ["他對復合的態度", "他對你的想法", "未來三個月有機會復合嗎", "你需要改善的點", "若要復合，你們的阻礙是甚麼"] },
      { name: "緣來暗戀", originalPrice: 999, discountedPrice: 899, details: ["他喜歡你嗎", "他是我得正緣嗎", "他理想中的愛情是怎麼樣的", "他現在是否有喜歡的人", "是否要展開追求"] },
      { name: "旺桃花運", originalPrice: 999, discountedPrice: 899, details: ["未來三個月的感情運勢", "如何提升感情運", "怎樣的人適合你", "你需要改善的點", "如何突破過往在愛情中的盲點"] },
      { name: "友情可貴", originalPrice: 999, discountedPrice: 899, details: ["他對你的想法", "你們之間產生的問題", "問題如何解決", "對方隱藏的心結", "未來三個月的友情運勢"] },
      { name: "雙向之路", originalPrice: 999, discountedPrice: 899, details: ["你當前的狀態", "選擇 A 的未來三個月發展", "選擇 B 的未來三個月發展", "選擇 A 的結果", "選擇 B 的結果"] },
    ],
  },
  {
    id: "career",
    label: "財富職涯",
    items: [
      { name: "財富密碼", originalPrice: 999, discountedPrice: 899, details: ["求財面對的阻礙", "支出風險", "有利於增加財富的條件", "暗示生活中帶來財富的機遇", "影響財運的原因"] },
      { name: "創業衝衝", originalPrice: 999, discountedPrice: 899, details: ["現在的你是適合創業的嗎", "創業會成功嗎", "創業需注意的事", "如何解決困難", "創業會對你的生活帶來的影響"] },
      { name: "職涯探索", originalPrice: 999, discountedPrice: 899, details: ["你適合什麼工作", "如何提升自己的工作能力", "你的優勢是什麼", "未來三個月的工作運勢", "如何獲得他人支持或幫助"] },
      { name: "面試勝經", originalPrice: 999, discountedPrice: 899, details: ["內心糾結的問題", "眼前的工作機會適合自己嗎", "有機率成功嗎", "目前的阻礙", "這份工作機會最終的結果"] },
    ],
  },
  {
    id: "healing",
    label: "人生療癒",
    items: [
      { name: "進化人生", originalPrice: 999, discountedPrice: 899, details: ["如何提升自信", "你的優勢與缺點", "你的人生使命", "未來三個月的整體運勢", "與他人相處上的建議或提醒"] },
      { name: "心靈療癒", originalPrice: 999, discountedPrice: 899, details: ["痛苦真正的根源", "這件事帶給生活的影響", "如何讓自己平靜", "為了療癒自己，你要採取的行動", "療癒完能獲得的成長與改變"] },
      { name: "守護神", originalPrice: 1088, discountedPrice: 979, details: ["我的守護星", "我的守護神", "守護神的過去與故事", "守護神與你之間的連結", "守護神想提醒你的事", "要如何與守護神有更深刻的感應"] },
    ],
  },
  {
    id: "time",
    label: "前世流年",
    items: [
      { name: "前世今生 3", originalPrice: 800, discountedPrice: 720, details: ["以前世故事模式闡述前世的一生", "約 500-1000 字"] },
      { name: "前世今生 2", originalPrice: 999, discountedPrice: 899, details: ["你和他前世的關係", "你和他前世如何相遇／發生了什麼事", "今生你們在這段關係的課題", "如何跨過你們今生的課題", "神諭卡祝福"] },
      { name: "前世今生 1", originalPrice: 1288, discountedPrice: 1159, details: ["為何轉世來到今生", "前世的外在印象／外表個性特質", "前世的內心世界", "前世的家庭生活", "前世的情感與愛人", "前世的職涯方向", "今生的課題／想得到的一個目標"] },
      { name: "流年運勢 3", originalPrice: 1088, discountedPrice: 979, details: ["未來一年主要會是怎樣的狀態", "春夏秋冬每季會遇到的事與建議", "神諭卡祝福"] },
      { name: "流年運勢 1", originalPrice: 1288, discountedPrice: 1159, details: ["第一宮：整體運勢", "第二宮：財運", "第三宮：溝通、學習、交通", "第四宮：家庭、親情、房產", "第五宮：感情、創意、娛樂", "第六宮：健康、工作、日常事務", "第七宮：人際、合作、婚姻", "第八宮：潛意識、轉化、死亡", "第九宮：信仰、遠方、旅行", "第十宮：事業、社會地位、名聲", "第十一宮：友誼、理想、團體", "第十二宮：自我犧牲、困境、隱藏"] },
      { name: "流年運勢 2", originalPrice: 1588, discountedPrice: 1429, details: ["未來一年主要會是怎樣的狀態", "未來一年每月會遇到的事與建議", "未來一年神諭卡祝福"] },
    ],
  },
];

function CustomPriceTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="bg-[oklch(0.985_0_0)] border-l border-[oklch(0.75_0_0)] px-4 py-3.5">
      <p className="text-[0.68rem] tracking-[0.16em] font-body text-[oklch(0.48_0_0)] mb-1.5">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-light text-[oklch(0.12_0_0)] leading-snug" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
        {value}
      </p>
      {note && (
        <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-1.5 leading-relaxed">
          {note}
        </p>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<
    "benefits" | "content" | "howto" | "notices"
  >((product?.benefits?.length ?? 0) > 0 ? "benefits" : "content");
  const [activeTarotCategory, setActiveTarotCategory] = useState(tarotReadingCategories[0].id);
  const [selectedTarotReadingName, setSelectedTarotReadingName] = useState(tarotReadingCategories[0].items[0].name);
  const wristSizes = ["12", "12.5", "13", "13.5", "14", "14.5", "15", "15.5", "16", "16.5", "17", "17.5", "18", "18.5", "19"];
  const claspChoices = [
    { id: "lobster" as const, label: "龍蝦扣", price: "+NT$200", img: "/lobster-clasp.jpg" },
    { id: "magnetic" as const, label: "磁扣", price: "+NT$200", img: "/magnet-clasp.png" },
    { id: "elastic" as const, label: "彈力繩", price: "免費", img: "/elastic-cord.jpg" },
  ];
  const [selectedWristSize, setSelectedWristSize] = useState("14");
  const [selectedClaspType, setSelectedClaspType] = useState<"elastic" | "lobster" | "magnetic">("elastic");
  const [hasSelectedClasp, setHasSelectedClasp] = useState(false);
  const [selectedFitPreference, setSelectedFitPreference] = useState<"just-right" | "loose">("just-right");
  const fitOptions = [
    { id: "just-right" as const, label: "剛好", desc: "會有水晶壓痕但不掐肉" },
    { id: "loose" as const, label: "微鬆", desc: "可輕微滑動" },
  ];
  const { addToCart, setIsOpen } = useCart();
  const { data: availability } = trpc.inventory.getAvailability.useQuery(
    { productId: product?.id ?? "" },
    { enabled: Boolean(product && product.category !== "custom") }
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  useEffect(() => {
    setActiveTab((product?.benefits?.length ?? 0) > 0 ? "benefits" : "content");
    setHasSelectedClasp(false);
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
        <p className="text-3xl font-light text-[oklch(0.7_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>找不到此商品</p>
        <Link href="/products">
          <button className="btn-primary">返回商品列表</button>
        </Link>
      </div>
    );
  }

  const isCustomizableProduct =
    product.id !== "d003-venus" && product.howToUse.some((line) => line.includes("手圍"));
  const visibleTags = product.tags;
  const wristSizeNumber = Number(selectedWristSize);
  const isMoonClearHeart = product.id === "d005-moon-clear-heart";
  const isMorningWhisper = product.id === "d004-morning-whisper";
  const basePrice = isCustomizableProduct
    ? wristSizeNumber <= 13.5
      ? isMorningWhisper ? 1700 : isMoonClearHeart ? 1400 : 1480
      : wristSizeNumber <= 17
        ? isMorningWhisper ? 1800 : isMoonClearHeart ? 1500 : 1580
        : isMorningWhisper ? 1900 : isMoonClearHeart ? 1600 : 1680
    : product.price;
  const claspExtra = isCustomizableProduct && selectedClaspType !== "elastic" ? 200 : 0;
  const currentPrice = basePrice + claspExtra;
  const isTarotDepositProduct = product.id === "tarot-crystal-deposit-product";
  const isBasicCustomDepositProduct = product.id === "custom-deposit-product";
  const isChakraDepositProduct = product.id === "chakra-crystal-deposit-product";
  const isNumerologyDepositProduct = product.id === "numerology-crystal-deposit-product";
  const splitCustomFeeLabel = isChakraDepositProduct
    ? "脈輪檢測價格"
    : isNumerologyDepositProduct
      ? "生命靈數解析價格"
      : "";
  const activeTarotPriceList =
    tarotReadingCategories.find((category) => category.id === activeTarotCategory)?.items ??
    tarotReadingCategories[0].items;
  const selectedTarotReading =
    activeTarotPriceList.find((item) => item.name === selectedTarotReadingName) ??
    activeTarotPriceList[0];
  const isPreorderItem =
    product.category !== "custom" &&
    (availability?.isPreorder === true || (availability?.stock ?? 1) <= 0);
  const fulfillmentNote = isPreorderItem
    ? availability?.preorderNote || PREORDER_FULFILLMENT_NOTE
    : IN_STOCK_FULFILLMENT_NOTE;

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addToCart(
        product,
        isCustomizableProduct
          ? { unitPrice: currentPrice, wristSize: selectedWristSize, claspType: selectedClaspType, fitPreference: selectedFitPreference, isPreorder: isPreorderItem }
          : { fitPreference: selectedFitPreference, isPreorder: isPreorderItem }
      );
    }
    toast.success(`已加入購物袋：${product.name} × ${qty}`);
    setIsOpen(true);
  };

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const customFormPaths: Record<string, string> = {
    "custom-deposit-product": "/custom/form",
    "tarot-crystal-deposit-product": "/custom/form-b",
    "chakra-crystal-deposit-product": "/custom/form-c",
    "numerology-crystal-deposit-product": "/custom/form-d",
  };

  const showHowToTab = product.id !== "d003-venus";
  const tabs = [
    ...(product.benefits.length > 0 ? [{ id: "benefits" as const, label: "功效說明" }] : []),
    { id: "content" as const, label: "商品內容" },
    ...(showHowToTab ? [{ id: "howto" as const, label: "下單流程" }] : []),
    ...(product.category === "custom" && isCustomDepositProduct(product.id)
      ? [{ id: "notices" as const, label: "注意事項" }]
      : []),
  ];
  const contentItems = product.crystalType.includes("｜")
    ? product.crystalType.split("｜")
    : product.crystalType.split("、");

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* Breadcrumb */}
      <div className="border-b border-[oklch(0.93_0_0)] px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center gap-2">
          <Link href="/products">
            <span className="text-[0.65rem] font-body text-[oklch(0.55_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors tracking-wide">
              所有商品
            </span>
          </Link>
          <span className="text-[0.65rem] text-[oklch(0.7_0_0)]">/</span>
          <span className="text-[0.65rem] font-body text-[oklch(0.1_0_0)] tracking-wide">{product.name}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* Left: Image */}
          <div className="bg-[oklch(0.97_0_0)] aspect-square overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full ${product.id === "d002-honey-realm" ? "object-contain p-6" : "object-cover"}`}
            />
          </div>

          {/* Right: Info */}
          <div className="flex flex-col justify-center">
            {/* Category + Tags */}
            {product.category !== "custom" && (
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="eyebrow">{product.categoryLabel}</span>
                {visibleTags.length > 0 && <span className="text-[oklch(0.7_0_0)]">·</span>}
                {visibleTags.slice(0, 2).map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}

            {/* Name */}
            {product.category === "custom" && (
              <p className="text-[0.68rem] tracking-[0.22em] font-body text-[oklch(0.48_0_0)] mb-3">
                客製化服務
              </p>
            )}
            <h1 className="heading-lg mb-2">{product.name}</h1>
            <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] mb-6 leading-relaxed">
              {product.category === "custom"
                ? ({
                    "custom-deposit-product": "依您的功效需求，量身打造專屬能量水晶手鍊",
                    "tarot-crystal-deposit-product": "透過塔羅解析能量缺口，為您設計最契合當下的水晶手鍊",
                    "chakra-crystal-deposit-product": "以靈擺與塔羅測出七脈輪狀態，用水晶補足能量缺口",
                    "numerology-crystal-deposit-product": "從出生年月日找出缺數，以水晶能量精準補足天賦",
                  } as Record<string, string>)[product.id]
                : product.subtitle}
            </p>

            {/* Price */}
            <div className="flex flex-col gap-1.5 mb-8 pb-8 border-b border-[oklch(0.93_0_0)]">
              {product.priceRange ? (
                <>
                  {isTarotDepositProduct ? (
                    <div className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <CustomPriceTile label="手鍊價格" value="NT$1,200 ~ 1,800" />
                        <CustomPriceTile label="塔羅價格" value="價目表 9 折" note="各塔羅方案可於下方切換查看" />
                      </div>
                      <div className="bg-[oklch(0.99_0_0)] border border-[oklch(0.92_0_0)] px-4 py-4 sm:px-5 sm:py-5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-3">
                          <div>
                            <p className="text-[0.68rem] tracking-[0.18em] font-body text-[oklch(0.48_0_0)] mb-1">
                              塔羅價目表
                            </p>
                            <p className="text-sm font-body text-[oklch(0.38_0_0)] leading-relaxed">
                              客製水晶搭配塔羅解析時，以下價格依原價 9 折計算
                            </p>
                          </div>
                          <span className="text-xs font-body text-[oklch(0.42_0_0)] bg-white px-2.5 py-1 border border-[oklch(0.9_0_0)]">
                            9 折優惠
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
                          {tarotReadingCategories.map((category) => {
                            const isActive = category.id === activeTarotCategory;
                            return (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() => {
                                  setActiveTarotCategory(category.id);
                                  setSelectedTarotReadingName(category.items[0].name);
                                }}
                                className={`shrink-0 border px-3.5 py-2 text-xs font-body transition-colors ${
                                  isActive
                                    ? "border-[oklch(0.16_0_0)] bg-[oklch(0.16_0_0)] text-white"
                                    : "border-[oklch(0.88_0_0)] bg-white text-[oklch(0.35_0_0)] hover:border-[oklch(0.58_0_0)]"
                                }`}
                              >
                                {category.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {activeTarotPriceList.map((item) => (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setSelectedTarotReadingName(item.name)}
                              className={`flex items-center justify-between gap-3 border px-3.5 py-3 text-left transition-colors ${
                                selectedTarotReading.name === item.name
                                  ? "border-[oklch(0.18_0_0)] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.04)]"
                                  : "border-[oklch(0.92_0_0)] bg-white hover:border-[oklch(0.68_0_0)]"
                              }`}
                            >
                              <p className="text-sm font-body text-[oklch(0.18_0_0)] leading-snug">{item.name}</p>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-medium text-[oklch(0.1_0_0)]">
                                  NT$ {item.discountedPrice.toLocaleString()}
                                </p>
                                <p className="text-[0.65rem] font-body text-[oklch(0.65_0_0)] line-through">
                                  NT$ {item.originalPrice.toLocaleString()}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="mt-4 border-l border-[oklch(0.68_0_0)] bg-white px-4 py-4 sm:px-5 sm:py-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-[0.68rem] tracking-[0.18em] font-body text-[oklch(0.48_0_0)] mb-1">
                                方案內容
                              </p>
                              <p className="text-lg font-light text-[oklch(0.12_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
                                {selectedTarotReading.name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-medium text-[oklch(0.1_0_0)]">
                                NT$ {selectedTarotReading.discountedPrice.toLocaleString()}
                              </p>
                              <p className="text-[0.65rem] font-body text-[oklch(0.65_0_0)] line-through">
                                NT$ {selectedTarotReading.originalPrice.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <ul className="space-y-2">
                            {selectedTarotReading.details.map((detail) => (
                              <li key={detail} className="flex gap-2 text-sm font-body leading-relaxed text-[oklch(0.28_0_0)]">
                                <span className="mt-[0.58em] h-1 w-1 shrink-0 rounded-full bg-[oklch(0.5_0_0)]" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : isBasicCustomDepositProduct ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CustomPriceTile label="手鍊價格" value="NT$1,200 ~ 1,800" />
                      <CustomPriceTile label="訂金" value="NT$500" note="尾款由店家確認後另行通知" />
                    </div>
                  ) : splitCustomFeeLabel ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CustomPriceTile label="手鍊價格" value="NT$1,200 ~ 1,800" />
                      <CustomPriceTile label={splitCustomFeeLabel} value="NT$500" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-medium text-[oklch(0.1_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
                          {product.priceRange}
                        </span>
                      </div>
                      <p className="text-sm font-body text-[oklch(0.5_0_0)]">
                        {product.depositRange
                          ? `下單先支付訂金 ${product.depositRange}（依占卜主題調整），尾款由老闆確認後另行通知`
                          : `下單先支付訂金 NT$ ${currentPrice.toLocaleString()}，尾款由老闆確認後另行通知`}
                      </p>
                    </>
                  )}
                </>
              ) : (
              <div className="flex items-baseline gap-3">
              <span className="text-3xl font-medium text-[oklch(0.1_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
                NT$ {currentPrice.toLocaleString()}
              </span>
              {product.category === "custom" && (
                <span className="text-xs font-body text-[oklch(0.55_0_0)] bg-[oklch(0.95_0_0)] px-2 py-0.5">
                  此為訂金價格
                </span>
              )}
              {product.originalPrice && (
                <span className="text-sm font-body text-[oklch(0.65_0_0)] line-through">
                  NT$ {product.originalPrice.toLocaleString()}
                </span>
              )}
              {product.originalPrice && (
                <span className="text-xs font-body text-[oklch(0.55_0.07_15)] bg-[oklch(0.97_0.02_15)] px-2 py-0.5">
                  省 NT$ {(product.originalPrice - product.price).toLocaleString()}
                </span>
              )}
            </div>
              )}
            </div>

            {isCustomizableProduct && (
              <div className="mb-8 pb-8 border-b border-[oklch(0.93_0_0)] space-y-5">
                <div>
                  <p className="text-[0.7rem] tracking-[0.12em] font-body text-[oklch(0.45_0_0)] mb-2">手圍尺寸</p>
                  <select
                    value={selectedWristSize}
                    onChange={(e) => setSelectedWristSize(e.target.value)}
                    className="w-full border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:outline-none focus:border-[oklch(0.1_0_0)]"
                  >
                    {wristSizes.map((size) => (
                      <option key={size} value={size}>
                        {size} cm
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-[0.7rem] tracking-[0.12em] font-body text-[oklch(0.45_0_0)]">扣件類型</p>
                    <p className="text-[0.65rem] font-body text-[oklch(0.5_0.06_250)] underline underline-offset-2">點選看示意圖</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {claspChoices.map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => { setSelectedClaspType(opt.id); setHasSelectedClasp(true); }}
                        className={`px-2 py-2.5 text-xs font-body border-2 transition-colors text-center rounded-sm ${
                          selectedClaspType === opt.id && hasSelectedClasp
                            ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)] text-[oklch(0.1_0_0)]"
                            : "border-[oklch(0.88_0_0)] text-[oklch(0.5_0_0)] hover:border-[oklch(0.6_0_0)]"
                        }`}
                      >
                        <span className="block font-medium">{opt.label}</span>
                        <span className="block text-[0.6rem] mt-0.5 opacity-70">{opt.price}</span>
                      </button>
                    ))}
                  </div>
                  {hasSelectedClasp && (
                    <div className="mt-3 bg-[oklch(0.97_0_0)] rounded-sm p-2">
                      <img
                        src={claspChoices.find((o) => o.id === selectedClaspType)!.img}
                        alt={selectedClaspType}
                        className="w-full max-h-56 object-contain rounded-sm"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[0.7rem] tracking-[0.12em] font-body text-[oklch(0.45_0_0)] mb-2">鬆緊度</p>
                  <div className="grid grid-cols-2 gap-2">
                    {fitOptions.map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setSelectedFitPreference(opt.id)}
                        className={`px-3 py-2.5 text-xs font-body border transition-colors text-left ${
                          selectedFitPreference === opt.id
                            ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)] text-[oklch(0.1_0_0)]"
                            : "border-[oklch(0.88_0_0)] text-[oklch(0.5_0_0)] hover:border-[oklch(0.6_0_0)]"
                        }`}
                      >
                        <span className="block font-medium">{opt.label}</span>
                        <span className="block text-[0.6rem] mt-0.5 opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isCustomizableProduct && product.category !== "custom" && (
              <div className="mb-8 pb-8 border-b border-[oklch(0.93_0_0)]">
                <p className="text-[0.7rem] tracking-[0.12em] font-body text-[oklch(0.45_0_0)] mb-2">鬆緊度</p>
                <div className="grid grid-cols-2 gap-2">
                  {fitOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setSelectedFitPreference(opt.id)}
                      className={`px-3 py-2.5 text-xs font-body border transition-colors text-left ${
                        selectedFitPreference === opt.id
                          ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)] text-[oklch(0.1_0_0)]"
                          : "border-[oklch(0.88_0_0)] text-[oklch(0.5_0_0)] hover:border-[oklch(0.6_0_0)]"
                      }`}
                    >
                      <span className="block font-medium">{opt.label}</span>
                      <span className="block text-[0.6rem] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom product: form CTA */}
            {product.category === "custom" && customFormPaths[product.id] && (
              <div className="mb-4">
                <Link href={customFormPaths[product.id]}>
                  <button className="w-full py-3.5 text-sm font-body tracking-widest text-white transition-opacity hover:opacity-90 bg-[oklch(0.25_0_0)]">
                    填寫諮詢表單並下訂
                  </button>
                </Link>
                <p className="text-[0.65rem] font-body text-[oklch(0.55_0_0)] text-center mt-2">
                  填寫完畢後將自動導入結帳頁面
                </p>
              </div>
            )}

            {/* Qty + Add to Cart */}
            {product.category !== "custom" && <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-[oklch(0.9_0_0)]">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 flex items-center justify-center text-[oklch(0.4_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors"
                  aria-label="減少"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-body">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="w-10 h-10 flex items-center justify-center text-[oklch(0.4_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors"
                  aria-label="增加"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="btn-primary flex-1 justify-center"
              >
                <ShoppingBag className="w-4 h-4" />
                加入購物袋
              </button>
            </div>}

            {product.category !== "custom" && (
              <div className="mb-6 border border-[oklch(0.9_0_0)] bg-[oklch(0.985_0_0)] px-4 py-3">
                <p className="text-[0.68rem] tracking-[0.14em] font-body text-[oklch(0.5_0_0)] mb-1">
                  出貨時間
                </p>
                <p className="text-sm font-body text-[oklch(0.22_0_0)] leading-relaxed">
                  {fulfillmentNote}
                </p>
              </div>
            )}

            {/* LINE contact for custom products */}
            {product.category === "custom" && (
              <p className="text-xs font-body text-[oklch(0.5_0_0)] mb-6 leading-relaxed">
                有任何問題請私訊官方 LINE：
                <a
                  href={CUSTOM_LINE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[oklch(0.45_0.12_155)] underline underline-offset-2 hover:opacity-80"
                >
                  @011tymeh
                </a>
              </p>
            )}

            {/* Suitable For */}
            {product.category !== "custom" && (
              <div className="mb-6 pb-6 border-b border-[oklch(0.93_0_0)]">
                <p className="eyebrow mb-3">SUITABLE FOR · 適合族群</p>
                <div className="flex flex-wrap gap-2">
                  {product.suitableFor.map((s) => (
                    <span key={s} className="text-[0.65rem] font-body text-[oklch(0.4_0_0)] bg-[oklch(0.97_0_0)] px-3 py-1.5">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div>
              <div className="flex border-b border-[oklch(0.93_0_0)] mb-5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-[0.7rem] tracking-[0.1em] font-body border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-[oklch(0.1_0_0)] text-[oklch(0.1_0_0)]"
                        : "border-transparent text-[oklch(0.55_0_0)] hover:text-[oklch(0.1_0_0)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "benefits" && (
                <ul className="space-y-2">
                  {product.benefits.map((b, i) => (
                    <li key={i} className="flex gap-3 text-sm font-body font-light text-[oklch(0.35_0_0)]">
                      <span className="text-[oklch(0.72_0.09_70)] shrink-0 mt-0.5">◇</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              {activeTab === "content" && (
                <ul className="space-y-2">
                  {contentItems.map((item) => (
                    <li key={item} className="flex gap-3 text-sm font-body font-light text-[oklch(0.35_0_0)]">
                      <span className="text-[oklch(0.72_0.09_70)] shrink-0 mt-0.5">◇</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {showHowToTab && activeTab === "howto" && (
                <div className="space-y-8">
                  {isCustomDepositProduct(product.id) ? (
                    <div>
                      <p className="eyebrow mb-3">訂購流程</p>
                      <ol className="ml-1 list-outside list-decimal space-y-2.5 pl-5 text-sm font-body font-light text-[oklch(0.35_0_0)] leading-relaxed marker:font-medium marker:text-[oklch(0.55_0.08_70)]">
                        <li>填寫以下報名表單，提供手圍、喜歡金飾或銀飾，並確認設計需求。</li>
                        <li>支付訂金。</li>
                        <li>
                          加入
                          <a
                            href={CUSTOM_LINE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[oklch(0.45_0.12_155)] underline decoration-[oklch(0.45_0.12_155)]/30 underline-offset-[3px] hover:opacity-80 mx-0.5"
                          >
                            官方 LINE
                          </a>
                          ，等待設計師傳送水晶搭配圖。
                        </li>
                        <li>手鍊與設計確認完成後，將提供尾款報價。</li>
                        <li>尾款支付完畢，準備出貨。</li>
                      </ol>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {product.howToUse.map((h, i) => (
                        <li key={i} className="flex gap-3 text-sm font-body font-light text-[oklch(0.35_0_0)]">
                          <span className="text-[oklch(0.72_0.09_70)] shrink-0 mt-0.5 font-body">{i + 1}.</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {product.category === "custom" && isCustomDepositProduct(product.id) && activeTab === "notices" && (
                <div className="rounded-sm border border-[oklch(0.9_0.02_85)] bg-[oklch(0.985_0.005_85)] px-4 py-4">
                  <p className="text-sm font-body text-[oklch(0.35_0_0)] mb-3 flex items-center gap-2 tracking-wide">
                    <span className="text-amber-600/90" aria-hidden>
                      ⚠️
                    </span>
                    手鍊注意事項
                  </p>
                  <div className="space-y-3 text-[0.8125rem] font-body font-light text-[oklch(0.4_0_0)] leading-[1.75] tracking-wide">
                    {CUSTOM_BRACELET_NOTICES.map((n, idx) => (
                      <div key={idx}>
                        {n.title ? (
                          <p className="font-medium text-[oklch(0.32_0_0)] mb-1">{n.title}</p>
                        ) : null}
                        <p>{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="border-t border-[oklch(0.93_0_0)] py-14">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <p className="eyebrow mb-2">YOU MAY ALSO LIKE</p>
              <h2 className="heading-lg">相關商品</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map((p) => (
                <Link key={p.id} href={`/products/${p.id}`}>
                  <div className="product-card group">
                    <div className="product-card-image">
                      <img src={p.image} alt={p.name} loading="lazy" />
                    </div>
                    <div className="product-card-info">
                      <p className="product-card-name">{p.name}</p>
                      <p className="product-card-price">NT$ {p.price.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
