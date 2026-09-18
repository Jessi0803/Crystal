import { useEffect, useRef, useState } from "react";

type MobileProductGalleryProps = {
  slides: string[];
  activeImage: string;
  alt: string;
  soldOut?: boolean;
  /** 去背或需完整顯示的商品圖改用 contain */
  contain?: boolean;
};

/**
 * 手機／平板商品圖：可左右滑的圖片列，主圖約佔 80% 寬並露出下一張。
 * 選擇購買方案或點縮圖改變 activeImage 時，自動滑到那一張。
 */
export default function MobileProductGallery({ slides: allSlides, activeImage, alt, soldOut = false, contain = false }: MobileProductGalleryProps) {
  // 載入失敗的圖片（例如未公開分享的雲端檔案）直接略過，但至少保留第一張
  const [failed, setFailed] = useState<string[]>([]);
  const loadable = allSlides.filter((image) => !failed.includes(image));
  const slides = loadable.length > 0 ? loadable : allSlides.slice(0, 1);
  const stripRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const isFirstSync = useRef(true);
  const single = slides.length <= 1;

  useEffect(() => {
    const strip = stripRef.current;
    const target = slides.indexOf(activeImage);
    if (!strip || target < 0) return;
    const slide = strip.children[target] as HTMLElement | undefined;
    if (!slide) return;
    strip.scrollTo({ left: slide.offsetLeft - strip.offsetLeft - parseFloat(getComputedStyle(strip).paddingLeft), behavior: isFirstSync.current ? "auto" : "smooth" });
    isFirstSync.current = false;
  }, [activeImage, slides.join("|")]);

  const handleScroll = () => {
    const strip = stripRef.current;
    if (!strip || strip.children.length < 2) return;
    const step = (strip.children[1] as HTMLElement).offsetLeft - (strip.children[0] as HTMLElement).offsetLeft;
    if (step > 0) setIndex(Math.min(slides.length - 1, Math.max(0, Math.round(strip.scrollLeft / step))));
  };

  return (
    <div className="-mx-4 sm:-mx-6 lg:hidden">
      <div
        ref={stripRef}
        onScroll={handleScroll}
        className={`scrollbar-hide flex gap-2.5 px-4 sm:px-6 ${single ? "justify-center" : "snap-x snap-mandatory overflow-x-auto scroll-px-4 sm:scroll-px-6"}`}
      >
        {slides.map((image, slideIndex) => (
          <div
            key={`${image}-${slideIndex}`}
            className="relative aspect-square w-[80%] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-lg bg-sf-cream"
          >
            <img
              src={image}
              alt={slideIndex === 0 ? alt : `${alt} 圖片 ${slideIndex + 1}`}
              loading={slideIndex === 0 ? "eager" : "lazy"}
              onError={() => {
                if (slides.length > 1) setFailed((current) => (current.includes(image) ? current : [...current, image]));
              }}
              className={`h-full w-full ${contain ? "object-contain p-4" : "object-cover"}`}
            />
            {soldOut && slideIndex === 0 && <span className="sold-out-card">已售完</span>}
          </div>
        ))}
      </div>
      {!single && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {slides.map((image, dotIndex) => (
            <span
              key={`${image}-dot-${dotIndex}`}
              className={`h-[2px] rounded-full transition-all duration-300 ${dotIndex === index ? "w-5 bg-sf-accent" : "w-2 bg-brand-peach"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
