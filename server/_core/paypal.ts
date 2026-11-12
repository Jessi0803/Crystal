/**
 * PayPal REST：建立 Checkout 訂單、Capture（無 SDK，使用 fetch）
 * 環境變數：PAYPAL_CLIENT_ID、PAYPAL_CLIENT_SECRET；PAYPAL_SANDBOX=1 使用沙盒
 */

function getApiBase(): string {
  if (process.env.PAYPAL_SANDBOX === "1") {
    return "https://api-m.sandbox.paypal.com";
  }
  return "https://api-m.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("PAYPAL_CREDENTIALS_MISSING");
  }
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${getApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? `PayPal token HTTP ${res.status}`);
  }
  return data.access_token;
}

export type PayPalCreateOrderResult = {
  paypalOrderId: string;
  approvalUrl: string;
};

export async function createPayPalCheckoutOrder(params: {
  merchantTradeNo: string;
  totalAmountTwd: number;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PayPalCreateOrderResult> {
  const token = await getAccessToken();
  const value = String(Math.max(1, Math.round(params.totalAmountTwd)));
  const res = await fetch(`${getApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": params.merchantTradeNo,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.merchantTradeNo,
          custom_id: params.merchantTradeNo,
          description: "椛Crystal能量水晶",
          amount: {
            currency_code: "TWD",
            value,
          },
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });
  const data = (await res.json()) as {
    id?: string;
    links?: { href: string; rel: string }[];
    message?: string;
  };
  if (!res.ok || !data.id) {
    throw new Error(data.message ?? `PayPal create order HTTP ${res.status}`);
  }
  const approval = data.links?.find((l) => l.rel === "approve")?.href;
  if (!approval) {
    throw new Error("PayPal create order: missing approve link");
  }
  return { paypalOrderId: data.id, approvalUrl: approval };
}

type PayPalOrderDetails = Record<string, unknown> & {
  status?: string;
  links?: { href: string; rel: string }[];
  purchase_units?: {
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: { id?: string; status?: string }[] };
  }[];
  message?: string;
};

export async function getPayPalOrderDetails(
  paypalOrderId: string,
  merchantTradeNo: string,
  totalAmountTwd?: number
): Promise<PayPalOrderDetails> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json()) as PayPalOrderDetails;
  if (!res.ok) {
    throw new Error(data.message ?? `PayPal get order HTTP ${res.status}`);
  }
  const unit = data.purchase_units?.[0];
  if (unit?.custom_id !== merchantTradeNo || (totalAmountTwd !== undefined &&
      (unit.amount?.currency_code !== "TWD" || Number(unit.amount.value) !== totalAmountTwd))) {
    throw new Error("PAYPAL_ORDER_MISMATCH");
  }
  return data;
}

export async function verifyPayPalOrderBelongsToMerchant(
  paypalOrderId: string,
  merchantTradeNo: string
): Promise<void> {
  await getPayPalOrderDetails(paypalOrderId, merchantTradeNo);
}

export function getCompletedPayPalCapture(details: PayPalOrderDetails) {
  return details.purchase_units?.[0]?.payments?.captures?.find(
    capture => capture.status === "COMPLETED" && capture.id
  )?.id;
}

export type PayPalCaptureResult =
  | { status: "completed"; captureId: string; raw: Record<string, unknown> }
  | { status: "failed"; message: string; raw?: Record<string, unknown> };

export async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalCaptureResult> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `capture-${paypalOrderId}`,
    },
    body: "{}",
    signal: AbortSignal.timeout(8000),
  });
  const raw = (await res.json()) as Record<string, unknown> & {
    status?: string;
    message?: string;
    purchase_units?: { payments?: { captures?: { id?: string; status?: string }[] } }[];
  };

  if (!res.ok) {
    return {
      status: "failed",
      message: (raw.message as string) ?? `PayPal capture HTTP ${res.status}`,
      raw,
    };
  }

  const capture = raw.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = capture?.id;
  const capStatus = capture?.status;

  if (capStatus === "COMPLETED" && captureId) {
    return { status: "completed", captureId, raw };
  }

  return {
    status: "failed",
    message: capStatus ? `Capture status: ${capStatus}` : "PayPal capture incomplete",
    raw,
  };
}
