/**
 * 會員留下商品評價。
 *
 * 顧客只填星等、心得、實拍與是否匿名；顯示名稱、商品、來源、狀態都由伺服器決定。
 * 送出後一律是待審核，不會直接出現在商品頁。
 */
import { useEffect, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import ReviewImageUploader from "@/components/ReviewImageUploader";

const MAX_IMAGES = 3;
const CONTENT_MAX = 2000;
const SERIF = { fontFamily: "'Noto Serif TC', 'Noto Sans TC', serif" } as const;

export type ReviewTargetItem = {
  orderItemId: number;
  productName: string;
  productImage?: string | null;
};

function StarPicker({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => (
        <button
          key={index}
          type="button"
          aria-label={`${index} 星`}
          aria-pressed={value === index}
          onClick={() => onChange(index)}
          // 手機點擊目標至少 44px
          className="flex h-11 w-11 items-center justify-center"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              index <= value ? "fill-brand-blush text-brand-blush" : "fill-transparent text-sf-line-strong"
            }`}
            strokeWidth={1.25}
          />
        </button>
      ))}
    </div>
  );
}

export default function CustomerReviewDialog({
  item,
  orderId,
  onClose,
}: {
  item: ReviewTargetItem | null;
  orderId: number;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setRating(5);
    setContent("");
    setImages([]);
    setAnonymous(false);
    setError(null);
  }, [item]);

  const uploadImage = trpc.reviews.customerUploadImage.useMutation();
  const createReview = trpc.reviews.customerCreate.useMutation({
    onSuccess: async () => {
      toast.success("謝謝你的分享 ♡ 回饋已送出，審核後將有機會顯示於商品頁。");
      await utils.reviews.statusByOrder.invalidate({ orderId });
      onClose();
    },
    onError: (err) => setError(err.message || "送出失敗，請稍後再試"),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!item) return;
    if (!content.trim()) return setError("請輸入商品心得");
    setError(null);
    createReview.mutate({ orderItemId: item.orderItemId, rating, content: content.trim(), images, anonymous });
  };

  const saving = createReview.isPending;

  return (
    <Dialog open={Boolean(item)} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 bg-sf-cream sm:max-w-lg">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-sf-line bg-white px-5 py-4 pr-12">
            <p className="eyebrow mb-1">YOUR EXPERIENCE</p>
            <DialogTitle className="text-lg font-light tracking-[0.06em] text-sf-ink" style={SERIF}>
              分享商品使用感受
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-body text-sf-muted">
              送出後會先由我們確認，審核通過才會顯示在商品頁。
            </DialogDescription>
          </div>

          {/* keyboard 打開時內容區自己捲動，送出按鈕固定在底部不會蓋住 textarea */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {item && (
              <div className="flex items-center gap-3 border border-sf-line bg-white px-3 py-3">
                {item.productImage && (
                  <img
                    src={item.productImage}
                    alt=""
                    className="h-14 w-14 shrink-0 border border-sf-line object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <p className="min-w-0 text-sm font-body text-sf-text">{item.productName}</p>
              </div>
            )}

            <div>
              <span className="mb-1 block text-[11px] font-body tracking-widest text-sf-muted">商品評分 *</span>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-body tracking-widest text-sf-muted">
                商品心得 *（{content.length} / {CONTENT_MAX}）
              </span>
              <textarea
                value={content}
                maxLength={CONTENT_MAX}
                rows={5}
                onChange={(event) => setContent(event.target.value)}
                placeholder="實際收到商品後覺得如何？歡迎分享外觀、配戴感受，或你喜歡的細節 ♡"
                className="w-full resize-y border border-sf-line-strong bg-white px-3 py-2.5 text-sm font-body text-sf-text outline-none focus:border-sf-accent"
              />
            </label>

            <div>
              <span className="mb-1 block text-[11px] font-body tracking-widest text-sf-muted">
                商品實拍（選填，最多 {MAX_IMAGES} 張）
              </span>
              <ReviewImageUploader
                images={images}
                onChange={setImages}
                uploadBase64={async (dataBase64) => {
                  const { url } = await uploadImage.mutateAsync({ contentType: "image/jpeg", dataBase64 });
                  return url;
                }}
                max={MAX_IMAGES}
                disabled={saving}
                onUploadingChange={setUploading}
                buttonClassName="inline-flex items-center justify-center gap-1 border border-sf-line-strong bg-white px-4 py-2.5 text-xs font-body text-sf-text hover:bg-sf-selected disabled:opacity-50"
              />
            </div>

            <label className="flex items-center gap-3 border border-sf-line bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
                className="h-4 w-4 shrink-0"
              />
              <span className="text-sm font-body text-sf-text">匿名發表（顯示為「匿名顧客」）</span>
            </label>

            {error && <p className="text-sm font-body text-red-600">{error}</p>}
          </div>

          <div className="shrink-0 border-t border-sf-line bg-white px-5 py-4">
            <button
              type="submit"
              disabled={saving || uploading}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {saving ? "送出中…" : "送出評價"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
