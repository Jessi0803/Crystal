/**
 * 回饋圖片上傳（後台與會員端共用）
 *
 * 上傳端點不同（admin 用 reviews.uploadImage，會員用 reviews.customerUploadImage），
 * 所以把「怎麼上傳」交給呼叫端，這裡只負責選檔、壓縮前的大小檢查、預覽、刪除與排序。
 */
import { useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";

/** 壓縮前的原始檔上限；壓過之後才會碰到伺服器的 3MB 限制 */
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export type ReviewImageUploaderProps = {
  images: string[];
  onChange: (images: string[]) => void;
  /** 把壓縮後的 base64 送出去，回傳圖片網址 */
  uploadBase64: (dataBase64: string) => Promise<string>;
  max: number;
  disabled?: boolean;
  /** 上傳中時讓外層把送出按鈕鎖住 */
  onUploadingChange?: (uploading: boolean) => void;
  className?: string;
  buttonClassName?: string;
};

export default function ReviewImageUploader({
  images,
  onChange,
  uploadBase64,
  max,
  disabled = false,
  onUploadingChange,
  className,
  buttonClassName,
}: ReviewImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setUploadingState = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remaining = max - images.length;
    if (remaining <= 0) {
      toast.error(`最多 ${max} 張圖片`);
      return;
    }

    setUploadingState(true);
    const uploaded: string[] = [];
    try {
      // 逐張上傳，避免單次請求過大
      for (const file of files.slice(0, remaining)) {
        if (file.size > MAX_SOURCE_BYTES) {
          toast.error("每張圖片請小於 10MB");
          continue;
        }
        const dataUrl = await compressImage(file, { maxSize: 1600, quality: 0.82 });
        uploaded.push(await uploadBase64(dataUrl.slice(dataUrl.indexOf(",") + 1)));
      }
      if (uploaded.length > 0) onChange([...images, ...uploaded]);
    } catch (error) {
      // 已經成功的那幾張要保留，不要因為最後一張失敗就整批丟掉
      if (uploaded.length > 0) onChange([...images, ...uploaded]);
      toast.error(error instanceof Error && error.message ? error.message : "圖片上傳失敗");
    }
    setUploadingState(false);
  };

  const moveImage = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const full = images.length >= max;

  return (
    <div className={className}>
      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-3">
          {images.map((src, index) => (
            <div key={src} className="w-24">
              <div className="relative aspect-square overflow-hidden border border-[oklch(0.9_0_0)]">
                <img src={src} alt={`回饋圖片 ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label={`移除圖片 ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                  className="absolute right-0 top-0 bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {images.length > 1 && (
                <div className="mt-1 flex justify-between">
                  <button
                    type="button"
                    aria-label={`圖片 ${index + 1} 往前`}
                    disabled={disabled || index === 0}
                    onClick={() => moveImage(index, -1)}
                    className="border border-[oklch(0.88_0_0)] px-2 py-1 disabled:opacity-30"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`圖片 ${index + 1} 往後`}
                    disabled={disabled || index === images.length - 1}
                    onClick={() => moveImage(index, 1)}
                    className="border border-[oklch(0.88_0_0)] px-2 py-1 disabled:opacity-30"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      <button
        type="button"
        className={buttonClassName}
        disabled={disabled || uploading || full}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? "上傳中…" : full ? `已達 ${max} 張上限` : "上傳圖片"}
      </button>
    </div>
  );
}
