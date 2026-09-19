import { CUSTOM_BRACELET_NOTICES, CUSTOM_LINE_URL } from "@/lib/customOrderingContent";
import { CircleAlert } from "lucide-react";

/**
 * 客製報名表單頂部：訂購流程 + 手鍊注意事項（與官網 /custom、商品詳情文案一致）
 */
export default function CustomFormOrderingIntro() {
  return (
    <section className="bg-gradient-to-b from-sf-cream to-white border border-sf-line rounded-md p-6 sm:p-8 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
      <p className="text-[0.62rem] tracking-[0.22em] font-body text-brand-blush uppercase mb-1">
        開始填寫前請先閱讀
      </p>
      <h2
        className="text-lg sm:text-xl font-medium text-sf-ink mb-6 leading-snug"
        style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
      >
        訂購流程與手鍊注意事項
      </h2>

      <div className="border-b border-sf-line pb-6 mb-6">
        <p className="text-[0.7rem] tracking-[0.14em] font-body text-sf-text mb-3 font-medium">
          訂購流程
        </p>
        <ol className="ml-0.5 list-outside list-decimal space-y-2.5 pl-5 text-sm font-body font-light text-sf-text leading-[1.75] marker:font-medium marker:text-brand-blush">
          <li>支付訂金。</li>
          <li>填寫報名表單，提供手圍、喜歡金飾或銀飾，並確認設計需求。</li>
          <li>
            加入
            <a
              href={CUSTOM_LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[oklch(0.48_0.12_155)] underline decoration-[oklch(0.48_0.12_155)]/35 underline-offset-[3px] hover:opacity-85 mx-0.5"
            >
              官方 LINE
            </a>
            ，等待設計師傳送水晶搭配圖。
          </li>
          <li>手鍊與設計確認完成後，將提供尾款報價。</li>
          <li>尾款支付完畢，準備出貨。</li>
        </ol>
        <p className="mt-4 border-l-2 border-brand-peach pl-3 text-xs font-body leading-relaxed text-sf-text">
          客製商品將於資料填寫完成後開始計算製作工作天；若尚未完成資料填寫，訂單會先保留，暫不進入設計階段。
        </p>
      </div>

      <div className="rounded-md border border-sf-line bg-sf-cream px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-sm font-body text-sf-text mb-3 flex items-center gap-2 tracking-wide font-medium">
          <CircleAlert className="h-4 w-4 text-brand-blush" strokeWidth={1.6} aria-hidden="true" />
          手鍊注意事項
        </p>
        <div className="space-y-3 text-[0.8125rem] font-body font-light text-sf-text leading-[1.8] tracking-wide">
          {CUSTOM_BRACELET_NOTICES.map((n, idx) => (
            <div key={idx}>
              {n.title ? <p className="font-medium text-sf-text mb-1">{n.title}</p> : null}
              <p>{n.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
