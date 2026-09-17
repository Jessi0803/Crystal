export type Birthday = {
  /** 出生年份為選填 */
  year: number | null;
  month: number;
  day: number;
};

export const BIRTH_YEAR_MIN = 1900;

/** 年份未填時以閏年檢查，讓 2 月 29 日可以填寫 */
function daysInMonth(month: number, year: number | null) {
  return new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate();
}

/** 回傳錯誤訊息；合法時回傳 null */
export function validateBirthday(birthday: Birthday, now = new Date()): string | null {
  const { year, month, day } = birthday;
  if (!Number.isInteger(month) || month < 1 || month > 12) return "請選擇生日月份";
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(month, year)) return "生日日期不正確";
  if (year != null) {
    const currentYear = now.getFullYear();
    if (!Number.isInteger(year) || year < BIRTH_YEAR_MIN || year > currentYear) {
      return `出生年份需介於 ${BIRTH_YEAR_MIN} 到 ${currentYear} 年`;
    }
    if (new Date(year, month - 1, day).getTime() > now.getTime()) return "生日不能晚於今天";
  }
  return null;
}

export function formatBirthday(birthday: { year: number | null; month: number; day: number }) {
  const monthDay = `${birthday.month} 月 ${birthday.day} 日`;
  return birthday.year ? `${birthday.year} 年 ${monthDay}` : monthDay;
}

export function birthdayFromUser(user: {
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
}): Birthday | null {
  if (user.birthMonth == null || user.birthDay == null) return null;
  return { year: user.birthYear ?? null, month: user.birthMonth, day: user.birthDay };
}
