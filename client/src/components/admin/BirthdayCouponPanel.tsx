import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Gift, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function taipeiYearMonth() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find(part => part.type === "year")?.value),
    month: Number(parts.find(part => part.type === "month")?.value),
  };
}

function formatMoney(value: number) {
  return `NT$ ${value.toLocaleString("zh-TW")}`;
}

export default function BirthdayCouponPanel() {
  const current = useMemo(taipeiYearMonth, []);
  const [month, setMonth] = useState(current.month);
  const [campaignYear, setCampaignYear] = useState(current.year);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const utils = trpc.useUtils();

  const birthdays = trpc.adminMembers.birthdays.useQuery({
    month,
    year: campaignYear,
    search: search || undefined,
    limit: 200,
    offset: 0,
  });
  const templates = trpc.coupons.adminActiveTemplates.useQuery();
  const issue = trpc.coupons.adminIssueBirthdayBatch.useMutation({
    onSuccess: async result => {
      if (result.failed > 0) {
        toast.warning(
          `已發放 ${result.issued} 張、跳過 ${result.skipped} 位、失敗 ${result.failed} 位`
        );
      } else {
        toast.success(
          `已發放 ${result.issued} 張生日優惠${result.skipped ? `，跳過 ${result.skipped} 位已領會員` : ""}`
        );
      }
      setSelectedIds([]);
      await Promise.all([
        utils.adminMembers.birthdays.invalidate(),
        utils.coupons.adminList.invalidate(),
        utils.coupons.adminMemberCoupons.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message || "生日優惠發放失敗"),
  });

  const items = birthdays.data?.items ?? [];
  const selectableIds = items
    .filter(member => !member.birthdayCouponIssued)
    .map(member => member.id);
  // 統計數字由伺服器以整份名單計算，不受畫面最多顯示 200 位影響
  const issuedCount = birthdays.data?.issuedTotal ?? 0;
  const lineBoundCount = birthdays.data?.lineBoundTotal ?? 0;
  const selectedTemplate = (templates.data ?? []).find(
    template => template.id === Number(templateId)
  );
  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every(id => selectedIds.includes(id));

  useEffect(() => {
    setSelectedIds(currentIds =>
      currentIds.filter(id => selectableIds.includes(id))
    );
  }, [month, campaignYear, search, birthdays.dataUpdatedAt]);

  const toggleMember = (userId: number) => {
    setSelectedIds(currentIds =>
      currentIds.includes(userId)
        ? currentIds.filter(id => id !== userId)
        : [...currentIds, userId]
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelectableSelected ? [] : selectableIds);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const issueSelected = () => {
    if (!selectedTemplate || selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `確定發放「${selectedTemplate.name}」給 ${selectedIds.length} 位 ${month} 月壽星嗎？\n\n` +
        `折抵 ${formatMoney(selectedTemplate.discountAmount)}・最低消費 ${formatMoney(selectedTemplate.minOrderAmount)}\n` +
        `${campaignYear} 年每位會員只會成功領取一次。`
    );
    if (!confirmed) return;
    issue.mutate({
      userIds: selectedIds,
      templateId: selectedTemplate.id,
      birthdayMonth: month,
      campaignYear,
    });
  };

  return (
    <section className="space-y-6">
      <div className="border border-[oklch(0.91_0_0)] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[oklch(0.58_0_0)]">
              BIRTHDAY MEMBERS
            </p>
            <h2
              className="mt-1 flex items-center gap-2 text-lg font-light text-[oklch(0.13_0_0)]"
              style={{ fontFamily: "'Noto Serif TC', serif" }}
            >
              <CalendarDays className="h-4 w-4 text-rose-500" />
              當月壽星與生日優惠
            </h2>
          </div>
          <button
            type="button"
            onClick={() => birthdays.refetch()}
            disabled={birthdays.isFetching}
            className="inline-flex items-center justify-center gap-2 self-start border border-[oklch(0.86_0_0)] px-3 py-2 text-xs font-body text-[oklch(0.45_0_0)] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${birthdays.isFetching ? "animate-spin" : ""}`}
            />
            重新整理
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[140px_140px_1fr]">
          <label className="block">
            <span className="mb-1 block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body">
              發放年度
            </span>
            <select
              value={campaignYear}
              onChange={event => setCampaignYear(Number(event.target.value))}
              className="w-full border border-[oklch(0.86_0_0)] bg-white px-3 py-2.5 text-sm font-body"
            >
              {[current.year - 1, current.year, current.year + 1].map(year => (
                <option key={year} value={year}>
                  {year} 年
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body">
              生日月份
            </span>
            <select
              value={month}
              onChange={event => setMonth(Number(event.target.value))}
              className="w-full border border-[oklch(0.86_0_0)] bg-white px-3 py-2.5 text-sm font-body"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                value => (
                  <option key={value} value={value}>
                    {value} 月
                  </option>
                )
              )}
            </select>
          </label>
          <form onSubmit={submitSearch} className="self-end">
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body">
                搜尋壽星
              </span>
              <input
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="姓名、Email、LINE 信箱或會員 ID"
                className="w-full border border-[oklch(0.86_0_0)] px-3 py-2.5 text-sm font-body outline-none focus:border-[oklch(0.25_0_0)]"
              />
            </label>
          </form>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-[oklch(0.9_0_0)] border-y border-[oklch(0.9_0_0)] py-4 text-center">
          <div>
            <p className="text-[10px] tracking-widest text-[oklch(0.55_0_0)] font-body">
              壽星
            </p>
            <p className="mt-1 text-lg font-medium">
              {birthdays.data?.total ?? 0}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-widest text-[oklch(0.55_0_0)] font-body">
              {campaignYear} 已發
            </p>
            <p className="mt-1 text-lg font-medium text-emerald-700">
              {issuedCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-widest text-[oklch(0.55_0_0)] font-body">
              已綁 LINE
            </p>
            <p className="mt-1 text-lg font-medium text-[#079447]">
              {lineBoundCount}
            </p>
          </div>
        </div>
      </div>

      <div className="border border-[oklch(0.91_0_0)] bg-white">
        <div className="grid gap-4 border-b border-[oklch(0.91_0_0)] p-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body">
              生日優惠券
            </span>
            <select
              value={templateId}
              onChange={event => setTemplateId(event.target.value)}
              className="w-full border border-[oklch(0.86_0_0)] bg-white px-3 py-2.5 text-sm font-body"
            >
              <option value="">請選擇有效的優惠券模板</option>
              {(templates.data ?? []).map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}・折 {formatMoney(template.discountAmount)}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="mt-2 text-xs text-[oklch(0.5_0_0)] font-body">
                已選 {selectedIds.length} 位・最低消費{" "}
                {formatMoney(selectedTemplate.minOrderAmount)}
              </p>
            )}
          </label>
          <button
            type="button"
            onClick={issueSelected}
            disabled={
              !selectedTemplate || selectedIds.length === 0 || issue.isPending
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[oklch(0.18_0_0)] px-5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Gift className="h-4 w-4" />
            {issue.isPending ? "發放中" : `確認發放（${selectedIds.length}）`}
          </button>
        </div>

        {birthdays.isLoading ? (
          <div className="p-12 text-center text-sm text-[oklch(0.5_0_0)] font-body">
            載入壽星名單中...
          </div>
        ) : birthdays.error ? (
          <div className="p-12 text-center text-sm text-red-600 font-body">
            壽星名單載入失敗：{birthdays.error.message}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-[oklch(0.5_0_0)] font-body">
            這個月份沒有符合條件的會員
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-[oklch(0.9_0_0)] bg-[oklch(0.98_0_0)] text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body">
                <tr>
                  <th className="w-14 px-5 py-3">
                    <input
                      type="checkbox"
                      aria-label="選取所有尚未發放的壽星"
                      checked={allSelectableSelected}
                      onChange={toggleAll}
                      disabled={selectableIds.length === 0}
                    />
                  </th>
                  <th className="px-3 py-3">會員</th>
                  <th className="px-3 py-3">生日</th>
                  <th className="px-3 py-3">LINE</th>
                  <th className="px-5 py-3 text-right">
                    {campaignYear} 發放狀態
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[oklch(0.93_0_0)] text-sm font-body">
                {items.map(member => (
                  <tr
                    key={member.id}
                    className={
                      member.birthdayCouponIssued
                        ? "bg-emerald-50/35"
                        : undefined
                    }
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        aria-label={`選取 ${member.name || member.email || `會員 ${member.id}`}`}
                        checked={selectedIds.includes(member.id)}
                        onChange={() => toggleMember(member.id)}
                        disabled={member.birthdayCouponIssued}
                      />
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-medium text-[oklch(0.16_0_0)]">
                        {member.name || "未填姓名"}
                      </p>
                      <p className="mt-1 text-xs text-[oklch(0.52_0_0)]">
                        #{member.id}・{member.email || "無 Email"}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-[oklch(0.35_0_0)]">
                      {member.birthYear ? `${member.birthYear} 年 ` : ""}
                      {member.birthMonth} 月 {member.birthDay} 日
                    </td>
                    <td className="px-3 py-4">
                      {member.lineBound ? (
                        <span className="text-[#079447]">
                          已綁定
                          {member.lineDisplayName
                            ? `・${member.lineDisplayName}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-[oklch(0.58_0_0)]">未綁定</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {member.birthdayCouponIssued ? (
                        <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                          已發放
                        </span>
                      ) : (
                        <span className="text-xs text-[oklch(0.55_0_0)]">
                          尚未發放
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(birthdays.data?.total ?? 0) > items.length && (
          <p className="border-t border-[oklch(0.93_0_0)] px-5 py-3 text-xs text-amber-700 font-body">
            目前僅顯示前 200 位，請使用搜尋縮小名單。
          </p>
        )}
      </div>
    </section>
  );
}
