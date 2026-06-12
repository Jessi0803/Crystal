import { Sparkles } from "lucide-react";
import { Product } from "@/lib/data";
import { trpc } from "@/lib/trpc";
import { CLEAR_QUARTZ_CHIPS_PRODUCT_ID } from "@shared/const";

export { CLEAR_QUARTZ_CHIPS_PRODUCT_ID };

const FALLBACK_CLEAR_QUARTZ_CHIPS_PRODUCT: Product = {
  id: CLEAR_QUARTZ_CHIPS_PRODUCT_ID,
  name: "白水晶碎石｜淨化能量首選",
  subtitle: "適合水晶、飾品與日常空間的淨化陪伴",
  category: "other",
  categoryLabel: "淨化小物",
  price: 0,
  image: "",
  tags: ["淨化"],
  description: "白水晶碎石加購商品。",
  story: "",
  benefits: ["日常淨化與能量維持"],
  suitableFor: ["想為水晶商品加購淨化小物的顧客"],
  howToUse: ["可放置於水晶、飾品盒或空間角落旁。"],
  disclaimer: "天然礦石飾品與擺件具有個人能量支持作用，非醫療用品。",
  inStock: true,
  featured: false,
  twoItemFreeShippingEligible: true,
  crystalType: "白水晶碎石",
  color: "透明白",
};

export function useClearQuartzChipsProduct() {
  const query = trpc.product.getById.useQuery(
    { id: CLEAR_QUARTZ_CHIPS_PRODUCT_ID },
    { staleTime: 1000 * 60 * 5 }
  );

  return {
    ...query,
    product: query.data ?? FALLBACK_CLEAR_QUARTZ_CHIPS_PRODUCT,
    hasLiveProduct: Boolean(query.data),
  };
}

export default function ClearQuartzAddonOption({
  checked,
  onCheckedChange,
  product,
  hasLiveProduct,
  className = "",
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  product: Product;
  hasLiveProduct: boolean;
  className?: string;
}) {
  const priceLabel = hasLiveProduct
    ? `+NT$ ${product.price.toLocaleString()}`
    : "價格依商品頁設定";
  const disabled = !hasLiveProduct;

  return (
    <label
      className={`flex items-start gap-3 border border-[oklch(0.9_0_0)] bg-[oklch(0.99_0_0)] px-3.5 py-3 transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-65"
          : "cursor-pointer hover:border-[oklch(0.72_0_0)]"
      } ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[oklch(0.18_0_0)]"
      />
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="h-14 w-14 shrink-0 border border-[oklch(0.92_0_0)] object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-[oklch(0.92_0_0)] bg-white">
          <Sparkles className="h-5 w-5 text-[oklch(0.58_0_0)]" />
        </div>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-sm font-body font-medium leading-snug text-[oklch(0.14_0_0)]">
            加購{product.name}
          </span>
          <span className="shrink-0 text-xs font-body font-medium text-[oklch(0.26_0_0)]">
            {priceLabel}
          </span>
        </span>
        <span className="mt-1 block text-xs font-body leading-relaxed text-[oklch(0.5_0_0)]">
          適合放置水晶、飾品或日常空間旁，作為能量淨化與擺放陪伴。
        </span>
      </span>
    </label>
  );
}
