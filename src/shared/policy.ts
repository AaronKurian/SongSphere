import { DORMANT_STALE_MS } from "~/shared/constants";
import { tierRank } from "~/background/hydration";
import type { RegistryEntry } from "~/background/session";
import type { SessionHydration } from "~/shared/types/session";

export type SyncTier = "full" | "lite" | "dormant";

let tier: SyncTier = "lite";

export function setSyncTier(next: SyncTier): void {
  tier = next;
}

export function getSyncTier(): SyncTier {
  return tier;
}

export function syncTierForHydration(hydration: SessionHydration): SyncTier {
  if (hydration === "full") return "full";
  if (hydration === "enhanced") return "lite";
  if (hydration === "partial") return "lite";
  return "dormant";
}

export function resolveSyncTier(
  tabId: number,
  entry: RegistryEntry,
  tab: { discarded?: boolean; audible?: boolean; active?: boolean } | undefined,
  selectedId: number | null,
  hydrationWindow: Set<number>,
): SyncTier {
  const hydration = entry.hydration;
  if (tabId === selectedId || hydration === "full") return "full";
  if (tierRank(hydration) >= tierRank("enhanced")) return "lite";
  if (hydrationWindow.has(tabId)) return "lite";

  const playing = entry.track?.isPlaying ?? false;
  const audible = tab?.audible ?? false;
  const focused = tab?.active ?? false;

  if (audible || focused || playing) return "lite";

  const stale = Date.now() - entry.updatedAt > DORMANT_STALE_MS;
  const discarded = tab?.discarded === true;
  const offWindow = !hydrationWindow.has(tabId) && tabId !== selectedId;

  if (discarded) return "dormant";
  if (hydration === "minimal" && offWindow && !playing && !audible) return "dormant";
  if (stale && !playing && !audible) return "dormant";
  return syncTierForHydration(hydration);
}

export type WakeReason = "audible" | "focus" | "playing" | "selected";

export function shouldWakeSession(
  entry: RegistryEntry,
  tab: { audible?: boolean; active?: boolean; discarded?: boolean } | undefined,
  prevPlaying: boolean,
): WakeReason | null {
  if (tab?.discarded) return null;
  const playing = entry.track?.isPlaying ?? false;
  if (playing && !prevPlaying) return "playing";
  if (tab?.audible) return "audible";
  if (tab?.active) return "focus";
  return null;
}
