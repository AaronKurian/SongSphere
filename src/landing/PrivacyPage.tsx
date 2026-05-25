import { LegalLayout } from "~/landing/LegalLayout";
import { CONTACT_EMAIL } from "~/landing/constants";

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        SongSphere is a browser extension that controls media tabs you already have open.
        It does not operate a backend service and does not sell your data.
      </p>

      <section>
        <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">
          What stays on your device
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Session metadata (titles, artists, artwork URLs, playback state) read from
            supported tabs
          </li>
          <li>
            Your selected session and strip order in extension storage (
            <code className="rounded bg-white/5 px-1 text-[12px]">storage.session</code> /{" "}
            <code className="rounded bg-white/5 px-1 text-[12px]">storage.local</code>)
          </li>
          <li>
            Cached artwork blobs in popup memory while the popup is open (revoked on close)
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">
          What SongSphere accesses
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[280px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-white/[0.03]">
                <th className="px-3 py-2 font-semibold text-[var(--text-primary)]">
                  Permission
                </th>
                <th className="px-3 py-2 font-semibold text-[var(--text-primary)]">Why</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border-soft)]">
                <td className="px-3 py-2">tabs</td>
                <td className="px-3 py-2">Discover music tabs and focus the active player</td>
              </tr>
              <tr className="border-b border-[var(--border-soft)]">
                <td className="px-3 py-2">activeTab</td>
                <td className="px-3 py-2">Interact with the tab you are controlling</td>
              </tr>
              <tr className="border-b border-[var(--border-soft)]">
                <td className="px-3 py-2">scripting</td>
                <td className="px-3 py-2">Inject platform content scripts on supported sites</td>
              </tr>
              <tr className="border-b border-[var(--border-soft)]">
                <td className="px-3 py-2">storage</td>
                <td className="px-3 py-2">Persist session strip and preferences locally</td>
              </tr>
              <tr className="border-b border-[var(--border-soft)]">
                <td className="px-3 py-2">alarms</td>
                <td className="px-3 py-2">Periodic resync when the popup is closed</td>
              </tr>
              <tr>
                <td className="px-3 py-2">host permissions</td>
                <td className="px-3 py-2">
                  Read now-playing metadata from Spotify, YouTube Music, YouTube and generic
                  media pages
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p>
        SongSphere does <strong className="text-[var(--text-primary)]">not</strong> record
        audio, capture microphone input or transmit playback data to SongSphere servers.
      </p>

      <section>
        <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">
          Third parties
        </h2>
        <p>
          Metadata and commands go only between the extension and the websites you open
          (Spotify, YouTube, etc.), under those sites&apos; own privacy policies.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">Telemetry</h2>
        <p>
          SongSphere ships no product analytics. An optional hidden dev overlay (
          <code className="rounded bg-white/5 px-1 text-[12px]">songsphere:dev=1</code> in
          the popup console) shows local counters for engineering only.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">Contact</h2>
        <p>
          Privacy questions:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
