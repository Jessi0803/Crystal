const CUSTOM_CONSULTATION_MARKER_RE = /^【客製需求(?:開始|結束)：[^】]+】$/;

export function formatCustomConsultationNoteForDisplay(note: string | null | undefined) {
  return String(note ?? "")
    .split(/\r?\n/)
    .filter((line) => !CUSTOM_CONSULTATION_MARKER_RE.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
