/**
 * App 內建瀏覽器警示
 * 偵測 LINE / Instagram / Facebook 等內建瀏覽器（UA 會自報身分），
 * 在付款相關頁面頂端提醒改用外部瀏覽器，避免綠界跳轉過程被中斷。
 * LINE 支援 openExternalBrowser=1 參數，可直接一鍵改用外部瀏覽器開啟。
 */
import { useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";

type InAppBrowser = {
  name: string;
  /** 手動切換外部瀏覽器的操作說明 */
  hint: string;
  /** 一鍵開啟外部瀏覽器的連結（目前僅 LINE 支援） */
  externalUrl?: string;
};

function detectInAppBrowser(): InAppBrowser | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;

  if (/\bLine\//i.test(ua)) {
    const url = new URL(window.location.href);
    url.searchParams.set("openExternalBrowser", "1");
    return {
      name: "LINE",
      hint: "請點右下角「⋯」選「以預設瀏覽器開啟」後再結帳。",
      externalUrl: url.toString(),
    };
  }
  if (/Instagram/i.test(ua)) {
    return { name: "Instagram", hint: "請點右上角「⋯」選「以外部瀏覽器開啟」後再結帳。" };
  }
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
    return { name: "Facebook", hint: "請點右上角「⋯」選「以外部瀏覽器開啟」後再結帳。" };
  }
  if (/musical_ly|TikTok|Bytedance/i.test(ua)) {
    return { name: "TikTok", hint: "請點右上角「⋯」選「以瀏覽器開啟」後再結帳。" };
  }
  return null;
}

export default function InAppBrowserWarning() {
  const browser = useMemo(detectInAppBrowser, []);
  const [dismissed, setDismissed] = useState(false);

  if (!browser || dismissed) return null;

  return (
    <div className="border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body font-medium text-amber-900">
          您正在使用 {browser.name} 內建瀏覽器，付款過程可能會中斷
        </p>
        <p className="text-xs font-body text-amber-800 mt-1">{browser.hint}</p>
        {browser.externalUrl && (
          <a
            href={browser.externalUrl}
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-amber-600 text-white text-xs font-body tracking-wide hover:bg-amber-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            一鍵改用外部瀏覽器開啟
          </a>
        )}
      </div>
      <button
        type="button"
        aria-label="關閉提醒"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
