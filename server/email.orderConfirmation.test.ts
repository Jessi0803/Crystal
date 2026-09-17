import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: { send: sendMock },
  })),
}));

vi.mock("./_core/env", () => ({
  ENV: { resendApiKey: "re_test_key" },
}));

import { sendOrderConfirmEmail } from "./email";

describe("order confirmation email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
    process.env.SITE_URL = "https://goodaytarot.com/";
  });

  it("includes a safe order page button and a copyable fallback URL", async () => {
    await sendOrderConfirmEmail({
      to: "guest@example.com",
      buyerName: "訪客",
      merchantTradeNo: "ORDER /?#1",
      totalAmount: 1680,
      shippingMethod: "home",
      paymentMethod: "credit",
      receiverAddress: "台北市測試路 1 號",
      items: [
        {
          productName: "能量手鍊",
          quantity: 1,
          unitPrice: 1680,
          subtotal: 1680,
        },
      ],
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const message = sendMock.mock.calls[0]?.[0] as { html: string };
    const expectedUrl = "https://goodaytarot.com/order/ORDER%20%2F%3F%231";
    expect(message.html).toContain(">\n                    查看訂單\n");
    expect(message.html).toContain(`href="${expectedUrl}"`);
    expect(message.html).toContain(expectedUrl);
    expect(message.html).toContain("輸入訂購時使用的 Email 進行驗證");
  });
});
