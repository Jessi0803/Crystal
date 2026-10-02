/**
 * 商品頁的顧客回饋區塊。
 *
 * - 只顯示 published 的回饋（由 reviews.listByProduct 決定，前端不做狀態過濾）
 * - 沒有回饋時整個 section 不渲染，不顯示「目前尚無評論」
 * - 單列橫向捲動，捲到接近尾端才去撈下一批，不一次把全部回饋載進來
 * - 只有顧客投稿（source=customer 且綁得到 orderItem）才標示「已購買」；
 *   後台人工建立的回饋沒有系統購買驗證，不掛這個標示
 */
import { useEffect, useRef } from "react";
import { Star } from "lucide-react";
import ResponsiveImage from "@/components/ResponsiveImage";
import { trpc } from "@/lib/trpc";

const SERIF = { fontFamily: "'Noto Serif TC', 'Noto Sans TC', serif" } as const;
const PAGE_SIZE = 8;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`評分 ${rating} 顆星，滿分 5 顆星`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${index <= rating ? "fill-brand-blush text-brand-blush" : "fill-transparent text-sf-line-strong"}`}
          strokeWidth={1.25}
        />
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }: { productId: string }) {
  const enabled = productId.length > 0;
  const { data: summary } = trpc.reviews.summaryByProduct.useQuery({ productId }, { enabled });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.reviews.listByProduct.useInfiniteQuery(
      { productId, limit: PAGE_SIZE },
      { enabled, initialCursor: 0, getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reviews = data?.pages.flatMap((page) => page.items) ?? [];

  // 尾端的哨兵捲進可視範圍就撈下一批；root 設成捲動容器，橫向捲動才偵測得到
  useEffect(() => {
    const scroller = scrollerRef.current;
    const sentinel = sentinelRef.current;
    if (!scroller || !sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      // 提前一點開始載，滑到底時通常已經接上了
      { root: scroller, rootMargin: "0px 240px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, reviews.length]);

  // 載入中與沒有回饋都不佔版面，避免商品頁出現空區塊
  if (reviews.length === 0) return null;

  return (
    <section className="border-t border-sf-line py-14">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="eyebrow mb-2">CUSTOMER NOTES</p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="heading-lg">顧客回饋</h2>
            {summary && summary.count > 0 && summary.average != null && (
              <p className="text-sm font-body font-light text-sf-muted">
                {summary.average.toFixed(1)} / 5 · {summary.count} 則
              </p>
            )}
          </div>
        </div>

        {/* 橫向捲動，只排一列；桌機放不下時一樣用捲的，不另外換行 */}
        <div
          ref={scrollerRef}
          role="region"
          aria-label="顧客回饋"
          tabIndex={0}
          // scroll-px 要跟著容器的左右留白，否則 snap 會把第一則往左切掉
          className="scrollbar-hide -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 lg:-mx-8 lg:px-8 lg:scroll-px-8"
        >
          {reviews.map((review) => (
            <article
              key={review.id}
              className="w-[80vw] max-w-[22rem] shrink-0 snap-start border-r border-sf-line px-6 py-1 first:pl-0 last:border-r-0 last:pr-0 sm:w-[20rem]"
            >
              <StarRating rating={review.rating} />

              <p
                className="mt-4 text-sm font-light leading-[1.9] tracking-[0.02em] text-sf-text whitespace-pre-wrap"
                style={SERIF}
              >
                {review.content}
              </p>

              {review.images.length > 0 && (
                <div className="mt-5 flex gap-3">
                  {review.images.map((src, index) => (
                    <div key={src} className="w-20 sm:w-24 shrink-0 overflow-hidden border border-sf-line">
                      {/* 固定正方形比例，圖片載入前後高度不變，不會造成 CLS */}
                      <div className="aspect-square">
                        <ResponsiveImage
                          src={src}
                          sizes="96px"
                          maxWidth={384}
                          alt={`${review.displayName} 的顧客實拍 ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          // 單張圖片失效只隱藏那一張，不影響整頁
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 text-[0.7rem] font-body tracking-[0.18em] text-sf-muted">
                — {review.displayName}
                {review.verifiedPurchase && <span className="ml-2 text-sf-accent">· 已購買</span>}
              </p>
            </article>
          ))}

          {/* 捲到這裡就載下一批；沒有下一批時不佔寬度 */}
          <div
            ref={sentinelRef}
            aria-hidden="true"
            className={hasNextPage ? "flex w-24 shrink-0 items-center justify-center" : "w-0"}
          >
            {isFetchingNextPage && (
              <span className="h-5 w-5 animate-spin rounded-full border border-sf-line-strong border-t-transparent" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
