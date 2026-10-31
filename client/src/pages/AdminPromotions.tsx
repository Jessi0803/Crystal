import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil, Plus, TicketPercent } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/appRouter";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const empty = {
  id: undefined as number | undefined,
  name: "",
  threshold: "1111",
  discountAmount: "111",
  maxDiscount: "",
  startsAt: "",
  endsAt: "",
  isActive: false,
};
function taipeiInput(value: Date) {
  return new Date(value.getTime() + 8 * 3600_000).toISOString().slice(0, 16);
}
type Promotion =
  inferRouterOutputs<AppRouter>["promotions"]["adminList"][number];
const inputClass =
  "min-w-0 w-full border border-[oklch(0.86_0_0)] bg-white px-3 py-2.5 text-sm font-body text-[oklch(0.15_0_0)] outline-none transition-colors focus:border-[oklch(0.2_0_0)]";
const labelClass =
  "mb-1.5 block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body";
const actionClass =
  "inline-flex min-h-10 items-center justify-center gap-1.5 border border-[oklch(0.86_0_0)] px-3 py-2 text-xs font-body text-[oklch(0.3_0_0)] transition-colors hover:border-[oklch(0.55_0_0)] hover:bg-[oklch(0.98_0_0)]";
const titleStyle = { fontFamily: "'Noto Serif TC', serif", fontWeight: 300 };
function formatTime(value: Date) {
  return value.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
function PromotionStatus({ promotion }: { promotion: Promotion }) {
  const now = new Date();
  const status = !promotion.isActive
    ? "已停用"
    : now < promotion.startsAt
      ? "尚未開始"
      : now >= promotion.endsAt
        ? "已結束"
        : "進行中";
  const color =
    status === "進行中"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "尚未開始"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-[oklch(0.86_0_0)] bg-[oklch(0.96_0_0)] text-[oklch(0.45_0_0)]";
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap border px-2 py-1 text-[11px] font-body ${color}`}
    >
      {status}
    </span>
  );
}
export default function AdminPromotions() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const list = trpc.promotions.adminList.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const save = trpc.promotions.adminSave.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.promotions.adminList.invalidate(),
        utils.promotions.active.invalidate(),
      ]);
      setOpen(false);
      toast.success("活動已儲存；既有訂單保留原規則");
    },
    onError: error => toast.error(error.message),
  });
  if (loading)
    return (
      <p className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">
        載入中…
      </p>
    );
  if (user?.role !== "admin")
    return (
      <p className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">
        請以管理員帳號登入。
      </p>
    );
  function submit(event: FormEvent) {
    event.preventDefault();
    const startsAt = new Date(`${form.startsAt}:00+08:00`);
    const endsAt = new Date(`${form.endsAt}:00+08:00`);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime())
    )
      return toast.error("請輸入有效的活動時間");
    save.mutate({
      id: form.id,
      name: form.name,
      threshold: Number(form.threshold),
      discountAmount: Number(form.discountAmount),
      maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      isActive: form.isActive,
    });
  }
  const openCreate = () => {
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (row: Promotion) => {
    setForm({
      id: row.id,
      name: row.name,
      threshold: String(row.threshold),
      discountAmount: String(row.discountAmount),
      maxDiscount: row.maxDiscount == null ? "" : String(row.maxDiscount),
      startsAt: taipeiInput(row.startsAt),
      endsAt: taipeiInput(row.endsAt),
      isActive: row.isActive,
    });
    setOpen(true);
  };
  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <div className="sticky top-14 z-30 border-b border-[oklch(0.93_0_0)] bg-white lg:top-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[oklch(0.58_0_0)]">
              PROMOTIONS
            </p>
            <h1
              className="mt-1 text-lg text-[oklch(0.1_0_0)]"
              style={titleStyle}
            >
              活動管理
            </h1>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-2 bg-[oklch(0.15_0_0)] px-4 py-2.5 text-xs font-body text-white transition-colors hover:bg-[oklch(0.25_0_0)]"
          >
            <Plus className="h-3.5 w-3.5" />
            新增活動
          </button>
        </div>
      </div>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-body leading-relaxed text-[oklch(0.5_0_0)]">
          設定全館滿額自動折抵，可併用會員優惠券。客製單保留下單時規則，報價後於尾款折抵。
        </p>
        {open && (
          <section
            className="border border-[oklch(0.93_0_0)] bg-white"
            aria-labelledby="promotion-form-title"
          >
            <form onSubmit={submit}>
              <div className="border-b border-[oklch(0.93_0_0)] px-5 py-4 sm:px-6">
                <h2
                  id="promotion-form-title"
                  className="text-lg text-[oklch(0.15_0_0)]"
                  style={titleStyle}
                >
                  {form.id ? "編輯活動" : "新增活動"}
                </h2>
                <p className="mt-1 text-xs font-body leading-relaxed text-[oklch(0.52_0_0)]">
                  修改只影響之後成立的訂單，既有訂單保留原活動規則。
                </p>
              </div>
              <div className="space-y-5 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4 border border-[oklch(0.9_0_0)] bg-[oklch(0.985_0_0)] px-4 py-3">
                  <div>
                    <label
                      htmlFor="promotion-active"
                      className="text-sm font-body font-medium text-[oklch(0.15_0_0)]"
                    >
                      活動狀態：{form.isActive ? "啟用中" : "已停用"}
                    </label>
                    <p className="mt-0.5 text-xs font-body leading-relaxed text-[oklch(0.52_0_0)]">
                      啟用後依活動期間生效，停用不影響已保留的訂單優惠。
                    </p>
                  </div>
                  <Switch
                    id="promotion-active"
                    className="mt-0.5 shrink-0"
                    checked={form.isActive}
                    onCheckedChange={value =>
                      setForm({ ...form, isActive: value })
                    }
                  />
                </div>
                <label className="block">
                  <span className={labelClass}>活動名稱</span>
                  <input
                    required
                    maxLength={100}
                    className={inputClass}
                    placeholder="例如：雙十一全館滿額折"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  {(["startsAt", "endsAt"] as const).map(key => (
                    <label key={key} className="min-w-0 block">
                      <span className={labelClass}>
                        {key === "startsAt" ? "開始時間" : "結束時間"}
                        （台灣時間）
                      </span>
                      <input
                        required
                        type="datetime-local"
                        className={`${inputClass} block box-border max-w-full appearance-none [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:min-w-0`}
                        value={form[key]}
                        onChange={e =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <p className="!mt-2 text-xs font-body leading-relaxed text-[oklch(0.55_0_0)]">
                  結束時刻不包含在活動期間內；若活動到 11 月 11
                  日全天，結束時間請填 11 月 12 日 00:00。
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(
                    ["threshold", "discountAmount", "maxDiscount"] as const
                  ).map(key => (
                    <label key={key} className="min-w-0 block">
                      <span className={labelClass}>
                        {key === "threshold"
                          ? "每滿金額"
                          : key === "discountAmount"
                            ? "每次折抵"
                            : "折抵上限"}
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-body text-[oklch(0.55_0_0)]">
                          NT$
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="10000000"
                          step="1"
                          required={key !== "maxDiscount"}
                          className={`${inputClass} pl-11`}
                          placeholder={
                            key === "maxDiscount" ? "留空為無上限" : undefined
                          }
                          value={form[key]}
                          onChange={e =>
                            setForm({ ...form, [key]: e.target.value })
                          }
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[oklch(0.93_0_0)] px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={actionClass}
                >
                  取消
                </button>
                <button
                  disabled={save.isPending}
                  className="min-h-10 bg-[oklch(0.15_0_0)] px-5 py-2 text-xs font-body text-white transition-colors hover:bg-[oklch(0.25_0_0)] disabled:opacity-50"
                >
                  {save.isPending ? "儲存中…" : "儲存"}
                </button>
              </div>
            </form>
          </section>
        )}
        <section
          className="border border-[oklch(0.93_0_0)] bg-white"
          aria-label="活動列表"
        >
          {list.isLoading ? (
            <p className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">
              載入活動中…
            </p>
          ) : list.error ? (
            <p
              role="alert"
              className="p-10 text-center text-sm font-body text-red-600"
            >
              {list.error.message}
            </p>
          ) : list.data?.length === 0 ? (
            <div className="p-10 text-center">
              <TicketPercent className="mx-auto mb-3 h-8 w-8 text-[oklch(0.7_0_0)]" />
              <p className="text-sm font-body text-[oklch(0.5_0_0)]">
                尚未建立活動
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-[oklch(0.93_0_0)] md:hidden">
                {list.data?.map(row => (
                  <li key={row.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="min-w-0 break-words text-sm font-body font-medium text-[oklch(0.15_0_0)]">
                        {row.name}
                      </h2>
                      <PromotionStatus promotion={row} />
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs font-body">
                      <div>
                        <dt className="mb-1 text-[11px] text-[oklch(0.55_0_0)]">
                          折抵規則
                        </dt>
                        <dd className="text-[oklch(0.2_0_0)]">
                          每滿 {row.threshold.toLocaleString()} 折{" "}
                          {row.discountAmount.toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="mb-1 text-[11px] text-[oklch(0.55_0_0)]">
                          折抵上限
                        </dt>
                        <dd className="text-[oklch(0.2_0_0)]">
                          {row.maxDiscount == null
                            ? "累進無上限"
                            : `NT$ ${row.maxDiscount.toLocaleString()}`}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="mb-1 text-[11px] text-[oklch(0.55_0_0)]">
                          活動期間（台灣時間）
                        </dt>
                        <dd className="space-y-1 text-[oklch(0.4_0_0)]">
                          <p>開始 {formatTime(row.startsAt)}</p>
                          <p>結束 {formatTime(row.endsAt)}</p>
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      className={`${actionClass} w-full`}
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-3 w-3" />
                      編輯／停用
                    </button>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm font-body">
                  <thead className="border-b border-[oklch(0.93_0_0)] text-[11px] tracking-widest text-[oklch(0.5_0_0)]">
                    <tr>
                      {[
                        "活動名稱",
                        "折抵規則",
                        "折抵上限",
                        "活動期間（台灣時間）",
                        "狀態",
                        "操作",
                      ].map((label, index) => (
                        <th
                          key={label}
                          className={`px-4 py-3 font-normal ${index === 5 ? "text-right" : ""}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[oklch(0.93_0_0)]">
                    {list.data?.map(row => (
                      <tr key={row.id}>
                        <td className="max-w-[14rem] break-words px-4 py-4 text-[oklch(0.15_0_0)]">
                          {row.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-[oklch(0.3_0_0)]">
                          每滿 {row.threshold.toLocaleString()}
                          <br />
                          <span className="mt-1 inline-block text-xs text-[oklch(0.5_0_0)]">
                            折 NT$ {row.discountAmount.toLocaleString()}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-[oklch(0.4_0_0)]">
                          {row.maxDiscount == null
                            ? "累進無上限"
                            : `NT$ ${row.maxDiscount.toLocaleString()}`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs leading-relaxed text-[oklch(0.4_0_0)]">
                          <p>開始 {formatTime(row.startsAt)}</p>
                          <p className="mt-1">結束 {formatTime(row.endsAt)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <PromotionStatus promotion={row} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              className={`${actionClass} whitespace-nowrap`}
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="h-3 w-3" />
                              編輯／停用
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
        <p className="text-xs font-body leading-relaxed text-[oklch(0.55_0_0)]">
          優惠券低消以活動後商品金額計算；運費不計入滿額門檻。活動期間請避免重疊，優惠不會疊加。
        </p>
      </main>
    </div>
  );
}
