import {
  ArrowUpRight,
  Keyboard,
  Layers,
  Music2,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import midnightArt from "../../assets/midnight.jpeg";
import { GallerySection } from "~/landing/GallerySection";
import { InstallSection } from "~/landing/InstallSection";
import { LandingFooter } from "~/landing/LandingFooter";
import { LikeButton } from "~/popup/components/controls/LikeButton";
import { PlaybackControls } from "~/popup/components/controls/PlaybackControls";
import { PLATFORMS, PLATFORM_LIST } from "~/shared/constants";

const MUSIC_PLATFORMS = PLATFORM_LIST.filter((p) => p.id !== "generic");

const FEATURES = [
  {
    icon: Layers,
    title: "Every tab, one strip",
    body: "See every playing session at a glance and switch instantly - no more hunting for the right window.",
  },
  {
    icon: Zap,
    title: "Real controls",
    body: "Play, pause, seek, volume and like where the platform allows. Commands stay on the page you already have open.",
  },
  {
    icon: Keyboard,
    title: "Keyboard shortcuts",
    body: "Alt+Shift+P to play or pause, arrow keys for next and previous, Alt+Shift+L to toggle like.",
  },
  {
    icon: Shield,
    title: "Local only",
    body: "No analytics, no backend. Metadata stays on your device and talks only to tabs you control.",
  },
] as const;

const STEPS = [
  "Install SongSphere and pin it to your toolbar.",
  "Open Spotify, YouTube Music, YouTube or any supported player.",
  "Open the popup - pick a session and control everything from one place.",
] as const;

export function LandingPage() {
  return (
    <div className="landing-glow relative min-h-screen overflow-x-hidden bg-[var(--surface)] text-[var(--text-primary)]">
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <a href="/landing.html" className="flex items-center gap-2.5">
          <img
            src="/icon/128.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="text-lg font-bold tracking-[-0.02em]">SongSphere</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] sm:flex">
          <a href="#features" className="transition hover:text-[var(--text-primary)]">
            Features
          </a>
          <a href="#platforms" className="transition hover:text-[var(--text-primary)]">
            Platforms
          </a>
          <a href="#install" className="transition hover:text-[var(--text-primary)]">
            Install
          </a>
          <a href="#gallery" className="transition hover:text-[var(--text-primary)]">
            Gallery
          </a>
          <a href="/privacy.html" className="transition hover:text-[var(--text-primary)]">
            Privacy
          </a>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20">
        <section className="grid items-center gap-12 pb-20 pt-6 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Browser extension
            </p>
            <h1 className="mb-4 text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
              One popup.
              <br />
              <span className="text-[var(--accent)]">Every player.</span>
            </h1>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-[var(--text-secondary)]">
              Control Spotify, YouTube Music, YouTube and more from a single compact
              controller - multi-session switching, album art and shortcuts built in.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#install"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--surface)] transition hover:brightness-95 active:scale-[0.98]"
              >
                Get SongSphere
              </a>
              <a
                href="#gallery"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white/[0.04]"
              >
                Preview Extension
              </a>
            </div>
          </div>

          <MockPopup />
        </section>

        <section id="features" className="mb-20 scroll-mt-8">
          <h2 className="mb-2 text-2xl font-bold tracking-[-0.02em]">Built for multi-tab listening</h2>
          <p className="mb-8 max-w-xl text-sm text-[var(--text-secondary)]">
            SongSphere mirrors your popup experience - fast session dots, platform accents,
            and controls that respect what each site supports.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="landing-card rounded-2xl p-5 transition hover:border-white/10"
              >
                <Icon
                  className="mb-3 h-5 w-5 text-[var(--accent)]"
                  strokeWidth={2}
                  aria-hidden
                />
                <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
                <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="platforms" className="mb-20 scroll-mt-8">
          <h2 className="mb-6 text-2xl font-bold tracking-[-0.02em]">Supported platforms</h2>
          <div className="flex flex-wrap gap-3">
            {MUSIC_PLATFORMS.map((p) => (
              <a
                key={p.id}
                href={p.playerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-card inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium transition hover:brightness-110"
                style={{
                  borderColor: `${p.accent}33`,
                  color: p.accent,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.accent }}
                  aria-hidden
                />
                {p.label}
              </a>
            ))}
            <span className="landing-card inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-[var(--text-secondary)]">
              <Music2 className="h-4 w-4" aria-hidden />
              HTML5 / MediaSession
            </span>
          </div>
        </section>

        <section className="landing-card mb-20 rounded-2xl p-6 sm:p-8">
          <h2 className="mb-6 text-xl font-bold tracking-[-0.02em]">How it works</h2>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-bold text-[var(--accent)]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <InstallSection />

        <GallerySection />
      </main>
      <LandingFooter />
    </div>
  );
}

function MockPopup() {
  const spotify = PLATFORMS.spotify;
  return (
    <div
      className="landing-mock mx-auto shrink-0 overflow-hidden rounded-[16px] lg:mx-0"
      aria-hidden
    >
      <div
        className="h-[2.5px]"
        style={{
          background: `linear-gradient(90deg, ${spotify.accent}cc, ${spotify.accent}44)`,
        }}
      />
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <img src="/icon/48.png" alt="" className="h-6 w-6 rounded-full object-cover" />
          <span className="text-[13px] font-bold">SongSphere</span>
        </div>
        <span
          className="inline-flex items-center justify-center rounded-md border p-[5px]"
          style={{
            borderColor: `${spotify.accent}33`,
            backgroundColor: `${spotify.accent}0f`,
            color: `${spotify.accent}cc`,
          }}
        >
          <ArrowUpRight aria-hidden className="h-3 w-3 shrink-0 text-white/20" strokeWidth={2.25} />
        </span>
      </div>
      <div className="flex gap-3.5 px-3.5 pb-3">
        <img
          src={midnightArt}
          alt=""
          width={120}
          height={120}
          draggable={false}
          className="h-[120px] w-[120px] shrink-0 rounded-[15px] border border-[var(--border)] object-cover"
        />
        <div className="min-w-0 flex-1 pt-1">
          <p
            className="mb-1 text-[9px] font-bold uppercase tracking-wider"
            style={{ color: spotify.accent }}
          >
            SPOTIFY
          </p>
          <p className="truncate text-[14px] font-bold">Midnight City</p>
          <div className="flex items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-secondary)]">
              M83
            </p>
            <LikeButton
              liked
              disabled
              className="pointer-events-none shrink-0 self-center pt-0"
              onToggle={() => {}}
            />
          </div>
          <div className="relative mt-3 h-[3px] overflow-visible rounded-full bg-white/[0.07]">
            <div
              className="relative h-full w-[45%] rounded-full"
              style={{ backgroundColor: spotify.accent }}
            >
              <span
                className="absolute right-[-5.5px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-black"
                style={{
                  boxShadow: `0 0 0 2.5px ${spotify.accent}, 0 0 8px color-mix(in srgb, ${spotify.accent} 33%, transparent)`,
                }}
                aria-hidden
              />
            </div>
          </div>
          <PlaybackControls
            isPlaying
            disabled
            className="mt-4 pointer-events-none"
            onTogglePlay={() => {}}
            onNext={() => {}}
            onPrevious={() => {}}
          />
        </div>
      </div>
      <div className="flex justify-center gap-1 border-t border-[var(--border-soft)] px-4 py-2.5">
        <div className="h-[7px] w-6 rounded-full" style={{ backgroundColor: spotify.accent }} />
        <div className="h-[7px] w-[7px] rounded-full bg-white/15" />
        <div className="h-[7px] w-[7px] rounded-full bg-white/15" />
      </div>
    </div>
  );
}
