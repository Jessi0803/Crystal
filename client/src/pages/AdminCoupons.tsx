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
import { MEMBER_COUPON_STATUS_LABELS, type MemberCouponDisplayStatus } from "@shared/coupons";
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
// DialogContent 預設帶 sm:max-w-lg，需以同斷點覆寫；內容區自行捲動，標題與按鈕固定
const dialogShellClass =
  "flex flex-col gap-0 overflow-hidden rounded-none p-0 w-[calc(100%-1.5rem)] max-w-none max-h-[calc(100dvh-1.5rem)]";
const actionButtonClass =
  "inline-flex items-center justify-center gap-1 border border-[oklch(0.86_0_0)] px-3 py-2 text-xs font-body hover:bg-[oklch(0.96_0_0)]";

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
      <DialogContent className={`${dialogShellClass} sm:max-w-lg`}>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[oklch(0.93_0_0)] px-5 py-4 pr-12 sm:px-6 sm:py-5">
            <DialogTitle className="text-lg font-normal" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              {template ? "編輯優惠券" : "新增優惠券"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-body text-[oklch(0.52_0_0)]">
              {template
                ? "修改只影響之後發出的券，已發出的券維持原本的金額、低消與到期日。"
                : "建立優惠券規則，建立後不會自動發給任何會員。"}
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {/* 整張優惠券的狀態，與下方各項規則分開 */}
            <div className="flex items-start justify-between gap-4 border border-[oklch(0.9_0_0)] bg-[oklch(0.985_0_0)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[oklch(0.15_0_0)]">
                  優惠券狀態：{form.isActive ? "啟用中" : "已停用"}
                </p>
                <p className="mt-0.5 text-xs font-body leading-relaxed text-[oklch(0.52_0_0)]">
                  {form.isActive
                    ? "可以發放給會員，也可設為 LINE 好友禮。"
                    : "停用後不能再發放；已發出的券仍可使用至到期。"}
                </p>
              </div>
              <Switch
                aria-label="啟用這張優惠券"
                className="mt-0.5 shrink-0"
                checked={form.isActive}
                onCheckedChange={value => set("isActive", value)}
              />
            </div>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <label className="block sm:w-1/2 sm:pr-2">
              <span className={labelClass}>每位會員最多領取（張）</span>
              <input
                inputMode="numeric"
                value={form.maxPerUser}
                onChange={e => set("maxPerUser", e.target.value)}
                className={inputClass}
              />
            </label>

            {error && <p className="text-xs font-body text-red-600">{error}</p>}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-[oklch(0.93_0_0)] px-5 py-3 sm:px-6 sm:py-4">
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] tracking-widest font-body text-[oklch(0.55_0_0)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-body text-[oklch(0.2_0_0)]">{value}</dd>
    </div>
  );
}

type RecordFilter = "all" | MemberCouponDisplayStatus;

const RECORD_FILTERS: { key: RecordFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "available", label: "可使用" },
  { key: "pending", label: "待付款" },
  { key: "used", label: "已使用" },
  { key: "expired", label: "已過期" },
];

function StatusBadge({ status }: { status: MemberCouponDisplayStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-[11px] font-body ${COUPON_STATUS_BADGE_CLASS[status]}`}>
      {MEMBER_COUPON_STATUS_LABELS[status]}
    </span>
  );
}

function TemplateDetailDialog({ templateId, onClose }: { templateId: number | null; onClose: () => void }) {
  const [filter, setFilter] = useState<RecordFilter>("all");
  const { data, isLoading } = trpc.coupons.adminGet.useQuery(
    { id: templateId ?? 0 },
    { enabled: templateId != null }
  );
  const template = data?.template;
  const stats = data?.stats;
  const records = data?.records ?? [];
  const visibleRecords = filter === "all" ? records : records.filter(record => record.displayStatus === filter);

  useEffect(() => {
    setFilter("all");
  }, [templateId]);

  const statItems = [
    ["已發放", stats?.issued],
    ["未使用", stats?.unused],
    ["已使用", stats?.used],
    ["已過期", stats?.expired],
  ] as const;

  return (
    <Dialog open={templateId != null} onOpenChange={next => !next && onClose()}>
      <DialogContent className={`${dialogShellClass} sm:max-w-4xl`}>
        <div className="shrink-0 border-b border-[oklch(0.93_0_0)] px-5 py-4 pr-12 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-lg font-normal" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              {template?.name ?? "優惠券詳情"}
            </DialogTitle>
            {template && (
              <span
                className={`border px-2 py-0.5 text-[11px] font-body ${
                  template.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-[oklch(0.86_0_0)] bg-[oklch(0.96_0_0)] text-[oklch(0.45_0_0)]"
                }`}
              >
                {template.isActive ? "啟用中" : "已停用"}
              </span>
            )}
          </div>
          <DialogDescription className="sr-only">優惠券規則、發放統計與發放紀錄</DialogDescription>
          {template && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <SummaryItem label="折抵金額" value={formatMoney(template.discountAmount)} />
              <SummaryItem label="最低消費" value={template.minOrderAmount > 0 ? formatMoney(template.minOrderAmount) : "無低消"} />
              <SummaryItem label="有效期限" value={formatCouponValidity(template)} />
              <SummaryItem label="每人上限" value={`${template.maxPerUser} 張`} />
            </dl>
          )}
        </div>

        {isLoading || !data ? (
          <p className="px-6 py-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">載入中...</p>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid grid-cols-2 gap-px border border-[oklch(0.93_0_0)] bg-[oklch(0.93_0_0)] sm:grid-cols-4">
              {statItems.map(([label, value]) => (
                <div key={label} className="bg-white px-4 py-3">
                  <p className="text-[10px] tracking-widest font-body text-[oklch(0.55_0_0)]">{label}</p>
                  <p className="mt-1 text-xl text-[oklch(0.15_0_0)]">{value ?? 0}</p>
                </div>
              ))}
            </div>
            {(stats?.reserved ?? 0) > 0 && (
              <p className="text-xs font-body text-[oklch(0.52_0_0)]">另有 {stats?.reserved} 張已套用在待付款訂單。</p>
            )}

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[oklch(0.12_0_0)]">
                  發放紀錄 <span className="font-normal text-[oklch(0.55_0_0)]">({visibleRecords.length})</span>
                </p>
                {records.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {RECORD_FILTERS.map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key)}
                        className={`border px-2.5 py-1 text-xs font-body ${
                          filter === item.key
                            ? "border-[oklch(0.15_0_0)] bg-[oklch(0.15_0_0)] text-white"
                            : "border-[oklch(0.86_0_0)] text-[oklch(0.45_0_0)] hover:bg-[oklch(0.96_0_0)]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {visibleRecords.length === 0 ? (
                <p className="border border-[oklch(0.93_0_0)] py-6 text-center text-xs font-body text-[oklch(0.5_0_0)]">
                  {records.length === 0 ? "尚未發放給任何會員" : "沒有符合條件的紀錄"}
                </p>
              ) : (
                <>
                  {/* 手機：卡片 */}
                  <ul className="divide-y divide-[oklch(0.93_0_0)] border border-[oklch(0.93_0_0)] md:hidden">
                    {visibleRecords.map(record => (
                      <li key={record.id} className="space-y-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[oklch(0.2_0_0)]">{record.userName || "未填姓名"}</p>
                            <p className="truncate text-xs font-body text-[oklch(0.55_0_0)]">
                              {record.userEmail || `會員 #${record.userId}`}
                            </p>
                          </div>
                          <StatusBadge status={record.displayStatus} />
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-xs font-body">
                          <div>
                            <dt className="text-[oklch(0.55_0_0)]">發放</dt>
                            <dd className="text-[oklch(0.3_0_0)]">{formatCouponDate(record.issuedAt)}</dd>
                          </div>
                          <div>
                            <dt className="text-[oklch(0.55_0_0)]">到期</dt>
                            <dd className="text-[oklch(0.3_0_0)]">{formatCouponDate(record.expiresAt)}</dd>
                          </div>
                          {record.orderMerchantTradeNo && (
                            <div className="col-span-2">
                              <dt className="text-[oklch(0.55_0_0)]">使用訂單</dt>
                              <dd className="break-all text-[oklch(0.3_0_0)]">#{record.orderMerchantTradeNo}</dd>
                            </div>
                          )}
                        </dl>
                      </li>
                    ))}
                  </ul>

                  {/* 桌機：表格 */}
                  <div className="hidden border border-[oklch(0.93_0_0)] md:block">
                    <table className="w-full table-fixed text-left text-xs font-body">
                      <thead className="bg-[oklch(0.975_0_0)] text-[oklch(0.5_0_0)]">
                        <tr>
                          <th className="w-[34%] px-3 py-2 font-normal">會員</th>
                          <th className="px-3 py-2 font-normal">發放日期</th>
                          <th className="px-3 py-2 font-normal">到期日期</th>
                          <th className="px-3 py-2 font-normal">使用狀態</th>
                          <th className="w-[22%] px-3 py-2 font-normal">使用訂單</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[oklch(0.93_0_0)]">
                        {visibleRecords.map(record => (
                          <tr key={record.id}>
                            <td className="px-3 py-2">
                              <p className="truncate text-[oklch(0.2_0_0)]">{record.userName || "未填姓名"}</p>
                              <p className="truncate text-[oklch(0.55_0_0)]">{record.userEmail || `會員 #${record.userId}`}</p>
                            </td>
                            <td className="px-3 py-2 text-[oklch(0.4_0_0)]">{formatCouponDate(record.issuedAt)}</td>
                            <td className="px-3 py-2 text-[oklch(0.4_0_0)]">{formatCouponDate(record.expiresAt)}</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={record.displayStatus} />
                            </td>
                            <td className="break-all px-3 py-2 text-[oklch(0.4_0_0)]">
                              {record.orderMerchantTradeNo ? `#${record.orderMerchantTradeNo}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap border px-2 py-1 text-[11px] font-body ${
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-[oklch(0.86_0_0)] bg-[oklch(0.96_0_0)] text-[oklch(0.45_0_0)]"
      }`}
    >
      {isActive ? "啟用" : "停用"}
    </span>
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
  const openEdit = (template: EditableTemplate) => {
    setEditing(template);
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <div className="bg-white border-b border-[oklch(0.93_0_0)] sticky top-14 lg:top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[oklch(0.58_0_0)]">COUPONS</p>
            <h1 className="mt-1 text-lg text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              優惠券管理
            </h1>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs font-body bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)]"
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
            <>
              {/* 手機：卡片 */}
              <ul className="divide-y divide-[oklch(0.93_0_0)] md:hidden">
                {templates.map(template => (
                  <li key={template.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[oklch(0.15_0_0)]">{template.name}</p>
                      <TemplateStatusBadge isActive={template.isActive} />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <SummaryItem label="折抵金額" value={formatMoney(template.discountAmount)} />
                      <SummaryItem label="最低消費" value={template.minOrderAmount > 0 ? formatMoney(template.minOrderAmount) : "無低消"} />
                      <SummaryItem label="有效期限" value={formatCouponValidity(template)} />
                      <SummaryItem label="已發放 / 已使用" value={`${template.stats.issued} / ${template.stats.used}`} />
                    </dl>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => openEdit(template)} className={actionButtonClass}>
                        <Pencil className="w-3.5 h-3.5" />
                        編輯
                      </button>
                      <button type="button" onClick={() => setDetailId(template.id)} className={actionButtonClass}>
                        <Eye className="w-3.5 h-3.5" />
                        查看
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 桌機：表格 */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm font-body">
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
                        <td className="px-4 py-3 whitespace-nowrap">{formatMoney(template.discountAmount)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-[oklch(0.4_0_0)]">
                          {template.minOrderAmount > 0 ? formatMoney(template.minOrderAmount) : "無低消"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[oklch(0.4_0_0)]">{formatCouponValidity(template)}</td>
                        <td className="px-4 py-3 text-right">{template.stats.issued}</td>
                        <td className="px-4 py-3 text-right">{template.stats.used}</td>
                        <td className="px-4 py-3">
                          <TemplateStatusBadge isActive={template.isActive} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button type="button" onClick={() => openEdit(template)} className={actionButtonClass}>
                              <Pencil className="w-3 h-3" />
                              編輯
                            </button>
                            <button type="button" onClick={() => setDetailId(template.id)} className={actionButtonClass}>
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
            </>
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
