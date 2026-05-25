import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { LandingFooter } from "~/landing/LandingFooter";

interface LegalLayoutProps {
  title: string;
  children: ReactNode;
}

export function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-soft)] px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <a
            href="/landing.html"
            className="focus-ring inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            Back
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-8 text-3xl font-bold tracking-[-0.03em]">{title}</h1>
        <div className="prose-legal space-y-6 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
