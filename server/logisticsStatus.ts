/**
 * 綠界物流貨態 → 系統物流狀態／訂單狀態
 * 代碼依綠界「物流貨態代碼對照表」：超商（7-11、全家）與黑貓宅配分開判斷，
 * 因為同一個代碼在不同物流商代表不同意思（例如 3003 在黑貓是「配完」）。
 */
export type LogisticsStatus = "created" | "in_transit" | "arrived" | "picked_up" | "returned" | "failed";

/** 需要通知管理員人工確認的物流異常（遺失、損壞、託運單刪除、賣家逾期未出貨） */
export type LogisticsStatusResult =
  | { kind: "status"; status: LogisticsStatus; needsAttention?: boolean }
  /** 撤銷先前狀態的代碼（例如「配完狀態刪除」）：只記錄，不改任何狀態 */
  | { kind: "record_only" };

const TCAT_DELIVERED = new Set(["3003"]);
const TCAT_RETURNED = new Set(["5004", "5005", "5008"]);
const TCAT_NEEDS_ATTENTION = new Set(["5001", "5002", "5006", "5007", "7005"]);
const TCAT_REVERSALS = new Set(["3016", "3017"]);

const CVS_EXPIRED = new Set(["7013"]);
const UNIMART_ARRIVED = new Set(["2063", "2073", "2098"]);
const FAMI_ARRIVED = new Set(["3018"]);

function status(value: LogisticsStatus, needsAttention = false): LogisticsStatusResult {
  return needsAttention ? { kind: "status", status: value, needsAttention } : { kind: "status", status: value };
}

/** 例如 "TCAT"、"HOME"、"HOME_TCAT" */
export function isHomeDelivery(logisticsType: string) {
  return logisticsType
    .toUpperCase()
    .split(/[\s_]+/)
    .some((token) => token === "HOME" || token === "TCAT");
}

export function classifyECPayLogisticsStatus(data: {
  RtnCode?: string;
  LogisticsSubType?: string;
  LogisticsType?: string;
}): LogisticsStatusResult {
  const rtnCode = data.RtnCode ?? "";
  const logisticsType = `${data.LogisticsSubType ?? ""} ${data.LogisticsType ?? ""}`.toUpperCase();

  if (isHomeDelivery(logisticsType)) {
    if (TCAT_DELIVERED.has(rtnCode)) return status("picked_up");
    if (TCAT_RETURNED.has(rtnCode)) return status("returned");
    if (TCAT_NEEDS_ATTENTION.has(rtnCode)) return status("failed", true);
    if (TCAT_REVERSALS.has(rtnCode)) return { kind: "record_only" };
    // 不在家、另約時間、送錯營業所等皆屬配送過程
    return status("in_transit");
  }

  if (CVS_EXPIRED.has(rtnCode)) return status("failed", true);

  if (logisticsType.includes("UNIMART")) {
    if (UNIMART_ARRIVED.has(rtnCode)) return status("arrived");
    if (rtnCode === "2067") return status("picked_up");
    if (rtnCode === "2074") return status("returned");
    return status("in_transit");
  }

  if (logisticsType.includes("FAMI")) {
    if (FAMI_ARRIVED.has(rtnCode)) return status("arrived");
    if (rtnCode === "3022") return status("picked_up");
    if (rtnCode === "3020") return status("returned");
    return status("in_transit");
  }

  // 未帶物流商時沿用既有的超商代碼判斷
  if (rtnCode === "3018" || rtnCode === "2073" || rtnCode === "2063") return status("arrived");
  if (rtnCode === "3022" || rtnCode === "2067") return status("picked_up");
  if (rtnCode === "3020" || rtnCode === "2074" || rtnCode === "3028") return status("returned");
  return status("in_transit");
}

/**
 * 物流狀態只能往前推進；回呼可能延遲或重複送達，舊的狀態不可覆蓋新的狀態。
 * 物流異常（failed）之後仍可能補送「已取貨／已退回」。
 */
export const LOGISTICS_STATUS_ALLOWED_FROM: Record<LogisticsStatus, LogisticsStatus[]> = {
  created: [],
  in_transit: ["created"],
  arrived: ["created", "in_transit"],
  picked_up: ["created", "in_transit", "arrived", "failed"],
  returned: ["created", "in_transit", "arrived", "failed"],
  failed: ["created", "in_transit", "arrived"],
};

export type SyncedOrderStatus = "arrived" | "picked_up" | "not_picked";

/** 物流狀態要同步到的訂單狀態；其他物流狀態不改訂單 */
export function orderStatusForLogistics(value: LogisticsStatus): SyncedOrderStatus | null {
  if (value === "arrived") return "arrived";
  if (value === "picked_up") return "picked_up";
  if (value === "returned") return "not_picked";
  return null;
}

/**
 * 訂單狀態同步只往前推進，且不動已完成、已取消等由管理員決定的狀態。
 */
export const ORDER_STATUS_ALLOWED_FROM: Record<SyncedOrderStatus, string[]> = {
  arrived: ["paid", "processing", "shipped"],
  picked_up: ["paid", "processing", "shipped", "arrived"],
  not_picked: ["paid", "processing", "shipped", "arrived"],
};

/** 綠界 UpdateStatusDate（台灣時間，例如 2026/09/17 14:05:33）；無法解析時回傳 null */
export function parseECPayStatusDate(value?: string | null) {
  const match = value?.trim().match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
