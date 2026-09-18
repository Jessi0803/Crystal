import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "wouter";
import type { Product } from "@/lib/data";
import { getCustomPriceDisplay } from "@/lib/customOrderingContent";
import { getDiscountLabel } from "@/lib/pricing";
import { getQuickCartActionLabel } from "@/lib/productOptions";

function CardImage({ src, alt, priority, className = "", hideOnError = false }: { src: string; alt: string; priority: boolean; className?: string; hideOnError?: boolean }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) return hideOnError ? null : <div className={`bg-sf-cream ${className}`} aria-hidden="true" />;

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

type ProductCardProps = {
  product: Product;
  /** 有傳入才顯示桌機滑過時的快速加入按鈕 */
  onAddToCart?: (product: Product, event: MouseEvent) => void;
  soldOut?: boolean;
  priority?: boolean;
};

/**
 * 商品卡（首頁、商品列表、相關商品共用）
 * 米色相框：圖片內縮 4:5、文字置中，標籤改成一行小字，限量／折扣／售完疊在圖片上
 */
export default function ProductCard({ product, onAddToCart, soldOut = false, priority = false }: ProductCardProps) {
  const discountLabel = getDiscountLabel(product);
  const hoverImage = product.images?.find((image) => image && image !== product.image);
  const tagLine = product.tags.slice(0, 3).join("・");
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const badge = discountLabel ?? (product.isMonthlyLimited ? "限量" : null);

  return (
    <Link href={`/products/${product.id}`}>
      <div className="product-card group">
        <div className="product-card-image">
          <CardImage src={product.image} alt={product.name} priority={priority} />
          {hoverImage && !soldOut && (
            <CardImage
              src={hoverImage}
              alt=""
              priority={false}
              className="product-card-hover-image hidden lg:block"
              hideOnError
            />
          )}
          {badge && !soldOut && <span className="product-card-badge">{badge}</span>}
          {soldOut && <span className="sold-out-card">已售完</span>}
          {onAddToCart && !soldOut && (
            <button
              type="button"
              onClick={(event) => onAddToCart(product, event)}
              className="product-card-quick-add hidden lg:inline-flex"
            >
              {getQuickCartActionLabel(product) ?? "加入購物袋"}
            </button>
          )}
        </div>
        <div className="product-card-info">
          <p className="product-card-name line-clamp-2">{product.name}</p>
          {tagLine && <p className="product-card-tags max-w-full truncate">{tagLine}</p>}
          <div className="mt-1 flex flex-col items-center gap-0.5">
            {hasDiscount ? (
              <div className="flex items-center gap-2">
                <p className="text-[0.7rem] font-body text-sf-muted line-through">
                  NT$ {product.originalPrice!.toLocaleString()}
                </p>
                <p className="product-card-price">NT$ {product.price.toLocaleString()}</p>
              </div>
            ) : product.priceRange ? (
              <p className="product-card-price line-clamp-2">{getCustomPriceDisplay(product.id, product.priceRange)}</p>
            ) : (
              <p className="product-card-price">NT$ {product.price.toLocaleString()}</p>
            )}
            {hasDiscount && product.priceRange && (
              <p className="text-[0.7rem] font-body text-sf-muted">{getCustomPriceDisplay(product.id, product.priceRange)}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
