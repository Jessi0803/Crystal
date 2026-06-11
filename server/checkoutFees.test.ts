import { describe, expect, it } from "vitest";
import { calcCheckoutFees } from "@shared/checkoutFees";
import { CUSTOM_PRODUCT_ID } from "@shared/const";

describe("checkout fee calculation", () => {
  it("adds domestic home shipping without payment fee for normal products", () => {
    const fees = calcCheckoutFees({
      items: [{ id: "d001-moon-secret", name: "月下密語手鍊", price: 1480, quantity: 1 }],
      checkoutRegion: "domestic",
      shippingMethod: "home",
      paymentMethod: "credit",
    });

    expect(fees.shippingFee).toBe(100);
    expect(fees.paymentFee).toBe(0);
    expect(fees.total).toBe(1580);
  });

  it("adds domestic 7-11 shipping without fee for bank transfer", () => {
    const fees = calcCheckoutFees({
      items: [{ id: "d003-venus", price: 950, quantity: 1 }],
      checkoutRegion: "domestic",
      shippingMethod: "cvs_711",
      paymentMethod: "atm",
    });

    expect(fees.shippingFee).toBe(60);
    expect(fees.paymentFee).toBe(0);
    expect(fees.total).toBe(1010);
  });

  it("waives shipping for the payment-test email only", () => {
    const fees = calcCheckoutFees({
      items: [{ id: "d003-venus", price: 950, quantity: 1 }],
      checkoutRegion: "domestic",
      shippingMethod: "cvs_711",
      paymentMethod: "credit",
      buyerEmail: " Baby90522@gmail.com ",
    });

    expect(fees.shippingFee).toBe(0);
    expect(fees.emailFreeShipping).toBe(true);
    expect(fees.total).toBe(950);
  });

  it("adds overseas shipping without PayPal fee for normal products", () => {
    const fees = calcCheckoutFees({
      items: [{ id: "d002-honey-realm", name: "蜜光之境手鍊", price: 1580, quantity: 1 }],
      checkoutRegion: "overseas",
      shippingMethod: "home",
      paymentMethod: "paypal",
      overseasCountry: "US",
    });

    expect(fees.shippingFee).toBe(771);
    expect(fees.paymentFee).toBe(0);
    expect(fees.total).toBe(2351);
  });

  it("waives domestic shipping when ordering two normal products", () => {
    const fees = calcCheckoutFees({
      items: [
        { id: "d001-moon-secret", name: "月下密語手鍊", price: 1480, quantity: 1 },
        { id: "d003-venus", name: "維納斯 Venus", price: 950, quantity: 1 },
      ],
      checkoutRegion: "domestic",
      shippingMethod: "home",
      paymentMethod: "credit",
    });

    expect(fees.shippingFee).toBe(0);
    expect(fees.domesticFreeShipping).toBe(true);
    expect(fees.paymentFee).toBe(0);
    expect(fees.total).toBe(2430);
  });

  it("waives domestic shipping when one normal product quantity reaches two", () => {
    const fees = calcCheckoutFees({
      items: [{ id: "d003-venus", name: "維納斯 Venus", price: 950, quantity: 2 }],
      checkoutRegion: "domestic",
      shippingMethod: "home",
      paymentMethod: "credit",
    });

    expect(fees.shippingFee).toBe(0);
    expect(fees.domesticFreeShipping).toBe(true);
    expect(fees.total).toBe(1900);
  });

  it("does not count test products toward two-item domestic free shipping", () => {
    const fees = calcCheckoutFees({
      items: [
        { id: "d001-moon-secret", name: "月下密語手鍊", price: 1480, quantity: 1 },
        { id: "test-credit-5", name: "[測試用] 信用卡測試商品 5元", price: 5, quantity: 1 },
      ],
      checkoutRegion: "domestic",
      shippingMethod: "cvs_711",
      paymentMethod: "atm",
    });

    expect(fees.shippingFee).toBe(60);
    expect(fees.domesticFreeShipping).toBe(false);
    expect(fees.total).toBe(1545);
  });

  it("does not count products excluded from two-item domestic free shipping", () => {
    const fees = calcCheckoutFees({
      items: [
        { id: "d001-moon-secret", name: "月下密語手鍊", price: 1480, quantity: 1 },
        {
          id: "prod-gift-box",
          name: "禮盒",
          price: 120,
          quantity: 1,
          twoItemFreeShippingEligible: false,
        },
      ],
      checkoutRegion: "domestic",
      shippingMethod: "home",
      paymentMethod: "credit",
    });

    expect(fees.shippingFee).toBe(100);
    expect(fees.domesticFreeShipping).toBe(false);
    expect(fees.total).toBe(1700);
  });

  it("waives domestic shipping when eligible quantity reaches two and ignores excluded items", () => {
    const fees = calcCheckoutFees({
      items: [
        { id: "d001-moon-secret", name: "月下密語手鍊", price: 1480, quantity: 2 },
        {
          id: "prod-gift-box",
          name: "禮盒",
          price: 120,
          quantity: 3,
          twoItemFreeShippingEligible: false,
        },
      ],
      checkoutRegion: "domestic",
      shippingMethod: "home",
      paymentMethod: "credit",
    });

    expect(fees.shippingFee).toBe(0);
    expect(fees.domesticFreeShipping).toBe(true);
    expect(fees.total).toBe(3320);
  });

  it("counts custom deposit products toward two-item domestic free shipping", () => {
    const fees = calcCheckoutFees({
      items: [
        { id: "d003-venus", name: "維納斯 Venus", price: 950, quantity: 1 },
        { id: CUSTOM_PRODUCT_ID, name: "客製化商品", price: 500, quantity: 1 },
      ],
      checkoutRegion: "domestic",
      shippingMethod: "home",
      paymentMethod: "credit",
    });

    expect(fees.shippingFee).toBe(0);
    expect(fees.domesticFreeShipping).toBe(true);
    expect(fees.total).toBe(1450);
  });

  it("does not add shipping or handling fees for test and custom products", () => {
    const fees = calcCheckoutFees({
      items: [
        { id: "test-credit-5", name: "[測試用] 信用卡測試商品 5元", price: 5, quantity: 1 },
        { id: CUSTOM_PRODUCT_ID, price: 1, quantity: 1 },
      ],
      checkoutRegion: "overseas",
      shippingMethod: "home",
      paymentMethod: "paypal",
      overseasCountry: "GB",
    });

    expect(fees.shippingFee).toBe(0);
    expect(fees.paymentFee).toBe(0);
    expect(fees.total).toBe(6);
  });
});
