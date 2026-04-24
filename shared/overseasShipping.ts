/** 海外宅配開放國家／地區（與結帳、後端驗證一致） */
export const OVERSEAS_SHIP_COUNTRY_CODES = ["MY", "HK", "SG", "US", "GB", "AU"] as const;
export type OverseasShipCountryCode = (typeof OVERSEAS_SHIP_COUNTRY_CODES)[number];

export const OVERSEAS_SHIP_COUNTRY_LABELS: Record<OverseasShipCountryCode, string> = {
  MY: "馬來西亞",
  HK: "香港",
  SG: "新加坡",
  US: "美國",
  GB: "英國",
  AU: "澳洲",
};

export function isOverseasShipCountryCode(v: string): v is OverseasShipCountryCode {
  return (OVERSEAS_SHIP_COUNTRY_CODES as readonly string[]).includes(v);
}

export const OVERSEAS_SHIP_COUNTRY_OPTIONS = OVERSEAS_SHIP_COUNTRY_CODES.map((code) => ({
  code,
  label: OVERSEAS_SHIP_COUNTRY_LABELS[code],
}));
