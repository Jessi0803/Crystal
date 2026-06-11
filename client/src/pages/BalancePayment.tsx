import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle, CreditCard, Banknote, XCircle, Home, Store, MapPin, Globe, ImageUp, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AU_STATE_OPTIONS,
  OVERSEAS_COUNTRY_EN,
  overseasPostalRequired,
  US_STATE_OPTIONS,
  validateOverseasAddress,
} from "@shared/overseasAddress";
import {
  OVERSEAS_SHIP_COUNTRY_LABELS,
  OVERSEAS_SHIP_COUNTRY_OPTIONS,
  isOverseasShipCountryCode,
} from "@shared/overseasShipping";
import { calcCheckoutFees, OVERSEAS_SHIPPING_FEES } from "@shared/checkoutFees";
import { STORE_BANK_INFO } from "@shared/bankAccount";
import InAppBrowserWarning from "@/components/InAppBrowserWarning";

type PaymentMethod = "credit" | "atm";
type ShippingMethod = "cvs_711" | "home";
type CheckoutRegion = "domestic" | "overseas";

// 同分頁跳轉去綠界選店前暫存尾款頁表單，回來時還原（手機 / LINE 內建瀏覽器
// 不支援 popup + window.close，必須整頁跳轉）。
const BALANCE_FORM_KEY = "balance_form_state";

function compressTransferReceipt(file: File): Promise<{ dataBase64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      resolve({ dataBase64: dataUrl.split(",")[1] ?? "", contentType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("截圖讀取失敗，請重新選擇圖片"));
    };
    img.src = url;
  });
}

export default function BalancePayment() {
  const { merchantTradeNo } = useParams<{ merchantTradeNo: string }>();
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit");
  const [checkoutRegion, setCheckoutRegion] = useState<CheckoutRegion>("domestic");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("home");
  const [form, setForm] = useState({
    shippingZip: "",
    shippingCity: "",
    shippingDistrict: "",
    shippingDetail: "",
    intlCountry: "",
    intlAddrLine1: "",
    intlAddrLine2: "",
    intlCity: "",
    intlState: "",
    intlPostalCode: "",
  });
  const [cvsStore, setCvsStore] = useState<{ storeId: string; storeName: string; cvsType: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [transferCode, setTransferCode] = useState("");
  const [transferReceipt, setTransferReceipt] = useState<{
    dataBase64: string;
    contentType: string;
    filename: string;
    previewUrl: string;
  } | null>(null);
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const cvsWindowRef = useRef<Window | null>(null);
  const transferReceiptInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = trpc.order.getBalancePayment.useQuery(
    { merchantTradeNo: merchantTradeNo ?? "" },
    { enabled: !!merchantTradeNo, refetchInterval: 5000 }
  );

  const startCheckout = trpc.order.getBalancePaymentCheckout.useMutation({
    onSuccess: (result) => {
      if (result.kind === "atm") {
        refetch();
        return;
      }
      const hiddenForm = document.createElement("form");
      hiddenForm.method = "POST";
      hiddenForm.action = result.paymentURL;
      hiddenForm.style.display = "none";
      Object.entries(result.paymentParams).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        hiddenForm.appendChild(input);
      });
      document.body.appendChild(hiddenForm);
      hiddenForm.submit();
    },
    onError: (err) => toast.error(err.message || "建立尾款付款失敗"),
  });

  const submitCode = trpc.order.submitBalanceTransferCode.useMutation({
    onSuccess: () => {
      setCodeSubmitted(true);
      toast.success("已送出匯款末五碼，老闆確認後將更新狀態");
      refetch();
    },
    onError: (err) => toast.error(err.message || "送出失敗，請重試"),
  });

  const applyStore = useRef((payload: { storeId?: string; storeName?: string; cvsType?: string }) => {
    if (!payload?.storeId && !payload?.storeName) return;
    setCvsStore({
      storeId: payload.storeId ?? "",
      storeName: payload.storeName ?? "",
      cvsType: payload.cvsType ?? "",
    });
    setShippingMethod("cvs_711");
    toast.success(`已選擇門市：${payload.storeName ?? ""}`);
    if (cvsWindowRef.current && !cvsWindowRef.current.closed) {
      cvsWindowRef.current.close();
    }
  }).current;

  // 同分頁跳轉回來：綠界選完門市後 cvs-map-reply 會 302 導回本頁並把門市資訊帶在
  // query string。不依賴 popup / opener / window.close，全裝置通用。
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const storeId = sp.get("cvsStoreId");
    const storeName = sp.get("cvsStoreName");
    if (!storeId && !storeName) return;

    try {
      const raw = sessionStorage.getItem(BALANCE_FORM_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.paymentMethod) setPaymentMethod(saved.paymentMethod);
        if (saved.checkoutRegion) setCheckoutRegion(saved.checkoutRegion);
        if (saved.shippingMethod) setShippingMethod(saved.shippingMethod);
        if (saved.form) setForm((f) => ({ ...f, ...saved.form }));
      }
    } catch {
      /* ignore */
    } finally {
      sessionStorage.removeItem(BALANCE_FORM_KEY);
    }

    applyStore({
      storeId: storeId ?? "",
      storeName: storeName ?? "",
      cvsType: sp.get("cvsType") ?? "",
    });
    window.history.replaceState({}, "", window.location.pathname);
  }, [applyStore]);

  // 後備：若某些瀏覽器仍把選店開成新分頁，沿用 BroadcastChannel / postMessage 接收
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CVS_STORE_SELECTED") applyStore(event.data);
    };
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("cvs_store_selected");
      channel.onmessage = (event) => {
        if (event.data?.type === "CVS_STORE_SELECTED") applyStore(event.data);
      };
    }
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      channel?.close();
    };
  }, [applyStore]);

  const handleSubmitCode = () => {
    if (transferCode.length !== 5 || !/^\d+$/.test(transferCode)) {
      toast.error("請輸入正確的 5 位數字");
      return;
    }
    if (!transferReceipt) {
      toast.error("請上傳轉帳成功截圖");
      setErrors((prev) => ({ ...prev, transferReceipt: "請上傳轉帳成功截圖" }));
      return;
    }
    submitCode.mutate({
      merchantTradeNo: merchantTradeNo ?? "",
      lastFive: transferCode,
      transferReceiptImageBase64: transferReceipt.dataBase64,
      transferReceiptImageContentType: transferReceipt.contentType,
      transferReceiptImageFilename: transferReceipt.filename,
    });
  };

  const handleTransferReceiptChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請上傳圖片格式的轉帳成功截圖");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("截圖請小於 10MB");
      e.target.value = "";
      return;
    }
    try {
      const compressed = await compressTransferReceipt(file);
      setTransferReceipt((previous) => {
        if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
        return {
          ...compressed,
          filename: file.name,
          previewUrl: URL.createObjectURL(file),
        };
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next.transferReceipt;
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "截圖讀取失敗，請重新選擇圖片");
      e.target.value = "";
    }
  };

  const clearTransferReceipt = () => {
    if (transferReceipt?.previewUrl) URL.revokeObjectURL(transferReceipt.previewUrl);
    setTransferReceipt(null);
    if (transferReceiptInputRef.current) transferReceiptInputRef.current.value = "";
  };

  useEffect(() => () => {
    if (transferReceipt?.previewUrl) URL.revokeObjectURL(transferReceipt.previewUrl);
  }, [transferReceipt?.previewUrl]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[oklch(0.1_0_0)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-body text-[oklch(0.5_0_0)]">載入尾款資訊中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-xl mb-2" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
          找不到尾款連結
        </p>
        <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-8">請確認連結是否正確，或聯繫客服協助。</p>
        <button className="btn-primary" onClick={() => setLocation("/products")}>
          返回商品頁
        </button>
      </div>
    );
  }

  const isPaid = data.paymentStatus === "paid";
  const isTransferPending = data.paymentStatus === "transfer_pending";
  const showPaymentChoice = !isPaid && !isTransferPending && !startCheckout.isSuccess;
  const overseasCode = isOverseasShipCountryCode(form.intlCountry) ? form.intlCountry : null;
  const feeSummary = calcCheckoutFees({
    items: [{ id: "custom-balance-payment", name: "客製化商品尾款", price: data.amount, quantity: 1 }],
    checkoutRegion,
    shippingMethod,
    paymentMethod,
    overseasCountry: overseasCode,
    buyerEmail: data.order.buyerEmail,
  });
  const payableAmount = feeSummary.total;

  const inputClass = (field: string) =>
    `w-full border px-4 py-3 text-sm font-body focus:outline-none transition-colors ${
      errors[field]
        ? "border-red-400 focus:border-red-500"
        : "border-[oklch(0.88_0_0)] focus:border-[oklch(0.1_0_0)]"
    }`;

  const setRegion = (region: CheckoutRegion) => {
    setCheckoutRegion(region);
    setErrors({});
    if (region === "overseas") {
      setShippingMethod("home");
      setCvsStore(null);
    }
  };

  const validateShipping = () => {
    const nextErrors: Record<string, string> = {};
    if (checkoutRegion === "domestic") {
      if (shippingMethod === "cvs_711" && !cvsStore) nextErrors.cvsStore = "請選擇超商門市";
      if (shippingMethod === "home") {
        if (!form.shippingZip.trim() || !/^\d{3,6}$/.test(form.shippingZip)) nextErrors.shippingZip = "請輸入有效郵遞區號";
        if (!form.shippingCity.trim()) nextErrors.shippingCity = "請輸入縣市";
        if (!form.shippingDistrict.trim()) nextErrors.shippingDistrict = "請輸入鄉鎮市區";
        if (!form.shippingDetail.trim()) nextErrors.shippingDetail = "請輸入詳細地址（路名門牌）";
      }
    } else {
      for (const it of validateOverseasAddress({
        intlCountry: form.intlCountry,
        intlAddrLine1: form.intlAddrLine1,
        intlAddrLine2: form.intlAddrLine2,
        intlCity: form.intlCity,
        intlState: form.intlState,
        intlPostalCode: form.intlPostalCode,
      })) {
        nextErrors[it.path as string] = it.message;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // 同分頁整頁跳轉去綠界選店（取代彈出視窗），桌機/手機/LINE 內建瀏覽器都能用。
  // 跳轉前暫存表單，選完門市由 cvs-map-reply 302 導回本頁（?to= 帶本頁路徑）後還原。
  const handleSelectCvsStore = () => {
    try {
      sessionStorage.setItem(
        BALANCE_FORM_KEY,
        JSON.stringify({ paymentMethod, checkoutRegion, shippingMethod, form })
      );
    } catch {
      /* 暫存失敗仍可繼續 */
    }
    const tradeNo = `MAP${Date.now()}`;
    const clientReturn = encodeURIComponent(window.location.pathname);
    const mapURL = `/api/ecpay/cvs-map?tradeNo=${encodeURIComponent(tradeNo)}&subType=UNIMARTC2C&clientReturn=${clientReturn}`;
    window.location.href = mapURL;
  };

  const startBalanceCheckout = () => {
    if (!validateShipping()) return;

    startCheckout.mutate({
      merchantTradeNo: data.merchantTradeNo,
      paymentMethod,
      checkoutRegion,
      shippingMethod: checkoutRegion === "overseas" ? "home" : shippingMethod,
      cvsStoreId: checkoutRegion === "domestic" ? cvsStore?.storeId : undefined,
      cvsStoreName: checkoutRegion === "domestic" ? cvsStore?.storeName : undefined,
      cvsType: checkoutRegion === "domestic" ? cvsStore?.cvsType : undefined,
      shippingAddress:
        checkoutRegion === "domestic" && shippingMethod === "home"
          ? `${form.shippingCity}${form.shippingDistrict}${form.shippingDetail}`
          : undefined,
      receiverZipCode: checkoutRegion === "domestic" && shippingMethod === "home" ? form.shippingZip : undefined,
      intlCountry: checkoutRegion === "overseas" ? form.intlCountry : undefined,
      intlAddrLine1: checkoutRegion === "overseas" ? form.intlAddrLine1 : undefined,
      intlAddrLine2: checkoutRegion === "overseas" ? form.intlAddrLine2 : undefined,
      intlCity: checkoutRegion === "overseas" ? form.intlCity : undefined,
      intlState: checkoutRegion === "overseas" ? form.intlState : undefined,
      intlPostalCode: checkoutRegion === "overseas" ? form.intlPostalCode : undefined,
      origin: window.location.origin,
    });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_60)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
        {!isPaid && (
          <div className="mb-6 empty:hidden">
            <InAppBrowserWarning />
          </div>
        )}
        <div className="bg-white border border-[oklch(0.93_0_0)] p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            {isPaid ? (
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            ) : isTransferPending ? (
              <Banknote className="w-14 h-14 text-blue-500 mx-auto mb-4" />
            ) : (
              <CreditCard className="w-14 h-14 text-rose-500 mx-auto mb-4" />
            )}
            <p className="text-xs tracking-[0.16em] text-[oklch(0.5_0_0)] font-body mb-2">客製化尾款</p>
            <h1 className="text-2xl text-[oklch(0.12_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              {isPaid ? "尾款已完成付款" : isTransferPending ? "等待轉帳確認" : "請完成客製化尾款"}
            </h1>
            <p className="text-sm font-body text-[oklch(0.5_0_0)] mt-3">
              {isPaid
                ? "感謝您的付款，訂單已轉為已付款並會進入出貨流程。"
                : isTransferPending
                ? "老闆確認收款後將更新訂單狀態，請耐心等候。"
                : "這是老闆為您的客製化訂單產生的尾款付款連結。"}
            </p>
          </div>

          {/* 訂單摘要 */}
          <div className="space-y-3 border border-[oklch(0.93_0_0)] bg-[oklch(0.99_0_0)] p-5 mb-6">
            <div className="flex justify-between gap-4 text-sm font-body">
              <span className="text-[oklch(0.5_0_0)]">原始訂單編號</span>
              <span className="text-[oklch(0.12_0_0)] font-mono">{data.order.merchantTradeNo}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm font-body">
              <span className="text-[oklch(0.5_0_0)]">顧客姓名</span>
              <span className="text-[oklch(0.12_0_0)]">{data.order.buyerName}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm font-body">
              <span className="text-[oklch(0.5_0_0)]">尾款小計</span>
              <span className="text-[oklch(0.12_0_0)] font-medium">NT$ {data.amount.toLocaleString()}</span>
            </div>
            {!isPaid && !isTransferPending && (
              <>
                <div className="flex justify-between gap-4 text-sm font-body">
                  <span className="text-[oklch(0.5_0_0)]">運費</span>
                  <span className="text-[oklch(0.12_0_0)]">NT$ {feeSummary.shippingFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm font-body border-t border-[oklch(0.9_0_0)] pt-3">
                  <span className="text-[oklch(0.12_0_0)] font-medium">應付總額</span>
                  <span className="text-[oklch(0.12_0_0)] font-semibold">NT$ {payableAmount.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4 text-sm font-body">
              <span className="text-[oklch(0.5_0_0)]">目前狀態</span>
              <span className={
                isPaid ? "text-green-600 font-medium"
                : isTransferPending ? "text-blue-600 font-medium"
                : data.paymentStatus === "failed" ? "text-red-600 font-medium"
                : "text-rose-600 font-medium"
              }>
                {isPaid ? "已付款"
                  : isTransferPending ? "⏳ 轉帳待確認"
                  : data.paymentStatus === "failed" ? "付款失敗"
                  : "待付款"}
              </span>
            </div>
          </div>

          {/* 選擇付款方式 */}
          {showPaymentChoice && (
            <>
              <p className="text-xs tracking-widest font-body text-[oklch(0.4_0_0)] mb-3">選擇配送地區</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => setRegion("domestic")}
                  className={`flex items-start gap-3 p-4 border text-left transition-all ${
                    checkoutRegion === "domestic"
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)]"
                      : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.7_0_0)]"
                  }`}
                >
                  <Home className="w-5 h-5 mt-0.5 shrink-0 text-[oklch(0.3_0_0)]" />
                  <div>
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">台灣（國內）</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">宅配或 7-11 取貨</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRegion("overseas")}
                  className={`flex items-start gap-3 p-4 border text-left transition-all ${
                    checkoutRegion === "overseas"
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)]"
                      : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.7_0_0)]"
                  }`}
                >
                  <Globe className="w-5 h-5 mt-0.5 shrink-0 text-[oklch(0.3_0_0)]" />
                  <div>
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">海外</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">國際宅配</p>
                  </div>
                </button>
              </div>

              <p className="text-xs tracking-widest font-body text-[oklch(0.4_0_0)] mb-3">選擇配送方式</p>
              {checkoutRegion === "domestic" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {[
                      { key: "home" as ShippingMethod, icon: <Home className="w-5 h-5" />, title: "宅配到府", desc: "黑貓宅急便（NT$ 100）" },
                      { key: "cvs_711" as ShippingMethod, icon: <Store className="w-5 h-5" />, title: "7-11 取貨", desc: "超商取貨（NT$ 60）" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => { setShippingMethod(opt.key); setCvsStore(null); setErrors({}); }}
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
                      </button>
                    ))}
                  </div>

                  {shippingMethod === "cvs_711" ? (
                    <div className="mb-5">
                      {cvsStore ? (
                        <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-body text-green-800">
                              已選擇：{cvsStore.storeName}（門市代號：{cvsStore.storeId}）
                            </span>
                          </div>
                          <button type="button" onClick={() => setCvsStore(null)} className="text-xs font-body text-green-600 underline">
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
                  ) : (
                    <div className="mb-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            placeholder="郵遞區號"
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
                            placeholder="縣市"
                            value={form.shippingCity}
                            onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))}
                            className={inputClass("shippingCity")}
                          />
                          {errors.shippingCity && <p className="text-xs text-red-400 mt-1">{errors.shippingCity}</p>}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="鄉鎮市區"
                        value={form.shippingDistrict}
                        onChange={(e) => setForm((f) => ({ ...f, shippingDistrict: e.target.value }))}
                        className={inputClass("shippingDistrict")}
                      />
                      {errors.shippingDistrict && <p className="text-xs text-red-400 mt-1">{errors.shippingDistrict}</p>}
                      <input
                        type="text"
                        placeholder="路名、門牌、樓層"
                        value={form.shippingDetail}
                        onChange={(e) => setForm((f) => ({ ...f, shippingDetail: e.target.value }))}
                        className={inputClass("shippingDetail")}
                      />
                      {errors.shippingDetail && <p className="text-xs text-red-400 mt-1">{errors.shippingDetail}</p>}
                    </div>
                  )}
                </>
              ) : (
                <div className="mb-5 space-y-3">
                  <select
                    value={form.intlCountry}
                    onChange={(e) => setForm((f) => ({ ...f, intlCountry: e.target.value, intlState: "", intlPostalCode: "" }))}
                    className={inputClass("intlCountry")}
                  >
                    <option value="">Select country</option>
                    {OVERSEAS_SHIP_COUNTRY_OPTIONS.map(({ code }) => (
                      <option key={code} value={code}>
                        {OVERSEAS_COUNTRY_EN[code]} ({OVERSEAS_SHIP_COUNTRY_LABELS[code]}) NT$ {OVERSEAS_SHIPPING_FEES[code]}
                      </option>
                    ))}
                  </select>
                  {errors.intlCountry && <p className="text-xs text-red-400 mt-1">{errors.intlCountry}</p>}
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={form.intlAddrLine1}
                    onChange={(e) => setForm((f) => ({ ...f, intlAddrLine1: e.target.value }))}
                    className={inputClass("intlAddrLine1")}
                  />
                  {errors.intlAddrLine1 && <p className="text-xs text-red-400 mt-1">{errors.intlAddrLine1}</p>}
                  <input
                    type="text"
                    placeholder="Address Line 2 (optional)"
                    value={form.intlAddrLine2}
                    onChange={(e) => setForm((f) => ({ ...f, intlAddrLine2: e.target.value }))}
                    className={inputClass("intlAddrLine2")}
                  />
                  {errors.intlAddrLine2 && <p className="text-xs text-red-400 mt-1">{errors.intlAddrLine2}</p>}
                  <input
                    type="text"
                    placeholder="City"
                    value={form.intlCity}
                    onChange={(e) => setForm((f) => ({ ...f, intlCity: e.target.value }))}
                    className={inputClass("intlCity")}
                  />
                  {errors.intlCity && <p className="text-xs text-red-400 mt-1">{errors.intlCity}</p>}
                  {overseasCode === "US" ? (
                    <select
                      value={form.intlState}
                      onChange={(e) => setForm((f) => ({ ...f, intlState: e.target.value }))}
                      className={inputClass("intlState")}
                    >
                      <option value="">Select state</option>
                      {US_STATE_OPTIONS.map((s) => (
                        <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  ) : overseasCode === "AU" ? (
                    <select
                      value={form.intlState}
                      onChange={(e) => setForm((f) => ({ ...f, intlState: e.target.value }))}
                      className={inputClass("intlState")}
                    >
                      <option value="">Select state / territory</option>
                      {AU_STATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="State / province (if applicable)"
                      value={form.intlState}
                      onChange={(e) => setForm((f) => ({ ...f, intlState: e.target.value }))}
                      className={inputClass("intlState")}
                    />
                  )}
                  {errors.intlState && <p className="text-xs text-red-400 mt-1">{errors.intlState}</p>}
                  <input
                    type="text"
                    placeholder={!overseasCode || overseasPostalRequired(overseasCode) ? "Postal code" : "Postal code (optional)"}
                    value={form.intlPostalCode}
                    onChange={(e) => setForm((f) => ({ ...f, intlPostalCode: e.target.value }))}
                    className={inputClass("intlPostalCode")}
                  />
                  {errors.intlPostalCode && <p className="text-xs text-red-400 mt-1">{errors.intlPostalCode}</p>}
                </div>
              )}

              <p className="text-xs tracking-widest font-body text-[oklch(0.4_0_0)] mb-3">選擇付款方式</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
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
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">信用卡</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">即時扣款</p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                    paymentMethod === "credit" ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.8_0_0)]"
                  }`}>
                    {paymentMethod === "credit" && <div className="w-2 h-2 rounded-full bg-[oklch(0.1_0_0)]" />}
                  </div>
                </button>
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
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">轉帳</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">匯款後填末五碼</p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                    paymentMethod === "atm" ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.8_0_0)]"
                  }`}>
                    {paymentMethod === "atm" && <div className="w-2 h-2 rounded-full bg-[oklch(0.1_0_0)]" />}
                  </div>
                </button>
              </div>

              <button
                onClick={startBalanceCheckout}
                disabled={startCheckout.isPending}
                className="w-full bg-[oklch(0.12_0_0)] text-white py-3.5 text-sm font-body hover:bg-[oklch(0.22_0_0)] transition-colors disabled:opacity-60"
              >
                {startCheckout.isPending
                  ? "處理中..."
                  : paymentMethod === "credit" ? "前往信用卡付款" : "確認使用轉帳"}
              </button>
            </>
          )}

          {/* 轉帳資訊（選完轉帳後顯示） */}
          {(isTransferPending || (startCheckout.isSuccess && startCheckout.data?.kind === "atm")) && (
            <div className="border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <Banknote className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="text-sm font-body font-medium text-blue-800 mb-3">轉帳資訊</p>
                  {(() => {
                    const bankInfo = startCheckout.data?.kind === "atm"
                      ? { ...STORE_BANK_INFO, ...startCheckout.data.bankInfo }
                      : STORE_BANK_INFO;
                    return bankInfo ? (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm font-body">
                          <span className="text-blue-700">銀行</span>
                          <span className="font-medium text-blue-900">{bankInfo.bankName}</span>
                        </div>
                        {bankInfo.accountName && (
                          <div className="flex justify-between text-sm font-body">
                            <span className="text-blue-700">戶名</span>
                            <span className="font-medium text-blue-900">{bankInfo.accountName}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-body">
                          <span className="text-blue-700">帳號</span>
                          <span className="font-medium text-blue-900 tracking-wider">{bankInfo.accountNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm font-body border-t border-blue-200 pt-2">
                          <span className="text-blue-700">轉帳金額</span>
                          <span className="font-bold text-blue-900">
                            NT$ {(startCheckout.data?.kind === "atm" ? startCheckout.data.amount : payableAmount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {!codeSubmitted && !data.transferLastFive ? (
                    <div>
                      <p className="text-xs font-body text-blue-700 mb-2">轉帳完成後，請填入匯款末五碼：</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={5}
                          value={transferCode}
                          onChange={(e) => setTransferCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="12345"
                          className="flex-1 border border-blue-300 bg-white px-3 py-2 text-sm font-body text-center tracking-widest focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={handleSubmitCode}
                          disabled={submitCode.isPending}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          {submitCode.isPending ? "送出中..." : "確認送出"}
                        </button>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs tracking-[0.16em] font-body text-blue-800 mb-2">轉帳成功截圖</p>
                        {transferReceipt ? (
                          <div className="flex items-center gap-3 border border-blue-200 bg-white p-3">
                            <img
                              src={transferReceipt.previewUrl}
                              alt="轉帳成功截圖預覽"
                              className="w-20 h-20 object-cover border border-blue-100"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-body text-blue-900 truncate">{transferReceipt.filename}</p>
                              <p className="text-xs font-body text-blue-700 mt-1">已選擇截圖</p>
                            </div>
                            <button
                              type="button"
                              onClick={clearTransferReceipt}
                              className="p-2 text-blue-700 hover:text-blue-900"
                              aria-label="移除轉帳截圖"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => transferReceiptInputRef.current?.click()}
                            className="w-full border border-dashed border-blue-300 bg-white px-4 py-4 text-sm font-body text-blue-800 flex items-center justify-center gap-2 hover:border-blue-500 transition-colors"
                          >
                            <ImageUp className="w-4 h-4" />
                            上傳轉帳成功截圖
                          </button>
                        )}
                        <input
                          ref={transferReceiptInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleTransferReceiptChange}
                        />
                        {errors.transferReceipt && <p className="text-xs text-red-400 mt-1">{errors.transferReceipt}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-body text-blue-700 bg-blue-100 px-3 py-2 text-center">
                      ✅ 已收到您的匯款末五碼：<strong>{data.transferLastFive}</strong>，老闆確認後將更新訂單狀態。
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
