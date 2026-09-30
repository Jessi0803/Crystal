import type { ReactNode } from "react";
import { splitCjkClauses } from "@/lib/textWrap";

/**
 * 依中文標點斷行的文字。
 *
 * 每個語意段落包成 inline-block，行內區塊內部不會被拆開，
 * 換行就只發生在標點處，不會斷在詞中間。
 *
 * prefix / suffix 會綁進頭尾段落裡（例如引號），避免被單獨甩到下一行。
 */
export default function ClauseText({
  text,
  prefix,
  suffix,
}: {
  text: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}) {
  const clauses = splitCjkClauses(text);
  return (
    <>
      {clauses.map((clause, index) => (
        <span key={index} className="inline-block">
          {index === 0 && prefix}
          {clause}
          {index === clauses.length - 1 && suffix}
        </span>
      ))}
    </>
  );
}
