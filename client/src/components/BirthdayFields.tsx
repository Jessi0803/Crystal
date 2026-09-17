import { validateBirthday, type Birthday } from "@shared/birthday";

export type BirthdayDraft = { year: string; month: string; day: string };

export const EMPTY_BIRTHDAY_DRAFT: BirthdayDraft = { year: "", month: "", day: "" };

export function birthdayToDraft(birthday: Birthday | null): BirthdayDraft {
  if (!birthday) return EMPTY_BIRTHDAY_DRAFT;
  return { year: birthday.year ? String(birthday.year) : "", month: String(birthday.month), day: String(birthday.day) };
}

/** 未填回傳 null；填到一半或不合法回傳錯誤訊息 */
export function parseBirthdayDraft(draft: BirthdayDraft): { birthday: Birthday | null; error: string | null } {
  const year = draft.year.trim();
  if (!draft.month && !draft.day && !year) return { birthday: null, error: null };
  if (!draft.month || !draft.day) return { birthday: null, error: "請選擇生日的月份與日期" };
  if (year && !/^\d{4}$/.test(year)) return { birthday: null, error: "出生年份請填 4 位數字，或留空" };
  const birthday: Birthday = { year: year ? Number(year) : null, month: Number(draft.month), day: Number(draft.day) };
  const error = validateBirthday(birthday);
  return error ? { birthday: null, error } : { birthday, error: null };
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function BirthdayFields({
  value,
  onChange,
  disabled,
  className = "",
  inputClassName,
}: {
  value: BirthdayDraft;
  onChange: (value: BirthdayDraft) => void;
  disabled?: boolean;
  className?: string;
  inputClassName: string;
}) {
  const set = (key: keyof BirthdayDraft, next: string) => onChange({ ...value, [key]: next });

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      <select
        aria-label="生日月份"
        value={value.month}
        disabled={disabled}
        onChange={(e) => set("month", e.target.value)}
        className={inputClassName}
      >
        <option value="">月</option>
        {MONTHS.map((month) => (
          <option key={month} value={month}>
            {month} 月
          </option>
        ))}
      </select>
      <select
        aria-label="生日日期"
        value={value.day}
        disabled={disabled}
        onChange={(e) => set("day", e.target.value)}
        className={inputClassName}
      >
        <option value="">日</option>
        {DAYS.map((day) => (
          <option key={day} value={day}>
            {day} 日
          </option>
        ))}
      </select>
      <input
        aria-label="出生年份（選填）"
        inputMode="numeric"
        maxLength={4}
        placeholder="年（選填）"
        value={value.year}
        disabled={disabled}
        onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))}
        className={inputClassName}
      />
    </div>
  );
}
