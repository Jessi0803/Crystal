import { useEffect, useState, type RefObject } from "react";
import { ShoppingBag } from "lucide-react";

type StickyBuyBarProps = {
  /** 頁面內原本的購買按鈕區塊；它在畫面上時隱藏固定列，避免同時出現兩個按鈕 */
  targetRef: RefObject<HTMLElement | null>;
  priceLabel: string;
  /** 目前選擇的規格摘要，例如「手圍 14 cm・彈力繩・剛好」 */
  detail?: string;
  /** 點規格摘要時捲回選項區修改 */
  onEditDetail?: () => void;
  buttonLabel: string;
  disabled?: boolean;
  onBuy: () => void;
};

/** 手機／平板固定在畫面底部的購買列 */
export default function StickyBuyBar({ targetRef, priceLabel, detail, onEditDetail, buttonLabel, disabled = false, onBuy }: StickyBuyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  // 購買列出現時，AI 客服按鈕讓位到購買列上方
  useEffect(() => {
    document.documentElement.classList.toggle("has-sticky-buy-bar", visible);
    return () => document.documentElement.classList.remove("has-sticky-buy-bar");
  }, [visible]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-sf-line bg-white/95 px-4 pt-2.5 backdrop-blur transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-light leading-tight tracking-[0.04em] text-sf-ink">{priceLabel}</p>
          {detail && (
            <button
              type="button"
              onClick={onEditDetail}
              tabIndex={visible ? 0 : -1}
              className="mt-0.5 block max-w-full truncate text-left text-[0.68rem] tracking-[0.04em] text-sf-muted underline decoration-sf-line-strong underline-offset-2"
              aria-label={`目前規格：${detail}，點此修改`}
            >
              {detail}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onBuy}
          disabled={disabled}
          tabIndex={visible ? 0 : -1}
          className="btn-primary shrink-0 justify-center px-6 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingBag className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
