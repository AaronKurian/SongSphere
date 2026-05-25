import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { GITHUB_URL } from "~/landing/constants";

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(resetRef.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="focus-ring absolute right-2 top-2 rounded-md p-1.5 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text-primary)]"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        )}
      </button>
      <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-black/35 p-4 pr-10 text-[12px] leading-[1.65] text-[var(--text-primary)]">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function StepList({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

export function InstallSection() {
  return (
    <section id="install" className="mb-20 scroll-mt-8">
      <h2 className="mb-2 text-2xl font-bold tracking-[-0.02em]">Installation</h2>
      <p className="mb-8 max-w-2xl text-sm text-[var(--text-secondary)]">
        Clone the repo, install dependencies, then load the extension in Firefox or Chrome.
        Use <strong className="text-[var(--text-primary)]">dev</strong> while hacking on the
        code; use <strong className="text-[var(--text-primary)]">build</strong> for everyday
        use without keeping a terminal open.
      </p>

      <div className="space-y-8">
        <article className="landing-card rounded-2xl p-6 sm:p-8">
          <h3 className="mb-3 text-base font-semibold">Prerequisites</h3>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--text-secondary)]">
            <li>Node.js 18+ and npm</li>
            <li>Git</li>
            <li>Firefox and/or Chrome / Chromium</li>
          </ul>
        </article>

        <article className="landing-card rounded-2xl p-6 sm:p-8">
          <h3 className="mb-3 text-base font-semibold">1. Clone and install</h3>
          <CodeBlock>{`git clone ${GITHUB_URL}.git
cd SongSphere
npm install
npm run compile   # optional typecheck`}</CodeBlock>
          <p className="mt-3 text-[12px] text-[var(--text-muted)]">
            <code className="rounded bg-white/5 px-1">npm install</code> runs{" "}
            <code className="rounded bg-white/5 px-1">wxt prepare</code> automatically.
          </p>
        </article>

        <article className="landing-card rounded-2xl p-6 sm:p-8">
          <h3 className="mb-1 text-base font-semibold">2. Development (hot reload)</h3>
          <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
            Keep the dev terminal running the whole time - the server must stay on port{" "}
            <strong className="text-[var(--text-primary)]">3000</strong>.
          </p>

          <h4 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Firefox</h4>
          <CodeBlock>npm run dev:firefox</CodeBlock>
          <StepList
            items={[
              "Wait for Started dev server @ http://localhost:3000",
              "Open about:debugging → This Firefox → Load Temporary Add-on",
              "Select .output/firefox-mv2/manifest.json in the project folder",
            ]}
          />

          <h4 className="mb-2 mt-6 text-[13px] font-semibold text-[var(--text-primary)]">
            Chrome / Chromium
          </h4>
          <CodeBlock>npm run dev</CodeBlock>
          <StepList
            items={[
              "Open chrome://extensions (or edge://extensions)",
              "Enable Developer mode",
              "Load unpacked → choose .output/chrome-mv3 (created when dev starts)",
            ]}
          />

          <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full min-w-[320px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-white/[0.03] text-[var(--text-primary)]">
                  <th className="px-3 py-2 font-semibold">If you changed</th>
                  <th className="px-3 py-2 font-semibold">Do this</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-soft)]">
                  <td className="px-3 py-2">Popup UI</td>
                  <td className="px-3 py-2">Close and reopen the SongSphere popup</td>
                </tr>
                <tr className="border-b border-[var(--border-soft)]">
                  <td className="px-3 py-2">Background / content scripts</td>
                  <td className="px-3 py-2">Reload the extension in the browser</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">manifest / wxt.config</td>
                  <td className="px-3 py-2">Restart dev, reload the add-on</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="landing-card rounded-2xl p-6 sm:p-8">
          <h3 className="mb-3 text-base font-semibold">3. Production build (daily use)</h3>
          <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
            No dev server needed. Rebuild and reload the extension when you pull updates.
          </p>

          <h4 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Firefox</h4>
          <CodeBlock>npm run build:firefox</CodeBlock>
          <p className="mb-4 mt-2 text-[13px] text-[var(--text-secondary)]">
            Load <code className="rounded bg-white/5 px-1">.output/firefox-mv2/manifest.json</code>{" "}
            via about:debugging. Pin SongSphere to the toolbar. Temporary add-ons clear when
            Firefox restarts - load the same manifest again after restart.
          </p>

          <h4 className="mb-2 text-[13px] font-semibold text-[var(--text-primary)]">Chrome</h4>
          <CodeBlock>npm run build</CodeBlock>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            Load unpacked from <code className="rounded bg-white/5 px-1">.output/chrome-mv3</code>.
            Click Reload on the extension card after each rebuild.
          </p>
        </article>

        <article className="landing-card rounded-2xl p-6 sm:p-8">
          <h3 className="mb-3 text-base font-semibold">4. Start using SongSphere</h3>
          <StepList
            items={[
              "Open Spotify, YouTube Music or YouTube and start playback",
              "Click the SongSphere icon in the toolbar",
              "Switch sessions with the bottom dots or arrows",
            ]}
          />
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-soft)] bg-white/[0.02] px-3 py-2 text-[12px]">
              <span className="text-[var(--text-muted)]">Alt+Shift+P</span>
              <span className="float-right text-[var(--text-secondary)]">Play / pause</span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-white/[0.02] px-3 py-2 text-[12px]">
              <span className="text-[var(--text-muted)]">Alt+Shift+→</span>
              <span className="float-right text-[var(--text-secondary)]">Next track</span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-white/[0.02] px-3 py-2 text-[12px]">
              <span className="text-[var(--text-muted)]">Alt+Shift+←</span>
              <span className="float-right text-[var(--text-secondary)]">Previous</span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-white/[0.02] px-3 py-2 text-[12px]">
              <span className="text-[var(--text-muted)]">Alt+Shift+L</span>
              <span className="float-right text-[var(--text-secondary)]">Like</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
