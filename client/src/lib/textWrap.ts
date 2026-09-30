/** 單一字元的斷句標點；標點留在前一段末尾，因為中文不以標點起行 */
const CLAUSE_ENDINGS = "，、；：。！？";

/**
 * 多字元標點：破折號「——」與刪節號「……」「⋯⋯」由重複字元組成，
 * 拆成兩行是排版錯誤，必須整組留在行尾。
 *
 * 只收 em dash（U+2014），不含 en dash（U+2013）——後者用於「7A–9A」這類範圍，
 * 不是斷句標點。
 */
const ATOMIC_MARKS = "—…⋯";

/**
 * 把中文句子依標點切成語意段落。
 *
 * 瀏覽器對中文預設是「任何字之間都能斷」，text-wrap: balance 只會讓每行長度平均，
 * 不管語意，所以常常斷在詞中間。把每一段包成 inline-block 之後，行內區塊內部不會
 * 被拆開，換行就只發生在標點處。
 *
 * 單段若比容器還寬，inline-block 的寬度會被收斂到容器寬度、在內部自行換行，
 * 不會溢出版面。
 */
export function splitCjkClauses(text: string): string[] {
  const clauses: string[] = [];
  // 用 Array.from 而非展開語法：專案的 tsconfig target 不允許展開字串
  const chars = Array.from(text);
  let current = "";

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    current += char;

    if (CLAUSE_ENDINGS.includes(char)) {
      clauses.push(current);
      current = "";
      continue;
    }

    if (ATOMIC_MARKS.includes(char)) {
      // 先把重複的同一個標點吃完（「——」「……」），整組才斷，避免被拆成兩行
      while (i + 1 < chars.length && chars[i + 1] === char) {
        current += chars[i + 1];
        i += 1;
      }
      clauses.push(current);
      current = "";
    }
  }

  if (current) clauses.push(current);

  return clauses.length > 0 ? clauses : [text];
}
