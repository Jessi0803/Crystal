import { CUSTOM_PENDANT_CHARM_IMAGE_URLS } from "@/lib/customOrderingContent";

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
      <div className="grid grid-cols-2 gap-3">
        {CUSTOM_PENDANT_CHARM_IMAGE_URLS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`吊飾款式參考${i + 1}`}
            className="w-full h-56 object-cover rounded-sm"
          />
        ))}
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
