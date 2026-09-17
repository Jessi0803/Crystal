/**
 * 優惠券管理後台
 * 路由：/admin/coupons
 * 僅限 admin 角色存取（API 另以 adminProcedure 驗證）
 */
import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Eye, Pencil, Plus, TicketPercent, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MEMBER_COUPON_STATUS_LABELS } from "@shared/coupons";
import {
  COUPON_STATUS_BADGE_CLASS,
  formatCouponDate,
  formatCouponMinimum,
  formatCouponValidity,
} from "@/lib/coupons";

type ValidityType = "days_after_issue" | "fixed_date";

type TemplateForm = {
  name: string;
  discountAmount: string;
  minOrderAmount: string;
  validityType: ValidityType;
  validDays: string;
  fixedExpiresOn: string;
  maxPerUser: string;
  isActive: boolean;
};

type EditableTemplate = {
  id: number;
  name: string;
  discountAmount: number;
  minOrderAmount: number;
  validityType: ValidityType;
  validDays: number | null;
  fixedExpiresAt: Date | null;
  maxPerUser: number;
  isActive: boolean;
};

const EMPTY_FORM: TemplateForm = {
  name: "",
  discountAmount: "50",
  minOrderAmount: "0",
  validityType: "days_after_issue",
  validDays: "30",
  fixedExpiresOn: "",
  maxPerUser: "1",
  isActive: true,
};

const inputClass =
  "w-full border border-[oklch(0.86_0_0)] px-3 py-2.5 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)] disabled:bg-[oklch(0.96_0_0)]";
const inlineInputClass =
  "border border-[oklch(0.86_0_0)] px-2.5 py-1.5 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)] disabled:bg-[oklch(0.96_0_0)] disabled:text-[oklch(0.6_0_0)]";
const labelClass = "block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1";

function formatMoney(value: number) {
  return `NT$ ${value.toLocaleString()}`;
}

function toDateInputValue(value: Date | null) {
  if (!value) return "";
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}

function toForm(template: EditableTemplate): TemplateForm {
  return {
    name: template.name,
    discountAmount: String(template.discountAmount),
    minOrderAmount: String(template.minOrderAmount),
    validityType: template.validityType,
    validDays: template.validDays == null ? "30" : String(template.validDays),
    fixedExpiresOn: toDateInputValue(template.fixedExpiresAt),
    maxPerUser: String(template.maxPerUser),
    isActive: template.isActive,
  };
}

function parseWholeNumber(value: string) {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

/** tRPC 的 zod 驗證錯誤訊息是 JSON 字串，取出第一則給管理員看 */
function readableError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  try {
    const issues = JSON.parse(message) as { message?: string }[];
    return issues[0]?.message ?? fallback;
  } catch {
    return message;
  }
}

function TemplateFormDialog({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: EditableTemplate | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(template ? toForm(template) : EMPTY_FORM);
    setError(null);
  }, [open, template]);

  const onSaved = async () => {
    toast.success(template ? "優惠券已更新" : "優惠券已建立");
    await Promise.all([
      utils.coupons.adminList.invalidate(),
      utils.coupons.adminActiveTemplates.invalidate(),
      template ? utils.coupons.adminGet.invalidate({ id: template.id }) : Promise.resolve(),
    ]);
    onClose();
  };
  const onFailed = (err: { message?: string }) => setError(readableError(err.message, "儲存優惠券失敗"));
  const createTemplate = trpc.coupons.adminCreate.useMutation({ onSuccess: onSaved, onError: onFailed });
  const updateTemplate = trpc.coupons.adminUpdate.useMutation({ onSuccess: onSaved, onError: onFailed });
  const saving = createTemplate.isPending || updateTemplate.isPending;

  const set = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const discountAmount = parseWholeNumber(form.discountAmount);
    const minOrderAmount = parseWholeNumber(form.minOrderAmount);
    const maxPerUser = parseWholeNumber(form.maxPerUser);
    const validDays = parseWholeNumber(form.validDays);
    if (!form.name.trim()) return setError("請輸入優惠券名稱");
    if (!discountAmount) return setError("折抵金額需為大於 0 的整數");
    if (minOrderAmount == null) return setError("最低消費需為 0 以上的整數");
    if (!maxPerUser) return setError("每位會員領取上限至少 1 張");
    if (form.validityType === "days_after_issue" && !validDays) return setError("請輸入發放後有效天數");
    if (form.validityType === "fixed_date" && !form.fixedExpiresOn) return setError("請選擇截止日期");

    // 伺服器會重新驗證所有欄位
    const data = {
      name: form.name.trim(),
      discountAmount,
      minOrderAmount,
      validityType: form.validityType,
      validDays: form.validityType === "days_after_issue" ? validDays : null,
      fixedExpiresOn: form.validityType === "fixed_date" ? form.fixedExpiresOn : null,
      maxPerUser,
      isActive: form.isActive,
    };
    setError(null);
    if (template) updateTemplate.mutate({ id: template.id, data });
    else createTemplate.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={next => !next && !saving && onClose()}>
      <DialogContent className="max-w-lg rounded-none p-0">
        <form onSubmit={submit}>
          <div className="border-b border-[oklch(0.93_0_0)] px-6 py-5">
            <DialogTitle className="text-lg font-normal" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              {template ? "編輯優惠券" : "新增優惠券"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-body text-[oklch(0.52_0_0)]">
              {template
                ? "修改只影響之後發出的券，已發出的券維持原本的金額、低消與到期日。"
                : "建立優惠券規則，建立後不會自動發給任何會員。"}
            </DialogDescription>
          </div>

          <div className="space-y-4 px-6 py-5">
            <label className="block">
              <span className={labelClass}>優惠券名稱</span>
              <input
                value={form.name}
                maxLength={100}
                onChange={e => set("name", e.target.value)}
                placeholder="例如：LINE 好友禮"
                className={inputClass}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>折抵金額（NT$）</span>
                <input
                  inputMode="numeric"
                  value={form.discountAmount}
                  onChange={e => set("discountAmount", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>最低消費（NT$，0 = 無）</span>
                <input
                  inputMode="numeric"
                  value={form.minOrderAmount}
                  onChange={e => set("minOrderAmount", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <fieldset>
              <legend className={labelClass}>有效期限</legend>
              <div className="space-y-2 text-sm font-body">
                <label className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                  <input
                    type="radio"
                    name="validityType"
                    checked={form.validityType === "days_after_issue"}
                    onChange={() => set("validityType", "days_after_issue")}
                  />
                  發放後
                  <input
                    inputMode="numeric"
                    aria-label="有效天數"
                    value={form.validDays}
                    disabled={form.validityType !== "days_after_issue"}
                    onChange={e => set("validDays", e.target.value)}
                    className={`${inlineInputClass} w-20`}
                  />
                  天內有效
                </label>
                <label className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                  <input
                    type="radio"
                    name="validityType"
                    checked={form.validityType === "fixed_date"}
                    onChange={() => set("validityType", "fixed_date")}
                  />
                  固定截止日期
                  <input
                    type="date"
                    aria-label="截止日期"
                    value={form.fixedExpiresOn}
                    disabled={form.validityType !== "fixed_date"}
                    onChange={e => set("fixedExpiresOn", e.target.value)}
                    className={inlineInputClass}
                  />
                </label>
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-4 items-end">
              <label className="block">
                <span className={labelClass}>每位會員最多領取（張）</span>
                <input
                  inputMode="numeric"
                  value={form.maxPerUser}
                  onChange={e => set("maxPerUser", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="inline-flex items-center gap-2 pb-2.5 text-sm font-body text-[oklch(0.3_0_0)]">
                <Switch checked={form.isActive} onCheckedChange={value => set("isActive", value)} />
                {form.isActive ? "啟用" : "停用"}
              </label>
            </div>

            {error && <p className="text-xs font-body text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-[oklch(0.93_0_0)] px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-body text-[oklch(0.4_0_0)]">
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateDetailDialog({ templateId, onClose }: { templateId: number | null; onClose: () => void }) {
  const { data, isLoading } = trpc.coupons.adminGet.useQuery(
    { id: templateId ?? 0 },
    { enabled: templateId != null }
  );
  const template = data?.template;
  const stats = data?.stats;

  return (
    <Dialog open={templateId != null} onOpenChange={next => !next && onClose()}>
      <DialogContent className="max-w-3xl rounded-none p-0 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-[oklch(0.93_0_0)] px-6 py-5">
          <DialogTitle className="text-lg font-normal" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
            {template?.name ?? "優惠券詳情"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs font-body text-[oklch(0.52_0_0)]">
            {template
              ? `折 ${formatMoney(template.discountAmount)} · ${formatCouponMinimum(template.minOrderAmount)} · ${formatCouponValidity(template)} · 每人限 ${template.maxPerUser} 張 · ${template.isActive ? "啟用中" : "已停用"}`
              : "載入中"}
          </DialogDescription>
        </div>

        {isLoading || !data ? (
          <p className="px-6 py-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">載入中...</p>
        ) : (
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 border border-[oklch(0.93_0_0)] divide-x divide-y sm:divide-y-0 divide-[oklch(0.93_0_0)]">
              {[
                ["已發放", stats?.issued],
                ["未使用", stats?.unused],
                ["已使用", stats?.used],
                ["已過期", stats?.expired],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-3">
                  <p className="text-[10px] tracking-widest font-body text-[oklch(0.55_0_0)]">{label}</p>
                  <p className="mt-1 text-lg text-[oklch(0.15_0_0)]">{value ?? 0}</p>
                </div>
              ))}
            </div>
            {(stats?.reserved ?? 0) > 0 && (
              <p className="text-xs font-body text-[oklch(0.52_0_0)]">另有 {stats?.reserved} 張已套用在待付款訂單。</p>
            )}

            <div>
              <p className="text-sm font-medium text-[oklch(0.12_0_0)] mb-2">發放紀錄</p>
              {data.records.length === 0 ? (
                <p className="py-6 text-center text-xs font-body text-[oklch(0.5_0_0)] border border-[oklch(0.93_0_0)]">尚未發放給任何會員</p>
              ) : (
                <div className="overflow-x-auto border border-[oklch(0.93_0_0)]">
                  <table className="w-full min-w-[560px] text-left text-xs font-body">
                    <thead className="bg-[oklch(0.975_0_0)] text-[oklch(0.5_0_0)]">
                      <tr>
                        <th className="px-3 py-2 font-normal">會員</th>
                        <th className="px-3 py-2 font-normal">發放日期</th>
                        <th className="px-3 py-2 font-normal">到期日期</th>
                        <th className="px-3 py-2 font-normal">使用狀態</th>
                        <th className="px-3 py-2 font-normal">使用訂單</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[oklch(0.93_0_0)]">
                      {data.records.map(record => (
                        <tr key={record.id}>
                          <td className="px-3 py-2">
                            <p className="text-[oklch(0.2_0_0)]">{record.userName || "未填姓名"}</p>
                            <p className="text-[oklch(0.55_0_0)]">{record.userEmail || `會員 #${record.userId}`}</p>
                          </td>
                          <td className="px-3 py-2 text-[oklch(0.4_0_0)]">{formatCouponDate(record.issuedAt)}</td>
                          <td className="px-3 py-2 text-[oklch(0.4_0_0)]">{formatCouponDate(record.expiresAt)}</td>
                          <td className="px-3 py-2">
                            <span className={`border px-2 py-0.5 ${COUPON_STATUS_BADGE_CLASS[record.displayStatus]}`}>
                              {MEMBER_COUPON_STATUS_LABELS[record.displayStatus]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[oklch(0.4_0_0)]">
                            {record.orderMerchantTradeNo ? `#${record.orderMerchantTradeNo}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCoupons() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: templates = [], isLoading, error } = trpc.coupons.adminList.useQuery(undefined, { enabled: isAdmin });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableTemplate | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  if (!authLoading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!authLoading && user && !isAdmin) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0_0)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl mb-2 text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
            無存取權限
          </h1>
          <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-6">此頁面僅限管理員存取。</p>
          <button className="btn-primary" onClick={() => setLocation("/")}>
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <div className="bg-white border-b border-[oklch(0.93_0_0)] sticky top-14 lg:top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[oklch(0.58_0_0)]">COUPONS</p>
            <h1 className="mt-1 text-lg text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              優惠券管理
            </h1>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)]"
          >
            <Plus className="w-3.5 h-3.5" />
            新增優惠券
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="bg-white border border-[oklch(0.93_0_0)]">
          {isLoading ? (
            <p className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">載入優惠券中...</p>
          ) : error ? (
            <p className="p-10 text-center text-sm font-body text-red-600">載入優惠券失敗，請稍後再試</p>
          ) : templates.length === 0 ? (
            <div className="p-10 text-center">
              <TicketPercent className="w-8 h-8 text-[oklch(0.7_0_0)] mx-auto mb-3" />
              <p className="text-sm font-body text-[oklch(0.5_0_0)]">尚未建立任何優惠券</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm font-body">
                <thead className="border-b border-[oklch(0.93_0_0)] text-[11px] tracking-widest text-[oklch(0.5_0_0)]">
                  <tr>
                    <th className="px-4 py-3 font-normal">優惠券名稱</th>
                    <th className="px-4 py-3 font-normal">折抵金額</th>
                    <th className="px-4 py-3 font-normal">最低消費</th>
                    <th className="px-4 py-3 font-normal">有效期限</th>
                    <th className="px-4 py-3 font-normal text-right">已發放</th>
                    <th className="px-4 py-3 font-normal text-right">已使用</th>
                    <th className="px-4 py-3 font-normal">狀態</th>
                    <th className="px-4 py-3 font-normal text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[oklch(0.93_0_0)]">
                  {templates.map(template => (
                    <tr key={template.id}>
                      <td className="px-4 py-3 text-[oklch(0.15_0_0)]">{template.name}</td>
                      <td className="px-4 py-3">{formatMoney(template.discountAmount)}</td>
                      <td className="px-4 py-3 text-[oklch(0.4_0_0)]">
                        {template.minOrderAmount > 0 ? formatMoney(template.minOrderAmount) : "無低消"}
                      </td>
                      <td className="px-4 py-3 text-[oklch(0.4_0_0)]">{formatCouponValidity(template)}</td>
                      <td className="px-4 py-3 text-right">{template.stats.issued}</td>
                      <td className="px-4 py-3 text-right">{template.stats.used}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] border px-2 py-1 ${
                            template.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-[oklch(0.86_0_0)] bg-[oklch(0.96_0_0)] text-[oklch(0.45_0_0)]"
                          }`}
                        >
                          {template.isActive ? "啟用" : "停用"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(template);
                              setFormOpen(true);
                            }}
                            className="inline-flex items-center gap-1 border border-[oklch(0.86_0_0)] px-2.5 py-1.5 text-xs hover:bg-[oklch(0.96_0_0)]"
                          >
                            <Pencil className="w-3 h-3" />
                            編輯
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailId(template.id)}
                            className="inline-flex items-center gap-1 border border-[oklch(0.86_0_0)] px-2.5 py-1.5 text-xs hover:bg-[oklch(0.96_0_0)]"
                          >
                            <Eye className="w-3 h-3" />
                            查看
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="mt-3 text-xs font-body text-[oklch(0.55_0_0)]">
          優惠券以固定金額折抵商品小計（不含運費），每筆訂單限用一張。停用後不能再發放，已發出的券仍可使用至到期。
        </p>
      </main>

      <TemplateFormDialog open={formOpen} template={editing} onClose={() => setFormOpen(false)} />
      <TemplateDetailDialog templateId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
