// 日日好日 — Product Detail Page
// Design: Vacanza-inspired — large image + clean product info
import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { products } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"benefits" | "content" | "howto" | "pricing">(
    (product?.benefits?.length ?? 0) > 0 ? "benefits" : "content"
  );
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

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addToCart(
        product,
        isCustomizableProduct
          ? { unitPrice: currentPrice, wristSize: selectedWristSize, claspType: selectedClaspType, fitPreference: selectedFitPreference }
          : { fitPreference: selectedFitPreference }
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
    ...(product.category === "custom" ? [{ id: "pricing" as const, label: "價格說明" }] : []),
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

            {/* LINE contact for custom products */}
            {product.category === "custom" && (
              <p className="text-xs font-body text-[oklch(0.5_0_0)] mb-6 leading-relaxed">
                有任何問題請私訊官方 LINE：
                <a
                  href="https://line.me/R/ti/p/@011tymeh"
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
                <ul className="space-y-2">
                  {product.howToUse.map((h, i) => (
                    <li key={i} className="flex gap-3 text-sm font-body font-light text-[oklch(0.35_0_0)]">
                      <span className="text-[oklch(0.72_0.09_70)] shrink-0 mt-0.5 font-body">{i + 1}.</span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              {product.category === "custom" && activeTab === "pricing" && (
                <ul className="space-y-2">
                  {[
                    "若選擇龍蝦扣或磁扣：額外 +200$",
                  ].map((line) => (
                    <li key={line} className="flex gap-3 text-sm font-body font-light text-[oklch(0.35_0_0)]">
                      <span className="text-[oklch(0.72_0.09_70)] shrink-0 mt-0.5">◇</span>
                      {line}
                    </li>
                  ))}
                </ul>
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
