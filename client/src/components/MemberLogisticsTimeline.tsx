import { AlertTriangle, Check, PackageCheck, Store, Truck } from "lucide-react";

type LogisticsEvent = {
  normalizedStatus?: string | null;
  occurredAt?: string | Date | null;
};

type MemberOrderForLogistics = {
  shippingMethod: string;
  orderStatus: string;
  logistics?: {
    logisticsStatus?: string | null;
    logisticsSubType?: string | null;
    allPayLogisticsId?: string | null;
    logisticsMerchantTradeNo?: string | null;
    bookingNote?: string | null;
    cvsPaymentNo?: string | null;
    cvsValidationNo?: string | null;
    createdAt?: string | Date | null;
    arrivedAt?: string | Date | null;
    pickedUpAt?: string | Date | null;
    updatedAt?: string | Date | null;
    events?: LogisticsEvent[];
  } | null;
};

type Stage = {
  key: string;
  label: string;
  helper: string;
  date?: string | Date | null;
};

const STATUS_RANK: Record<string, number> = {
  created: 0,
  in_transit: 1,
  arrived: 2,
  picked_up: 3,
};

function formatDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function eventDate(order: MemberOrderForLogistics, status: string) {
  const events = order.logistics?.events ?? [];
  return events
    .filter((event) => event.normalizedStatus === status && event.occurredAt)
    .map((event) => event.occurredAt)
    .sort((a, b) => new Date(String(a)).getTime() - new Date(String(b)).getTime())[0];
}

function currentStatus(order: MemberOrderForLogistics) {
  const logisticsStatus = order.logistics?.logisticsStatus;
  if (logisticsStatus && logisticsStatus in STATUS_RANK) return logisticsStatus;
  if (order.orderStatus === "arrived") return "arrived";
  if (order.orderStatus === "picked_up" || order.orderStatus === "completed") return "picked_up";
  if (order.orderStatus === "shipped") return "in_transit";
  return "created";
}

function carrierLabel(order: MemberOrderForLogistics) {
  return order.shippingMethod === "cvs_711" ? "7-ELEVEN 交貨便" : "黑貓宅急便";
}

function trackingLabel(order: MemberOrderForLogistics) {
  const logistics = order.logistics;
  if (!logistics) return null;
  if (order.shippingMethod === "cvs_711" && logistics.cvsPaymentNo) {
    return logistics.cvsValidationNo
      ? `${logistics.cvsPaymentNo}${logistics.cvsValidationNo}`
      : logistics.cvsPaymentNo;
  }
  return logistics.bookingNote || logistics.allPayLogisticsId || logistics.logisticsMerchantTradeNo || null;
}

export default function MemberLogisticsTimeline({ order }: { order: MemberOrderForLogistics }) {
  if (!order.logistics) return null;

  const isCvs = order.shippingMethod === "cvs_711";
  const status = currentStatus(order);
  const currentRank = STATUS_RANK[status] ?? 0;
  const stages: Stage[] = isCvs
    ? [
        {
          key: "created",
          label: "已建立配送",
          helper: "店家已建立交貨便資料",
          date: eventDate(order, "created") || order.logistics.createdAt,
        },
        {
          key: "in_transit",
          label: "配送中",
          helper: "包裹已進入物流配送流程",
          date: eventDate(order, "in_transit"),
        },
        {
          key: "arrived",
          label: "已到店，等待取貨",
          helper: "請留意超商取貨通知",
          date: eventDate(order, "arrived") || order.logistics.arrivedAt,
        },
        {
          key: "picked_up",
          label: "已取貨",
          helper: "包裹已完成取件",
          date: eventDate(order, "picked_up") || order.logistics.pickedUpAt,
        },
      ]
    : [
        {
          key: "created",
          label: "已建立配送",
          helper: "店家已建立宅配資料",
          date: eventDate(order, "created") || order.logistics.createdAt,
        },
        {
          key: "in_transit",
          label: "配送中",
          helper: "黑貓正在配送您的包裹",
          date: eventDate(order, "in_transit"),
        },
        {
          key: "picked_up",
          label: "已送達",
          helper: "包裹已完成配送",
          date: eventDate(order, "picked_up") || order.logistics.pickedUpAt,
        },
      ];

  const isException = ["failed", "returned"].includes(order.logistics.logisticsStatus ?? "");
  const activeLabel = isException
    ? order.logistics.logisticsStatus === "returned"
      ? "包裹退回處理中"
      : "配送狀況確認中"
    : stages[Math.min(currentRank, stages.length - 1)]?.label;
  const lastUpdated = formatDate(
    order.logistics.pickedUpAt || order.logistics.arrivedAt || order.logistics.updatedAt || order.logistics.createdAt,
  );
  const tracking = trackingLabel(order);

  return (
    <section
      aria-label="物流進度"
      className="border-t border-sf-line py-5"
      data-testid="member-logistics-timeline"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[0.68rem] tracking-[0.14em] text-sf-muted">
            <Truck className="h-3.5 w-3.5 text-sf-accent" />
            <span>{carrierLabel(order)}</span>
          </div>
          <p className="text-sm font-medium tracking-[0.04em] text-sf-ink">{activeLabel}</p>
          {lastUpdated && <p className="mt-1 text-[0.65rem] text-sf-muted">最後更新 {lastUpdated}</p>}
        </div>
        {tracking && (
          <div className="border border-sf-line bg-white px-3 py-2 sm:text-right">
            <p className="text-[0.6rem] tracking-[0.12em] text-sf-muted">
              {isCvs ? "交貨便代碼" : "物流編號"}
            </p>
            <p className="mt-0.5 font-mono text-xs tracking-[0.08em] text-sf-text">{tracking}</p>
          </div>
        )}
      </div>

      {isException && (
        <div className="mb-5 flex gap-2 border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>目前配送狀況需要確認，請透過官方 LINE 聯繫我們協助處理。</p>
        </div>
      )}

      <ol
        className={`relative ml-2 border-l border-sf-line-strong pl-6 sm:ml-0 sm:grid sm:border-l-0 sm:pl-0 ${
          isCvs ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {stages.map((stage, index) => {
          const rank = STATUS_RANK[stage.key] ?? index;
          const isComplete = !isException && rank < currentRank;
          const isActive = !isException && rank === currentRank;
          const stageDate = formatDate(stage.date);
          return (
            <li key={stage.key} className="relative pb-6 last:pb-0 sm:pb-0 sm:text-center">
              {index < stages.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute hidden h-px sm:block ${isComplete ? "bg-sf-accent" : "bg-sf-line-strong"}`}
                  style={{ left: "50%", right: "-50%", top: "11px" }}
                />
              )}
              <span
                className={`absolute -left-[2.08rem] top-0 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border sm:relative sm:left-auto sm:mx-auto ${
                  isComplete
                    ? "border-sf-accent bg-sf-accent text-white"
                    : isActive
                      ? "border-sf-accent bg-white text-sf-accent shadow-[0_0_0_4px_rgb(218_188_177/0.18)]"
                      : "border-sf-line-strong bg-sf-cream text-sf-muted"
                }`}
              >
                {isComplete ? (
                  <Check className="h-3 w-3" />
                ) : stage.key === "arrived" ? (
                  <Store className="h-3 w-3" />
                ) : stage.key === "picked_up" ? (
                  <PackageCheck className="h-3 w-3" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <div className="mt-0 sm:mt-3 sm:px-2">
                <p className={`text-xs ${isActive ? "font-medium text-sf-ink" : "text-sf-text"}`}>{stage.label}</p>
                <p className="mt-1 text-[0.62rem] leading-relaxed text-sf-muted">{stage.helper}</p>
                {stageDate && <p className="mt-1 text-[0.6rem] text-sf-muted">{stageDate}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
