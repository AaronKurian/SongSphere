import { useEffect, useState } from "react";
import { BUILD_ID } from "~/shared/constants";
import {
  getBuildFreshness,
  verifyBuildFreshness,
  type BuildFreshness,
} from "~/shared/build";
import { isDevTelemetryEnabled } from "~/shared/dev-mode";
import { sendToRuntime } from "~/background/messaging";
import { runtimeTelemetry } from "~/shared/telemetry";
import type { TelemetrySnapshot } from "~/shared/types/telemetry";

function ratio(patch: number, full: number): string {
  const total = patch + full;
  if (total === 0) return "—";
  return `${Math.round((patch / total) * 100)}% patch`;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3 text-[10px] leading-tight">
      <span className="text-text-muted">{label}</span>
      <span className="tabular-nums text-text-primary">{value}</span>
    </div>
  );
}

function formatBuildStatus(f: BuildFreshness): string {
  switch (f.status) {
    case "latest":
      return "✓ latest";
    case "leader":
      return "✓ leader";
    case "stale":
      return `✗ STALE (ext ${f.latestId ?? "?"})`;
    default:
      return "? checking";
  }
}

function buildStatusClass(f: BuildFreshness): string {
  if (f.status === "stale") return "text-red-400";
  if (f.status === "latest" || f.status === "leader") return "text-emerald-400";
  return "text-amber-300";
}

function Panel({ title, data }: { title: string; data: TelemetrySnapshot }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">{title}</p>
      <Row label="Δ flushes" value={data.deltaFlushes} />
      <Row label="patch / full" value={`${data.patchDeltas} / ${data.fullDeltas}`} />
      <Row label="patch ratio" value={ratio(data.patchDeltas, data.fullDeltas)} />
      <Row label="hydration ↑" value={data.hydrationPromotions} />
      <Row label="artwork hit" value={data.artworkCacheHits} />
      <Row label="artwork miss" value={data.artworkCacheMisses} />
      <Row label="dormant wake" value={data.dormantWakes} />
      <Row label="renders" value={data.renderPasses} />
      <Row label="Δ applies" value={data.deltaApplies} />
    </div>
  );
}

export function TelemetryOverlay() {
  const [open, setOpen] = useState(() => isDevTelemetryEnabled());
  const [popup, setPopup] = useState<TelemetrySnapshot>(() => runtimeTelemetry.snapshot());
  const [bg, setBg] = useState<TelemetrySnapshot | null>(null);
  const [popupBuild, setPopupBuild] = useState<BuildFreshness>(() => getBuildFreshness());
  const [bgBuild, setBgBuild] = useState<BuildFreshness | null>(null);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      setPopup(runtimeTelemetry.snapshot());
      void verifyBuildFreshness("popup").then(setPopupBuild);
      void sendToRuntime({ type: "GET_DEV_TELEMETRY" })
        .then((snap) => setBg(snap))
        .catch(() => undefined);
      void sendToRuntime({ type: "GET_BUILD_STATUS" })
        .then((snap) => setBgBuild(snap))
        .catch(() => undefined);
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  return (
    <aside
      className="fixed bottom-2 right-2 z-50 w-[168px] rounded-lg border border-white/10 bg-black/90 p-2 text-left shadow-lg backdrop-blur-sm"
      aria-label="SongSphere dev telemetry"
    >
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span
          className="text-[9px] font-semibold text-brand"
          title="Must match service worker + content scripts"
        >
          DEV {BUILD_ID}
        </span>
        <button
          type="button"
          className="text-[9px] text-text-muted hover:text-text-primary focus-ring rounded px-1"
          onClick={() => setOpen(false)}
        >
          hide
        </button>
      </div>
      <div className="mb-1.5 space-y-0.5 border-b border-white/10 pb-1.5">
        <div className="flex justify-between gap-2 text-[10px]">
          <span className="text-text-muted">popup build</span>
          <span className={buildStatusClass(popupBuild)}>{formatBuildStatus(popupBuild)}</span>
        </div>
        {bgBuild && (
          <div className="flex justify-between gap-2 text-[10px]">
            <span className="text-text-muted">SW build</span>
            <span className={buildStatusClass(bgBuild)}>{formatBuildStatus(bgBuild)}</span>
          </div>
        )}
      </div>
      <Panel title="popup" data={popup} />
      {bg && (
        <div className="mt-2 border-t border-white/10 pt-2">
          <Panel title="background" data={bg} />
        </div>
      )}
      <p className="mt-2 text-[8px] leading-snug text-text-muted">
        STALE → reload extension, then refresh music tabs. Logs tag:{" "}
        <span className="text-text-primary">[build:… ✓latest]</span> or{" "}
        <span className="text-red-300">✗STALE</span>
      </p>
      <p className="mt-1 text-[8px] leading-snug text-text-muted">
        Disable: localStorage.removeItem(&apos;songsphere:dev&apos;)
      </p>
    </aside>
  );
}
