import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BarChart3,
  Bot,
  Boxes,
  ClipboardList,
  ExternalLink,
  Menu,
  Settings,
  ShieldCheck,
  TicketPercent,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  aliases?: string[];
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/orders", label: "訂單管理", icon: ClipboardList },
  { href: "/admin/products", label: "商品與庫存", icon: Boxes, aliases: ["/admin/inventory"] },
  { href: "/admin/revenue", label: "營收報表", icon: BarChart3 },
  { href: "/admin/members", label: "會員管理", icon: Users },
  { href: "/admin/coupons", label: "優惠券管理", icon: TicketPercent },
  { href: "/admin/chatbot", label: "AI 客服", icon: Bot },
  { href: "/admin/monitoring", label: "操作監控", icon: ShieldCheck },
  { href: "/admin/settings", label: "網站設定", icon: Settings },
];

function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();

  return (
    <nav className="flex-1 space-y-1 px-3 py-5" aria-label="後台功能導覽">
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = location === item.href || item.aliases?.includes(location);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex min-h-11 items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-body transition-colors ${
              active
                ? "border-[oklch(0.22_0_0)] bg-[oklch(0.965_0_0)] text-[oklch(0.15_0_0)]"
                : "border-transparent text-[oklch(0.48_0_0)] hover:bg-[oklch(0.98_0_0)] hover:text-[oklch(0.18_0_0)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location]);

  // Individual admin pages continue to own their existing login and role guards.
  // The shared shell is only decoration for an already-authorized admin.
  if (authLoading || user?.role !== "admin") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)] lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[oklch(0.91_0_0)] bg-white lg:flex">
        <div className="border-b border-[oklch(0.93_0_0)] px-6 py-5">
          <p className="text-lg text-[oklch(0.12_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
            椛・Crystal
          </p>
          <p className="mt-1 text-[10px] tracking-[0.22em] text-[oklch(0.58_0_0)]">ADMIN CONSOLE</p>
        </div>
        <AdminNavigation />
        <div className="border-t border-[oklch(0.93_0_0)] p-3">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-body text-[oklch(0.5_0_0)] transition-colors hover:bg-[oklch(0.98_0_0)] hover:text-[oklch(0.18_0_0)]"
          >
            <ExternalLink className="h-4 w-4" />
            返回前台網站
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[oklch(0.91_0_0)] bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center border border-[oklch(0.88_0_0)] text-[oklch(0.3_0_0)]"
            aria-label="開啟後台選單"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-sm text-[oklch(0.15_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif" }}>後台管理</p>
            <p className="text-[9px] tracking-[0.18em] text-[oklch(0.62_0_0)]">CRYSTAL ADMIN</p>
          </div>
          <Link href="/" className="flex h-10 w-10 items-center justify-center text-[oklch(0.45_0_0)]" aria-label="返回前台網站">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {children}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileOpen(false)}
            aria-label="關閉後台選單"
          />
          <aside className="relative flex h-full w-[min(84vw,320px)] flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-[oklch(0.93_0_0)] px-5">
              <div>
                <p className="text-base text-[oklch(0.15_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif" }}>後台功能</p>
                <p className="text-[9px] tracking-[0.18em] text-[oklch(0.62_0_0)]">ADMIN MENU</p>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center" aria-label="關閉後台選單">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AdminNavigation onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-[oklch(0.93_0_0)] p-3">
              <Link href="/" className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-body text-[oklch(0.48_0_0)]">
                <ExternalLink className="h-4 w-4" />
                返回前台網站
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
