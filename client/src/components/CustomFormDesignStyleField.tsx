export const CUSTOM_DESIGN_STYLE_OPTIONS = [
  { id: "understated", label: "低調耐看" },
  { id: "gentle", label: "溫柔" },
  { id: "bold", label: "個性" },
  { id: "clear", label: "清透" },
  { id: "ornate", label: "華麗" },
  { id: "designer", label: "沒有想法，交給設計師" },
] as const;

export type CustomDesignStyleId =
  (typeof CUSTOM_DESIGN_STYLE_OPTIONS)[number]["id"];
export type CustomDesignStyleChoice = "" | CustomDesignStyleId;

const DESIGN_STYLE_LABELS: Record<CustomDesignStyleId, string> =
  CUSTOM_DESIGN_STYLE_OPTIONS.reduce(
    (acc, opt) => {
      acc[opt.id] = opt.label;
      return acc;
    },
    {} as Record<CustomDesignStyleId, string>
  );

export function formatCustomDesignStyleNote(
  value: CustomDesignStyleChoice
): string {
  if (!value) return "（未填）";
  return DESIGN_STYLE_LABELS[value];
}

interface CustomFormDesignStyleFieldProps {
  value: CustomDesignStyleChoice;
  onChange: (value: CustomDesignStyleId) => void;
}

export default function CustomFormDesignStyleField({
  value,
  onChange,
}: CustomFormDesignStyleFieldProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {CUSTOM_DESIGN_STYLE_OPTIONS.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-4 py-3.5 text-sm font-body border-2 transition-colors rounded-sm ${
            opt.id === "designer" ? "col-span-2 sm:col-span-3" : ""
          } ${
            value === opt.id
              ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
              : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
