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
          className="w-full max-h-72 object-contain rounded-md bg-sf-cream border border-sf-line"
        />
        <p className="mt-3 text-xs font-body text-sf-muted leading-relaxed">
          此為示意圖，實際的款式由店家搭配。
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
            className={`px-4 py-4 text-base font-body border transition-colors rounded-md ${
              value === opt.id
                ? "border-sf-accent bg-sf-selected text-sf-ink font-medium"
                : "border-sf-line-strong text-sf-text hover:border-sf-accent/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
