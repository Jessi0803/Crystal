/**
 * 前台線條圖示（Lucide，ISC 授權，可免費商用）。
 * 資料檔（lib/data.ts 也會被伺服器讀取）只存圖示名稱，由這裡轉成元件；
 * 名稱為 "swatch:#色碼" 時顯示色票圓點。
 */
import {
  Coins,
  Eye,
  Flower2,
  Gem,
  Hand,
  Heart,
  HeartCrack,
  HeartHandshake,
  Leaf,
  Lightbulb,
  Moon,
  Mountain,
  Palette,
  Search,
  Shield,
  Sparkles,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  coins: Coins,
  eye: Eye,
  flower: Flower2,
  gem: Gem,
  hand: Hand,
  heart: Heart,
  "heart-crack": HeartCrack,
  "heart-handshake": HeartHandshake,
  leaf: Leaf,
  lightbulb: Lightbulb,
  moon: Moon,
  mountain: Mountain,
  palette: Palette,
  search: Search,
  shield: Shield,
  sparkles: Sparkles,
  sun: Sun,
  users: Users,
};

/** 依名稱顯示線條圖示；找不到名稱時不顯示 */
export function LineIcon({ name, className = "h-4 w-4", strokeWidth = 1.4 }: { name: string; className?: string; strokeWidth?: number }) {
  if (name.startsWith("swatch:")) {
    return (
      <span
        className={`inline-block rounded-full border border-white shadow-[0_0_0_1px_var(--sf-line-strong)] ${className}`}
        style={{ backgroundColor: name.slice("swatch:".length) }}
        aria-hidden="true"
      />
    );
  }
  const Icon = ICONS[name];
  return Icon ? <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" /> : null;
}

const BADGE_TONES = {
  accent: "bg-sf-selected text-sf-accent",
  success: "bg-emerald-50 text-emerald-600",
  danger: "bg-red-50 text-red-500",
} as const;

/** 狀態頁用的大圖示：淡色圓底＋細線圖示 */
export function IconBadge({ icon: Icon, tone = "accent" }: { icon: LucideIcon; tone?: keyof typeof BADGE_TONES }) {
  return (
    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${BADGE_TONES[tone]}`} aria-hidden="true">
      <Icon className="h-6 w-6" strokeWidth={1.4} />
    </div>
  );
}
