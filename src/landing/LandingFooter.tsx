import { Github, Mail } from "lucide-react";
import { CONTACT_EMAIL, GITHUB_URL } from "~/landing/constants";

const iconClass =
  "h-[18px] w-[18px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-[var(--border-soft)] bg-[var(--surface)] px-6 pt-10 pb-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <a
          href="/landing.html"
          className="flex items-center gap-3 transition opacity-90 hover:opacity-100"
        >
          <img
            src="/icon/48.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover"
          />
          <div>
            <p className="text-[15px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
              SongSphere
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Control every playing tab from one place
            </p>
          </div>
        </a>

        <div className="flex flex-col gap-5 md:items-end">
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SongSphere on GitHub"
              className="focus-ring rounded-full p-1"
            >
              <Github className={iconClass} strokeWidth={2} aria-hidden />
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              aria-label={`Email ${CONTACT_EMAIL}`}
              className="focus-ring rounded-full p-1"
            >
              <Mail className={iconClass} strokeWidth={2} aria-hidden />
            </a>
          </div>

          <nav
            className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--text-secondary)]"
            aria-label="Legal"
          >
            <a
              href="/privacy.html"
              className="transition hover:text-[var(--text-primary)] focus-ring rounded-sm"
            >
              Privacy
            </a>
            <a
              href="/license.html"
              className="transition hover:text-[var(--text-primary)] focus-ring rounded-sm"
            >
              License
            </a>
          </nav>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-5xl text-center text-[11px] text-[var(--text-muted)]">
        © {year} SongSphere · MIT License
      </p>
      <p className="mx-auto mt-8 max-w-5xl text-center text-[11px] text-[var(--text-muted)]">
        Built with ❤️ by <a href="https://github.com/AaronKurian" target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)]">Aaron Kurian Abraham</a>
      </p>
    </footer>
  );
}
