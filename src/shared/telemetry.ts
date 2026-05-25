import type { SessionsDeltaPayload } from "~/shared/types/session";
import type { TelemetrySnapshot } from "~/shared/types/telemetry";

function empty(): TelemetrySnapshot {
  return {
    deltaFlushes: 0,
    patchDeltas: 0,
    fullDeltas: 0,
    hydrationPromotions: 0,
    artworkCacheHits: 0,
    artworkCacheMisses: 0,
    dormantWakes: 0,
    renderPasses: 0,
    deltaApplies: 0,
  };
}

export function createRuntimeTelemetry() {
  const c = empty();

  return {
    recordDeltaFlush(delta: SessionsDeltaPayload) {
      c.deltaFlushes += 1;
      if (delta.reset) {
        c.fullDeltas += 1;
        return;
      }
      for (const d of delta.deltas) {
        if (d.kind === "patched") c.patchDeltas += 1;
        else if (d.kind === "updated" || d.kind === "added") c.fullDeltas += 1;
      }
    },
    recordHydrationPromotion() {
      c.hydrationPromotions += 1;
    },
    recordArtworkHit() {
      c.artworkCacheHits += 1;
    },
    recordArtworkMiss() {
      c.artworkCacheMisses += 1;
    },
    recordDormantWake() {
      c.dormantWakes += 1;
    },
    recordRenderPass() {
      c.renderPasses += 1;
    },
    recordDeltaApply() {
      c.deltaApplies += 1;
    },
    snapshot(): TelemetrySnapshot {
      return { ...c };
    },
    reset() {
      Object.assign(c, empty());
    },
  };
}

export const runtimeTelemetry = createRuntimeTelemetry();
