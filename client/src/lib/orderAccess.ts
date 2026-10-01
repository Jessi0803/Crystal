const ORDER_ACCESS_PREFIX = "crystal-order-access:";

export type SavedOrderAccess = {
  accessToken?: string;
  buyerEmail?: string;
};

export function saveOrderAccess(
  merchantTradeNo: string,
  accessToken?: string,
  buyerEmail?: string
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${ORDER_ACCESS_PREFIX}${merchantTradeNo}`,
      JSON.stringify({ accessToken, buyerEmail } satisfies SavedOrderAccess)
    );
  } catch {
    // Safari 私密模式或停用儲存時，仍讓付款流程繼續；返回頁可改用 Email 驗證。
  }
}

export function getSavedOrderAccess(merchantTradeNo?: string): SavedOrderAccess {
  if (!merchantTradeNo || typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(`${ORDER_ACCESS_PREFIX}${merchantTradeNo}`) || "{}") as SavedOrderAccess;
    return {
      accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : undefined,
      buyerEmail: typeof parsed.buyerEmail === "string" ? parsed.buyerEmail : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * 補上存取憑證但保留已有的欄位。
 *
 * 會員中心要把訂購 Email 帶給表單頁（訪客單靠 Email 比對才過得了 hasOrderAccess），
 * 但不能因此洗掉結帳當下存下來的 accessToken，所以這裡用合併而不是覆蓋。
 */
export function rememberOrderAccess(merchantTradeNo: string, patch: SavedOrderAccess) {
  if (!merchantTradeNo) return;
  const saved = getSavedOrderAccess(merchantTradeNo);
  saveOrderAccess(
    merchantTradeNo,
    patch.accessToken ?? saved.accessToken,
    patch.buyerEmail ?? saved.buyerEmail
  );
}
