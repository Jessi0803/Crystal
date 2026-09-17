/**
 * 網站設定後台
 * 路由：/admin/settings
 * 僅限 admin 角色存取
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Gift, Megaphone, Save, Settings, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.siteSettings.admin.useQuery();
  const updateSettings = trpc.siteSettings.update.useMutation({
    onSuccess: async updatedSettings => {
      utils.siteSettings.admin.setData(undefined, updatedSettings);
      utils.siteSettings.public.setData(undefined, updatedSettings);
      toast.success("網站設定已更新");
      await Promise.all([
        utils.siteSettings.admin.invalidate(),
        utils.siteSettings.public.invalidate(),
      ]);
    },
    onError: err => toast.error(err.message || "更新網站設定失敗"),
  });

  const [announcementText, setAnnouncementText] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);

  useEffect(() => {
    if (!settings) return;
    setAnnouncementText(settings.announcementText);
    setAnnouncementEnabled(settings.announcementEnabled);
  }, [settings]);

  if (!authLoading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!authLoading && user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0_0)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1
            className="text-xl mb-2 text-[oklch(0.1_0_0)]"
            style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}
          >
            無存取權限
          </h1>
          <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-6">
            此頁面僅限管理員存取。
          </p>
          <button className="btn-primary" onClick={() => setLocation("/")}>
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const save = () => {
    updateSettings.mutate({
      announcementText,
      announcementEnabled,
    });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <div className="bg-white border-b border-[oklch(0.93_0_0)] sticky top-14 lg:top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[oklch(0.58_0_0)]">SITE SETTINGS</p>
            <h1
              className="mt-1 text-lg text-[oklch(0.1_0_0)]"
              style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}
            >
              網站設定
            </h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="bg-white border border-[oklch(0.93_0_0)] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-[oklch(0.94_0_0)]">
              <Settings className="w-5 h-5 text-[oklch(0.25_0_0)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[oklch(0.12_0_0)]">
                全站公告
              </p>
              <p className="text-xs text-[oklch(0.52_0_0)] font-body mt-1">
                這裡會控制網站上方循環顯示的活動文字。
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-[oklch(0.93_0_0)] p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[oklch(0.35_0_0)]" />
              <p className="text-sm font-medium text-[oklch(0.12_0_0)]">
                公告內容
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-body text-[oklch(0.35_0_0)]">
              <Switch
                checked={announcementEnabled}
                disabled={isLoading || updateSettings.isPending}
                onCheckedChange={setAnnouncementEnabled}
              />
              顯示跑馬燈
            </label>
          </div>

          <label className="block">
            <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-2">
              公告文字
            </span>
            <textarea
              value={announcementText}
              disabled={isLoading || updateSettings.isPending}
              maxLength={200}
              onChange={e => setAnnouncementText(e.target.value)}
              className="w-full min-h-28 border border-[oklch(0.86_0_0)] px-3 py-3 text-sm font-body leading-relaxed disabled:bg-[oklch(0.96_0_0)]"
            />
            <span className="block text-right text-[11px] text-[oklch(0.58_0_0)] font-body mt-1">
              {announcementText.length}/200
            </span>
          </label>

          <div>
            <p className="text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-2">
              前台預覽
            </p>
            <div className="bg-[oklch(0.985_0_0)] border border-[oklch(0.92_0_0)] py-2 overflow-hidden">
              <div className="flex whitespace-nowrap">
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <span
                      key={i}
                      className="px-8 shrink-0 text-[0.6rem] tracking-[0.25em] font-body text-[oklch(0.45_0_0)] uppercase"
                    >
                      {announcementEnabled && announcementText.trim()
                        ? `${announcementText.trim()} `
                        : "跑馬燈已關閉 "}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={isLoading || updateSettings.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {updateSettings.isPending ? "儲存中…" : "儲存設定"}
            </button>
          </div>
        </section>

        <LineFriendRewardSettings />
      </main>
    </div>
  );
}

function LineFriendRewardSettings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.coupons.adminLineRewardSettings.useQuery();
  const { data: templates = [], isLoading: templatesLoading } = trpc.coupons.adminActiveTemplates.useQuery();
  const [enabled, setEnabled] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setTemplateId(settings.templateId);
  }, [settings]);

  const saveSettings = trpc.coupons.adminSaveLineRewardSettings.useMutation({
    onSuccess: async saved => {
      utils.coupons.adminLineRewardSettings.setData(undefined, saved);
      toast.success("LINE 好友綁定禮設定已更新");
      await utils.coupons.adminLineRewardSettings.invalidate();
    },
    onError: err => toast.error(err.message || "更新 LINE 好友綁定禮失敗"),
  });

  const busy = isLoading || templatesLoading || saveSettings.isPending;
  // 目前設定的模板若已停用，不會出現在啟用中清單，需提醒管理員重新選擇
  const selectedIsActive = templateId == null || templates.some(template => template.id === templateId);

  return (
    <section className="bg-white border border-[oklch(0.93_0_0)] p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-[oklch(0.35_0_0)]" />
          <div>
            <p className="text-sm font-medium text-[oklch(0.12_0_0)]">LINE 好友綁定禮</p>
            <p className="text-xs text-[oklch(0.52_0_0)] font-body mt-1">
              會員綁定 LINE 並確認已加入官方帳號好友後，自動發放一張優惠券（每位會員、每個 LINE 帳號限領一次）。
            </p>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-body text-[oklch(0.35_0_0)] shrink-0">
          <Switch checked={enabled} disabled={busy} onCheckedChange={setEnabled} />
          {enabled ? "開啟" : "關閉"}
        </label>
      </div>

      <label className="block">
        <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-2">
          好友綁定後贈送
        </span>
        <select
          value={templateId ?? ""}
          disabled={busy}
          onChange={e => setTemplateId(e.target.value ? Number(e.target.value) : null)}
          className="w-full sm:max-w-md border border-[oklch(0.86_0_0)] px-3 py-2.5 text-sm font-body bg-white disabled:bg-[oklch(0.96_0_0)]"
        >
          <option value="">請選擇優惠券</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}（折 NT$ {template.discountAmount.toLocaleString()}）
            </option>
          ))}
        </select>
        {!selectedIsActive && (
          <span className="block text-xs text-amber-700 font-body mt-2">
            目前設定的優惠券已停用，會員暫時無法領取，請重新選擇。
          </span>
        )}
        {templates.length === 0 && !templatesLoading && (
          <span className="block text-xs text-[oklch(0.52_0_0)] font-body mt-2">
            尚無啟用中的優惠券，請先到
            <Link href="/admin/coupons" className="underline mx-1">優惠券管理</Link>
            建立。
          </span>
        )}
      </label>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveSettings.mutate({ enabled, templateId })}
          disabled={busy || (enabled && !templateId)}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saveSettings.isPending ? "儲存中…" : "儲存"}
        </button>
      </div>
    </section>
  );
}
