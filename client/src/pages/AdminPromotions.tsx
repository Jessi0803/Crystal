import { useState, type FormEvent } from "react";
import { toast } from "sonner";
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
  if (loading) return <p className="p-6">載入中…</p>;
  if (user?.role !== "admin")
    return <p className="p-6">請以管理員帳號登入。</p>;
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
  const input = "w-full border rounded px-3 py-2 mt-1 bg-white";
  return (
    <main className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl">活動管理</h1>
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => {
            setForm(empty);
            setOpen(true);
          }}
        >
          新增活動
        </button>
      </div>
      <p className="text-sm text-gray-600">
        全館每滿額自動折抵，可併用會員優惠券。客製單保留下單時規則，報價後於尾款折抵。活動結束時間不包含該時刻。本版不支援多活動疊加，請安排不重疊的期間。
      </p>
      {open && (
        <form
          onSubmit={submit}
          className="border rounded p-5 space-y-4 bg-white"
        >
          <h2>{form.id ? "編輯活動" : "新增活動"}</h2>
          <label className="block">
            名稱
            <input
              required
              maxLength={100}
              className={input}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            {(["startsAt", "endsAt"] as const).map(key => (
              <label key={key}>
                {key === "startsAt" ? "開始時間" : "結束時間"}（台灣時間）
                <input
                  required
                  type="datetime-local"
                  className={input}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {(["threshold", "discountAmount", "maxDiscount"] as const).map(
              key => (
                <label key={key}>
                  {key === "threshold"
                    ? "每滿金額"
                    : key === "discountAmount"
                      ? "每次折抵"
                      : "折抵上限（空白不限）"}
                  <input
                    type="number"
                    min="1"
                    max="10000000"
                    step="1"
                    required={key !== "maxDiscount"}
                    className={input}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              )
            )}
          </div>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm({ ...form, isActive: e.target.checked })}
            />
            啟用（依活動期間生效）
          </label>
          <div className="flex gap-3">
            <button
              disabled={save.isPending}
              className="px-4 py-2 bg-black text-white rounded"
            >
              {save.isPending ? "儲存中…" : "儲存"}
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              取消
            </button>
          </div>
        </form>
      )}
      {list.isLoading && <p>載入活動中…</p>}
      {list.error && (
        <p role="alert" className="text-red-600">
          {list.error.message}
        </p>
      )}
      {list.data?.length === 0 && <p>尚未建立活動。</p>}
      <div className="space-y-3">
        {list.data?.map(row => (
          <article
            key={row.id}
            className="border rounded p-5 bg-white flex flex-wrap gap-4 justify-between"
          >
            <div>
              <h2 className="font-medium">
                {row.name} ·{" "}
                {row.isActive
                  ? new Date() < row.startsAt
                    ? "尚未開始"
                    : new Date() >= row.endsAt
                      ? "已結束"
                      : "進行中"
                  : "已停用"}
              </h2>
              <p className="text-sm mt-2">
                每滿 NT$ {row.threshold.toLocaleString()} 折 NT${" "}
                {row.discountAmount.toLocaleString()}
                {row.maxDiscount != null
                  ? `，最高折 ${row.maxDiscount.toLocaleString()}`
                  : "，累進無上限"}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {row.startsAt.toLocaleString("zh-TW", {
                  timeZone: "Asia/Taipei",
                })}{" "}
                ～{" "}
                {row.endsAt.toLocaleString("zh-TW", {
                  timeZone: "Asia/Taipei",
                })}
                （台灣時間）
              </p>
            </div>
            <button
              className="underline text-sm"
              onClick={() => {
                setForm({
                  id: row.id,
                  name: row.name,
                  threshold: String(row.threshold),
                  discountAmount: String(row.discountAmount),
                  maxDiscount:
                    row.maxDiscount == null ? "" : String(row.maxDiscount),
                  startsAt: taipeiInput(row.startsAt),
                  endsAt: taipeiInput(row.endsAt),
                  isActive: row.isActive,
                });
                setOpen(true);
              }}
            >
              編輯／停用
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
