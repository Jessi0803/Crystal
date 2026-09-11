import { describe, expect, it } from "vitest";
import {
  formatCustomFocusNote,
  toggleCustomFocusChoice,
  validateCustomFocus,
} from "../client/src/components/CustomFormFocusField";
import { validateCustomBraceletPreferences } from "../client/src/components/CustomFormBraceletPreferenceFields";

describe("custom form focus choices", () => {
  it("supports multiple selections and formats every selected label", () => {
    const selected = toggleCustomFocusChoice(["love"], "career", true);
    expect(selected).toEqual(["love", "career"]);
    expect(formatCustomFocusNote(selected, "")).toBe("感情、工作");
  });

  it("keeps designer as an exclusive choice", () => {
    expect(toggleCustomFocusChoice(["love", "career"], "designer", true)).toEqual(["designer"]);
    expect(toggleCustomFocusChoice(["designer"], "wealth", true)).toEqual(["wealth"]);
  });

  it("requires a story when other is one of the selections", () => {
    expect(validateCustomFocus(["love", "other"], "", "調整面向")).toBe(
      "選擇「其他」時，請跟我們說明你的故事"
    );
    expect(validateCustomFocus(["love", "other"], "最近想重新開始", "調整面向")).toBeNull();
  });
});

describe("custom form bracelet preferences", () => {
  const complete = {
    fitPreference: "just-right" as const,
    metalPreference: "silver" as const,
    silverTube: "no" as const,
    beadFrame: "no" as const,
    claspType: "elastic" as const,
    pendantCharm: "no" as const,
  };

  it("requires every accessory and wearing preference", () => {
    expect(validateCustomBraceletPreferences({ ...complete, claspType: "" })).toBe("請選擇扣具偏好");
    expect(validateCustomBraceletPreferences(complete)).toBeNull();
  });
});
