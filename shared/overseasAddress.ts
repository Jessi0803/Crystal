/**
 * 國際宅配地址：英文欄位、依國家驗證（與結帳／後端共用）
 */
import type { OverseasShipCountryCode } from "./overseasShipping";
import { isOverseasShipCountryCode } from "./overseasShipping";

export const OVERSEAS_COUNTRY_EN: Record<OverseasShipCountryCode, string> = {
  MY: "Malaysia",
  HK: "Hong Kong",
  SG: "Singapore",
  US: "United States",
  GB: "United Kingdom",
  AU: "Australia",
};

/** 美國州／領地（兩碼，結帳下拉用） */
export const US_STATE_OPTIONS: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export const AU_STATE_OPTIONS = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;
export type AuStateCode = (typeof AU_STATE_OPTIONS)[number];

const US_STATE_CODES = new Set(US_STATE_OPTIONS.map((s) => s.code));

/** 非英文常見文字區段（中文、日文、韓文等）— 地址須為英文 */
export function hasNonEnglishScript(s: string): boolean {
  return /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0E00-\u0E7F\u0600-\u06FF\u0590-\u05FF]/.test(s);
}

/** 英國郵遞區號（常見格式，略嚴格） */
export function isValidUKPostcode(pc: string): boolean {
  const s = pc.replace(/\s+/g, " ").trim().toUpperCase();
  if (!s) return false;
  return /^([A-Z]{1,2}\d[A-Z0-9]?\s*\d[A-Z]{2}|GIR\s*0A{2})$/i.test(s);
}

export function overseasPostalRequired(country: OverseasShipCountryCode): boolean {
  return country !== "HK";
}

export function overseasStateRequired(country: OverseasShipCountryCode): boolean {
  return country === "US" || country === "AU";
}

export type OverseasAddressPayload = {
  intlCountry: string;
  intlAddrLine1: string;
  intlAddrLine2: string;
  intlCity: string;
  intlState: string;
  intlPostalCode: string;
};

export type OverseasValidationIssue = { path: keyof OverseasAddressPayload | string; message: string };

export function validateOverseasAddress(p: OverseasAddressPayload): OverseasValidationIssue[] {
  const issues: OverseasValidationIssue[] = [];
  const ccRaw = p.intlCountry.trim();
  if (!isOverseasShipCountryCode(ccRaw)) {
    issues.push({ path: "intlCountry", message: "Please select a country." });
    return issues;
  }
  const cc = ccRaw as OverseasShipCountryCode;

  const line1 = p.intlAddrLine1.trim();
  const line2 = p.intlAddrLine2.trim();
  const city = p.intlCity.trim();
  const state = p.intlState.trim();
  const postal = p.intlPostalCode.trim();

  if (!line1) issues.push({ path: "intlAddrLine1", message: "Address Line 1 is required." });
  if (!city) issues.push({ path: "intlCity", message: "City is required." });

  const textFields: [string, keyof OverseasAddressPayload][] = [
    [line1, "intlAddrLine1"],
    [line2, "intlAddrLine2"],
    [city, "intlCity"],
    [state, "intlState"],
  ];
  for (const [t, path] of textFields) {
    if (t && hasNonEnglishScript(t)) {
      issues.push({ path, message: "Please use English only (no Chinese or other scripts)." });
    }
  }
  if (postal && hasNonEnglishScript(postal)) {
    issues.push({ path: "intlPostalCode", message: "Postal code must use English letters and digits only." });
  }

  if (overseasStateRequired(cc) && !state) {
    issues.push({
      path: "intlState",
      message: cc === "US" ? "State is required." : "State / territory is required (e.g. NSW).",
    });
  }

  if (cc !== "HK" && !postal) {
    issues.push({ path: "intlPostalCode", message: "Postal code is required." });
  }

  if (cc === "US") {
    if (state && !US_STATE_CODES.has(state)) {
      issues.push({ path: "intlState", message: "Please select a valid US state." });
    }
    if (postal && !/^\d{5}(-\d{4})?$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "ZIP code must be 5 digits or ZIP+4 (e.g. 12345 or 12345-6789)." });
    }
  } else if (cc === "AU") {
    if (state && !(AU_STATE_OPTIONS as readonly string[]).includes(state)) {
      issues.push({ path: "intlState", message: "Please select a valid Australian state/territory." });
    }
    if (postal && !/^\d{4}$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "Australian postcode must be 4 digits." });
    }
  } else if (cc === "GB") {
    if (postal && !isValidUKPostcode(postal)) {
      issues.push({
        path: "intlPostalCode",
        message: "Please enter a valid UK postcode (e.g. SW1A 1AA).",
      });
    }
  } else if (cc === "MY") {
    if (postal && !/^\d{5}$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "Malaysia postcode must be 5 digits." });
    }
  } else if (cc === "SG") {
    if (postal && !/^\d{6}$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "Singapore postal code must be 6 digits." });
    }
  } else if (cc === "HK") {
    if (postal && !/^[A-Za-z0-9\s-]{1,12}$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "If provided, use digits/letters only (optional for Hong Kong)." });
    }
  }

  return issues;
}

export function formatOverseasShippingAddress(p: {
  countryCode: OverseasShipCountryCode;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
}): { shippingAddress: string; receiverZipCode: string } {
  const en = OVERSEAS_COUNTRY_EN[p.countryCode];
  const lines: string[] = [p.line1.trim()];
  if (p.line2.trim()) lines.push(p.line2.trim());
  const parts = [p.city.trim()];
  if (p.state.trim()) parts.push(p.state.trim());
  if (p.postal.trim()) parts.push(p.postal.trim());
  lines.push(parts.join(", "));
  lines.push(`${en} (${p.countryCode})`);
  const postalSlice = p.postal.trim().slice(0, 10);
  const receiverZipCode =
    postalSlice || (p.countryCode === "HK" ? "HK-NONE" : "");
  return { shippingAddress: lines.join("\n"), receiverZipCode };
}
