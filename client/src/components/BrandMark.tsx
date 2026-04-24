/**
 * 全站品牌：Logo 圖檔路徑 + 文字標誌（圖載入失敗時使用）
 * 換 Logo：替換 `client/public/logo.png`（路徑見 BRAND_LOGO_SRC）
 */
export const BRAND_LOGO_SRC = "/logo.png";

export function BrandTextMark({
  variant = "dark",
  align = "center",
}: {
  variant?: "dark" | "light";
  align?: "center" | "start";
}) {
  const light = variant === "light";
  return (
    <div
      className={`flex flex-col gap-0.5 select-none ${align === "start" ? "items-start" : "items-center"}`}
    >
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-[1.6rem] leading-none ${light ? "text-white" : "text-[oklch(0.1_0_0)]"}`}
          style={{
            fontFamily: "'Noto Serif TC', serif",
            fontWeight: 300,
            letterSpacing: "0.05em",
          }}
        >
          椛
        </span>
        <span
          className={`text-[0.6rem] ${light ? "text-white/50" : "text-[oklch(0.55_0_0)]"}`}
          style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontWeight: 300,
            letterSpacing: "0.1em",
          }}
        >
          ˙
        </span>
        <span
          className={`text-[1.4rem] leading-none italic ${light ? "text-white" : "text-[oklch(0.2_0_0)]"}`}
          style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontWeight: 300,
            letterSpacing: "0.08em",
          }}
        >
          Crystal
        </span>
      </div>
      <span
        className={`text-[0.45rem] tracking-[0.35em] ${light ? "text-white/50" : "text-[oklch(0.65_0_0)]"}`}
        style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
      >
        CRYSTAL ENERGY
      </span>
    </div>
  );
}
