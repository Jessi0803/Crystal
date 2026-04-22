/**
 * 結帳頁面
 * 流程：填寫購買人資料 → 選擇配送方式（超商/宅配）→ 選擇付款方式（信用卡/銀行轉帳）→ 送出訂單
 * 物流類型：C2C 店到店（UNIMARTC2C / FAMIC2C）
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Store, ShieldCheck, Lock, Banknote, MapPin, Home } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type PaymentMethod = "credit" | "atm";
type ShippingMethod = "cvs_711" | "home";

// 運費設定
const SHIPPING_FEES: Record<ShippingMethod, number> = {
  cvs_711: 0,
  home: 0,
};

// 計算運費（2件以上免運）
function calcShippingFee(method: ShippingMethod, totalQty: number): number {
  if (totalQty >= 2) return 0;
  return SHIPPING_FEES[method];
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, totalPrice, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("home");

  // 計算總件數與運費
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const shippingFee = calcShippingFee(shippingMethod, totalQty);
  const finalTotal = totalPrice + shippingFee;
  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
    shippingZip: "",
    shippingCity: "",
    shippingDistrict: "",
    shippingDetail: "",
  });
  // 超商選店資訊（由綠界地圖回傳）
  const [cvsStore, setCvsStore] = useState<{ storeId: string; storeName: string; cvsType: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createAndPay = trpc.order.createAndPay.useMutation();

  // 監聽綠界選店視窗回傳的 postMessage（必須在 early return 之前呼叫 Hook）
  const cvsWindowRef = useRef<Window | null>(null);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CVS_STORE_SELECTED") {
        const { storeId, storeName, cvsType } = event.data;
        setCvsStore({ storeId, storeName, cvsType });
        toast.success(`已選擇門市：${storeName}`);
        if (cvsWindowRef.current && !cvsWindowRef.current.closed) {
          cvsWindowRef.current.close();
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // 購物車空時導回
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-2xl mb-4" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>購物車是空的</p>
        <p className="text-sm text-[oklch(0.5_0_0)] mb-8">請先選擇商品後再進行結帳</p>
        <button className="btn-primary" onClick={() => setLocation("/products")}>前往選購</button>
      </div>
    );
  }

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.buyerName.trim()) errs.buyerName = "請輸入姓名";
    if (!form.buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyerEmail))
      errs.buyerEmail = "請輸入有效的 Email";
    if (!form.buyerPhone.trim() || !/^09\d{8}$/.test(form.buyerPhone))
      errs.buyerPhone = "請輸入有效的手機號碼（09xxxxxxxx）";
    if (shippingMethod === "cvs_711" && !cvsStore)
      errs.cvsStore = "請選擇超商門市";
    if (shippingMethod === "home") {
      if (!form.shippingZip.trim() || !/^\d{3,6}$/.test(form.shippingZip)) errs.shippingZip = "請輸入有效郵遞區號";
      if (!form.shippingCity.trim()) errs.shippingCity = "請輸入縣市";
      if (!form.shippingDistrict.trim()) errs.shippingDistrict = "請輸入鄉鎮市區";
      if (!form.shippingDetail.trim()) errs.shippingDetail = "請輸入詳細地址（路名門牌）";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const result = await createAndPay.mutateAsync({
        buyerName: form.buyerName,
        buyerEmail: form.buyerEmail,
        buyerPhone: form.buyerPhone,
        paymentMethod,
        shippingMethod,
        cvsStoreId: cvsStore?.storeId,
        cvsStoreName: cvsStore?.storeName,
        cvsType: cvsStore?.cvsType,
        shippingAddress: shippingMethod === "home"
          ? `${form.shippingCity}${form.shippingDistrict}${form.shippingDetail}`
          : undefined,
        receiverZipCode: shippingMethod === "home" ? form.shippingZip : undefined,
        items: items.map((i) => ({
          id: i.id,
          name: `${i.product.name}${i.wristSize ? `（手圍 ${i.wristSize}cm）` : ""}${i.claspType === "lobster" ? "（龍蝦扣）" : i.claspType === "magnetic" ? "（磁扣）" : ""}`,
          price: i.unitPrice,
          quantity: i.quantity,
          image: i.product.image,
        })).concat(
          shippingFee > 0
            ? [{ id: "shipping", name: "運費", price: shippingFee, quantity: 1, image: "" }]
            : []
        ),
        origin: window.location.origin,
      });

      clearCart();

      if (result.paymentMethod === "atm") {
        // 銀行轉帳：直接導向訂單結果頁（帶銀行帳號資訊）
        setLocation(`/order/${result.merchantTradeNo}`);
        return;
      }

      // 信用卡：建立隱藏表單提交到綠界
      if (result.paymentMethod === "credit" && result.paymentURL && result.paymentParams) {
        const hiddenForm = document.createElement("form");
        hiddenForm.method = "POST";
        hiddenForm.action = result.paymentURL;
        hiddenForm.style.display = "none";

        Object.entries(result.paymentParams).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value as string;
          hiddenForm.appendChild(input);
        });

        document.body.appendChild(hiddenForm);
        hiddenForm.submit();
      }
    } catch (err) {
      console.error(err);
      toast.error("建立訂單失敗，請稍後再試");
    }
  };

  // 綠界超商選店（開啟綠界選店視窗）
  const handleSelectCvsStore = () => {
    const subType = "UNIMARTC2C";
    const tradeNo = `MAP${Date.now()}`;
    const mapURL = `/api/ecpay/cvs-map?tradeNo=${encodeURIComponent(tradeNo)}&subType=${subType}`;
    const popup = window.open(mapURL, "ecpay_cvs_map", "width=1024,height=768,scrollbars=yes");
    if (!popup) {
      toast.error("無法開啟選店視窗，請允許彈出視窗後再試");
      return;
    }
    cvsWindowRef.current = popup;
  };

  const inputClass = (field: string) =>
    `w-full border px-4 py-3 text-sm font-body focus:outline-none transition-colors ${
      errors[field]
        ? "border-red-400 focus:border-red-500"
        : "border-[oklch(0.88_0_0)] focus:border-[oklch(0.1_0_0)]"
    }`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[oklch(0.93_0_0)] py-4 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-xs tracking-widest font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回
          </button>
          <span className="text-[oklch(0.8_0_0)]">/</span>
          <span className="text-xs tracking-widest font-body">結帳</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          {/* Left: Form */}
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* 購買人資訊 */}
            <section>
              <h2 className="text-sm tracking-[0.2em] font-body mb-5 pb-3 border-b border-[oklch(0.93_0_0)]">
                購買人資訊
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs tracking-widest font-body text-[oklch(0.4_0_0)] mb-2">
                    姓名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="請輸入真實姓名"
                    value={form.buyerName}
                    onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                    className={inputClass("buyerName")}
                  />
                  {errors.buyerName && <p className="text-xs text-red-400 mt-1">{errors.buyerName}</p>}
                </div>
                <div>
                  <label className="block text-xs tracking-widest font-body text-[oklch(0.4_0_0)] mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="訂單確認信將寄至此信箱"
                    value={form.buyerEmail}
                    onChange={(e) => setForm((f) => ({ ...f, buyerEmail: e.target.value }))}
                    className={inputClass("buyerEmail")}
                  />
                  {errors.buyerEmail && <p className="text-xs text-red-400 mt-1">{errors.buyerEmail}</p>}
                </div>
                <div>
                  <label className="block text-xs tracking-widest font-body text-[oklch(0.4_0_0)] mb-2">
                    手機號碼 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={form.buyerPhone}
                    onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                    className={inputClass("buyerPhone")}
                  />
                  {errors.buyerPhone && <p className="text-xs text-red-400 mt-1">{errors.buyerPhone}</p>}
                </div>
              </div>
            </section>

            {/* 配送方式 */}
            <section>
              <h2 className="text-sm tracking-[0.2em] font-body mb-5 pb-3 border-b border-[oklch(0.93_0_0)]">
                配送方式
              </h2>
              {totalQty >= 2 && (
                <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 text-xs font-body text-green-700">
                  🎉 購買 2 件以上，享免運費優惠！
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "home" as ShippingMethod, icon: <Home className="w-5 h-5" />, title: "宅配到府", desc: "黑貓宅急便（免運）" },
                  { key: "cvs_711" as ShippingMethod, icon: <Store className="w-5 h-5" />, title: "7-11 取貨", desc: "超商取貨，先付款再取貨（免運）" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { setShippingMethod(opt.key); setCvsStore(null); }}
                    className={`flex items-start gap-3 p-4 border text-left transition-all ${
                      shippingMethod === opt.key
                        ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)]"
                        : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.7_0_0)]"
                    }`}
                  >
                    <span className="text-[oklch(0.3_0_0)] mt-0.5 shrink-0">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">{opt.title}</p>
                      <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                      shippingMethod === opt.key ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.8_0_0)]"
                    }`}>
                      {shippingMethod === opt.key && <div className="w-2 h-2 rounded-full bg-[oklch(0.1_0_0)]" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* 超商選店 */}
              {shippingMethod === "cvs_711" && (
                <div className="mt-4">
                  {cvsStore ? (
                    <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-body text-green-800">
                          已選擇：{cvsStore.storeName}（門市代號：{cvsStore.storeId}）
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCvsStore(null)}
                        className="text-xs font-body text-green-600 underline"
                      >
                        重新選擇
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectCvsStore}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[oklch(0.7_0_0)] text-sm font-body text-[oklch(0.4_0_0)] hover:border-[oklch(0.3_0_0)] hover:text-[oklch(0.2_0_0)] transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      點此選擇 7-11 門市
                    </button>
                  )}
                  {errors.cvsStore && <p className="text-xs text-red-400 mt-1">{errors.cvsStore}</p>}
                </div>
              )}

              {/* 宅配地址 */}
              {shippingMethod === "home" && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs tracking-widest font-body text-[oklch(0.4_0_0)]">收件地址 <span className="text-red-400">*</span></p>
                  {/* 郵遞區號 + 縣市 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="郵遞區號（如 100）"
                        value={form.shippingZip}
                        onChange={(e) => setForm((f) => ({ ...f, shippingZip: e.target.value }))}
                        className={inputClass("shippingZip")}
                        maxLength={6}
                      />
                      {errors.shippingZip && <p className="text-xs text-red-400 mt-1">{errors.shippingZip}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="縣市（如 台北市）"
                        value={form.shippingCity}
                        onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))}
                        className={inputClass("shippingCity")}
                      />
                      {errors.shippingCity && <p className="text-xs text-red-400 mt-1">{errors.shippingCity}</p>}
                    </div>
                  </div>
                  {/* 鄉鎮市區 */}
                  <div>
                    <input
                      type="text"
                      placeholder="鄉鎮市區（如 信義區）"
                      value={form.shippingDistrict}
                      onChange={(e) => setForm((f) => ({ ...f, shippingDistrict: e.target.value }))}
                      className={inputClass("shippingDistrict")}
                    />
                    {errors.shippingDistrict && <p className="text-xs text-red-400 mt-1">{errors.shippingDistrict}</p>}
                  </div>
                  {/* 詳細地址 */}
                  <div>
                    <input
                      type="text"
                      placeholder="路名、巻號、門牌（如 信義路五杘7號）"
                      value={form.shippingDetail}
                      onChange={(e) => setForm((f) => ({ ...f, shippingDetail: e.target.value }))}
                      className={inputClass("shippingDetail")}
                    />
                    {errors.shippingDetail && <p className="text-xs text-red-400 mt-1">{errors.shippingDetail}</p>}
                  </div>
                </div>
              )}
            </section>

            {/* 付款方式 */}
            <section>
              <h2 className="text-sm tracking-[0.2em] font-body mb-5 pb-3 border-b border-[oklch(0.93_0_0)]">
                付款方式
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 信用卡 / Apple Pay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("credit")}
                  className={`flex items-start gap-3 p-4 border text-left transition-all ${
                    paymentMethod === "credit"
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)]"
                      : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.7_0_0)]"
                  }`}
                >
                  <CreditCard className="w-5 h-5 mt-0.5 shrink-0 text-[oklch(0.3_0_0)]" />
                  <div>
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">信用卡 / Apple Pay</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">VISA / Master / JCB</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)]">即時扣款，支援分期</p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                    paymentMethod === "credit" ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.8_0_0)]"
                  }`}>
                    {paymentMethod === "credit" && <div className="w-2 h-2 rounded-full bg-[oklch(0.1_0_0)]" />}
                  </div>
                </button>

                {/* 銀行轉帳 */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("atm")}
                  className={`flex items-start gap-3 p-4 border text-left transition-all ${
                    paymentMethod === "atm"
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)]"
                      : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.7_0_0)]"
                  }`}
                >
                  <Banknote className="w-5 h-5 mt-0.5 shrink-0 text-[oklch(0.3_0_0)]" />
                  <div>
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">銀行轉帳</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">轉帳後填入末五碼</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)]">老闆確認後出貨</p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                    paymentMethod === "atm" ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.8_0_0)]"
                  }`}>
                    {paymentMethod === "atm" && <div className="w-2 h-2 rounded-full bg-[oklch(0.1_0_0)]" />}
                  </div>
                </button>
              </div>


            </section>

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={createAndPay.isPending}
              className="w-full btn-primary py-4 text-sm tracking-[0.2em] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createAndPay.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  處理中...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {paymentMethod === "credit" ? "前往付款" : "確認下單"}
                </>
              )}
            </button>

            {/* 安全說明 */}
            <div className="flex items-center justify-center gap-2 text-xs font-body text-[oklch(0.6_0_0)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>綠界科技 SSL 加密保護，交易安全有保障</span>
            </div>
          </form>

          {/* Right: Order Summary */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="border border-[oklch(0.93_0_0)] p-6">
              <h2 className="text-sm tracking-[0.2em] font-body mb-5 pb-3 border-b border-[oklch(0.93_0_0)]">
                訂單摘要
              </h2>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-[oklch(0.97_0_0)] shrink-0 overflow-hidden">
                      {item.product.image && (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body text-[oklch(0.1_0_0)] truncate">{item.product.name}</p>
                      <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">x {item.quantity}</p>
                      {(item.wristSize || item.claspType) && (
                        <p className="text-[0.65rem] font-body text-[oklch(0.45_0_0)] mt-0.5">
                          {item.wristSize ? `手圍 ${item.wristSize} cm` : ""}
                          {item.wristSize && item.claspType ? " · " : ""}
                          {item.claspType === "elastic" ? "彈力繩" : item.claspType === "lobster" ? "龍蝦扣" : item.claspType === "magnetic" ? "磁扣" : ""}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)] shrink-0">
                      NT$ {(item.unitPrice * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[oklch(0.93_0_0)] pt-4 space-y-2">
                <div className="flex justify-between text-sm font-body">
                  <span className="text-[oklch(0.5_0_0)]">小計</span>
                  <span>NT$ {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-[oklch(0.5_0_0)]">運費</span>
                  {shippingFee === 0 ? (
                    <span className="text-green-600">{totalQty >= 2 ? "免費（2件以上免運）" : "免費"}</span>
                  ) : (
                    <span>NT$ {shippingFee}</span>
                  )}
                </div>
                <div className="flex justify-between text-base font-medium border-t border-[oklch(0.93_0_0)] pt-3 mt-3">
                  <span>總計</span>
                  <span>NT$ {finalTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
