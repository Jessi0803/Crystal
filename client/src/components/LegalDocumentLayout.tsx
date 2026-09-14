import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export default function LegalDocumentLayout({
  eyebrow,
  title,
  updatedAt,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[oklch(0.24_0_0)] page-enter">
      <header className="border-b border-[oklch(0.92_0_0)] bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1080px]">
          <div className="mb-4 flex h-4 items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-4 items-center text-[0.65rem] font-body leading-none text-[oklch(0.55_0_0)] transition-colors hover:text-[oklch(0.1_0_0)]"
            >
              首頁
            </Link>
            <ChevronRight className="block h-3 w-3 shrink-0 text-[oklch(0.72_0_0)]" aria-hidden="true" />
            <span className="inline-flex h-4 items-center text-[0.65rem] font-body leading-none text-[oklch(0.25_0_0)]">{title}</span>
          </div>
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h1 className="heading-lg">{title}</h1>
          <p className="mt-3 text-xs font-body text-[oklch(0.58_0_0)]">最後更新：{updatedAt}</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="border border-[#ebe5df] bg-white px-5 py-7 shadow-[0_16px_40px_rgba(80,62,48,0.04)] sm:px-10 sm:py-10">
          <div className="mb-10 border-b border-[#eee9e4] pb-8 text-sm font-body font-light leading-7 text-[oklch(0.38_0_0)]">
            {intro}
          </div>

          <div className="space-y-10">
            {sections.map((section, index) => (
              <section key={section.title} aria-labelledby={`legal-section-${index}`}>
                <h2
                  id={`legal-section-${index}`}
                  className="mb-4 text-base font-medium tracking-[0.05em] text-[oklch(0.18_0_0)]"
                  style={{ fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
                >
                  {index + 1}. {section.title}
                </h2>
                <div className="space-y-3 text-sm font-body font-light leading-7 text-[oklch(0.4_0_0)] [&_a]:text-[#8e735b] [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-[oklch(0.28_0_0)] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
