import { CUSTOM_PENDANT_CHARM_SCHEMATIC_URL } from "@/lib/customOrderingContent";

export type PendantCharmChoice = "" | "yes" | "no";

interface CustomFormPendantCharmFieldProps {
  value: PendantCharmChoice;
  onChange: (value: "yes" | "no") => void;
}

export default function CustomFormPendantCharmField({
  value,
  onChange,
}: CustomFormPendantCharmFieldProps) {
  return (
    <div className="space-y-5">
      <div>
        <img
          src={CUSTOM_PENDANT_CHARM_SCHEMATIC_URL}
          alt="吊飾加掛示意"
          className="w-full max-h-72 object-contain rounded-sm bg-[oklch(0.97_0_0)] border border-[oklch(0.9_0_0)]"
        />
        <p className="mt-3 text-xs font-body text-[oklch(0.5_0_0)] leading-relaxed">
          此為示意圖，實際有什麼款式由店家搭配。
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { id: "yes" as const, label: "要加吊飾" },
            { id: "no" as const, label: "不要吊飾" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-4 py-4 text-base font-body border-2 transition-colors rounded-sm ${
              value === opt.id
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
                : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
