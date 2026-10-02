/**
 * 會員中心訂單明細 + 每個品項的評價入口。
 *
 * 評價狀態用 reviews.statusByOrder 一次取回整張訂單，不會每個品項各打一支 API。
 * 查詢只在訂單被展開時才發出（元件掛載時）。
 */
import { useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import CustomerReviewDialog, { type ReviewTargetItem } from "@/components/CustomerReviewDialog";

type OrderItem = {
  id: number;
  productName: string;
  productImage?: string | null;
  quantity: number;
  subtotal: number;
};

type Order = { id: number; items: OrderItem[] };

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle" role="img" aria-label={`${rating} 星`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={`h-3 w-3 ${index <= rating ? "fill-brand-blush text-brand-blush" : "fill-transparent text-sf-line-strong"}`}
          strokeWidth={1.25}
        />
      ))}
    </span>
  );
}

export default function OrderItemReviews({ order }: { order: Order }) {
  const { data: states } = trpc.reviews.statusByOrder.useQuery({ orderId: order.id });
  const [target, setTarget] = useState<ReviewTargetItem | null>(null);
  const [openReviewId, setOpenReviewId] = useState<number | null>(null);

  const stateByItemId = new Map((states ?? []).map((state) => [state.orderItemId, state]));

  return (
    <>
      <div className="space-y-2 mb-4">
        {order.items.map((item) => {
          const state = stateByItemId.get(item.id);
          const review = state?.review ?? null;
          const showMyReview = review != null && openReviewId === review.id;

          return (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {item.productImage && (
                    <img src={item.productImage} alt={item.productName} className="w-10 h-10 object-cover" />
                  )}
                  <div>
                    <p className="text-xs font-body text-sf-text">{item.productName}</p>
                    <p className="text-[0.65rem] text-sf-muted font-body">× {item.quantity}</p>
                  </div>
                </div>
                <p className="text-xs font-body text-sf-text">NT$ {item.subtotal.toLocaleString()}</p>
              </div>

              {state?.state === "available" && (
                <div className="pl-[3.25rem]">
                  <button
                    type="button"
                    aria-label={`評價「${item.productName}」`}
                    onClick={() =>
                      setTarget({
                        orderItemId: item.id,
                        productName: item.productName,
                        productImage: item.productImage,
                      })
                    }
                    className="border border-sf-line-strong bg-white px-3 py-1.5 text-[0.7rem] font-body text-sf-text hover:bg-sf-selected"
                  >
                    評價商品
                  </button>
                </div>
              )}

              {state?.state === "pending" && (
                <p className="flex items-center gap-1.5 pl-[3.25rem] text-[0.7rem] font-body text-sf-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  評價已送出 · 等待審核
                </p>
              )}

              {/* 被隱藏的評價不告訴顧客被下架，只說已提交，避免不必要的爭執 */}
              {state?.state === "hidden" && (
                <p className="pl-[3.25rem] text-[0.7rem] font-body text-sf-muted">已提交評價</p>
              )}

              {state?.state === "published" && review && (
                <div className="pl-[3.25rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={review.rating} />
                    <span className="text-[0.7rem] font-body text-sf-muted">已完成評價</span>
                    <button
                      type="button"
                      aria-label={`${showMyReview ? "收合" : "查看"}「${item.productName}」的評價`}
                      onClick={() => setOpenReviewId(showMyReview ? null : review.id)}
                      className="text-[0.7rem] font-body text-sf-accent underline underline-offset-2"
                    >
                      {showMyReview ? "收合" : "查看我的評價"}
                    </button>
                  </div>
                  {showMyReview && (
                    <div className="mt-2 border border-sf-line bg-white px-3 py-2.5">
                      <p className="whitespace-pre-line text-[0.72rem] font-body leading-relaxed text-sf-text">
                        {review.content}
                      </p>
                      {review.images.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {review.images.map((src, index) => (
                            <img
                              key={src}
                              src={src}
                              alt={`我的實拍 ${index + 1}`}
                              loading="lazy"
                              className="h-12 w-12 border border-sf-line object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CustomerReviewDialog item={target} orderId={order.id} onClose={() => setTarget(null)} />
    </>
  );
}
