import { useEffect, useState, type ImgHTMLAttributes } from "react";

/**
 * 透過 Vercel Image Optimization 依顯示大小載入縮小版（WebP／AVIF），
 * 寬度與品質需與 vercel.json 的 images.sizes / images.qualities 一致。
 */
const OPTIMIZED_WIDTHS = [128, 256, 384, 640, 828, 1080, 1600] as const;
const QUALITY = 75;
const BLOB_HOST = "hpjrd3k3iz79xk5k.public.blob.vercel-storage.com";

function isOptimizable(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return /^\/(images|reviews)\/|^\/hero-cover\.jpg$/.test(src);
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === BLOB_HOST && /^\/(products|product-benefits)\//.test(url.pathname);
  } catch {
    return false;
  }
}

/** 只有部署在 Vercel 時才有 /_vercel/image；本機開發一律用原圖 */
function optimizationAvailable() {
  if (!import.meta.env.PROD || typeof window === "undefined") return false;
  return !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
}

export function optimizedImageUrl(src: string, width: number) {
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=${QUALITY}`;
}

type ResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string;
  /** 圖片實際顯示寬度的描述，例如 "(min-width: 1024px) 25vw, 50vw" */
  sizes: string;
  /** 可用的最大寬度（避免放大原圖），預設 1600 */
  maxWidth?: number;
};

/** 自動產生 srcSet 的 <img>；最佳化服務失敗時退回原圖，不會破圖 */
export default function ResponsiveImage({ src, sizes, maxWidth = 1600, onError, ...rest }: ResponsiveImageProps) {
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    setFallback(false);
  }, [src]);

  if (fallback || !src || !optimizationAvailable() || !isOptimizable(src)) {
    return <img src={src} onError={onError} {...rest} />;
  }

  const widths = OPTIMIZED_WIDTHS.filter((width) => width <= maxWidth);
  const largest = widths[widths.length - 1] ?? OPTIMIZED_WIDTHS[0];
  return (
    <img
      src={optimizedImageUrl(src, largest)}
      srcSet={widths.map((width) => `${optimizedImageUrl(src, width)} ${width}w`).join(", ")}
      sizes={sizes}
      // 最佳化版本失敗時先改用原圖；原圖也失敗才交給外層的 onError
      onError={() => setFallback(true)}
      {...rest}
    />
  );
}
