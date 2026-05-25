import { BROWSER_FLAGS } from "~/shared/browser";
import { runtimeTelemetry } from "~/shared/telemetry";
import { isVisibleRegistryEntry, type RegistryEntry, type RegistryTabInfo } from "~/background/session";
import {
  HYDRATION_RADIUS,
  PRELOAD_RADIUS,
  RENDER_RADIUS,
  tabIdsAroundSelected,
} from "~/background/session";
import type { SessionHydration } from "~/shared/types/session";
import type { TrackInfo } from "~/shared/types/player";

const TIER_RANK: Record<SessionHydration, number> = {
  minimal: 0,
  partial: 1,
  enhanced: 2,
  full: 3,
};

export function tierRank(tier: SessionHydration): number {
  return TIER_RANK[tier];
}

export function maxTier(a: SessionHydration, b: SessionHydration): SessionHydration {
  return tierRank(a) >= tierRank(b) ? a : b;
}

export function promoteTier(current: SessionHydration, target: SessionHydration): SessionHydration {
  return maxTier(current, target);
}

export function projectTrackForTier(
  track: TrackInfo | null,
  tier: SessionHydration,
): TrackInfo | null {
  if (!track) return null;
  switch (tier) {
    case "minimal":
      return {
        platform: track.platform,
        title: "",
        artist: "",
        isPlaying: track.isPlaying,
      };
    case "partial":
      return {
        platform: track.platform,
        title: track.title,
        artist: track.artist,
        isPlaying: track.isPlaying,
        liked: track.liked,
        volume: track.volume,
      };
    case "enhanced":
      return {
        platform: track.platform,
        title: track.title,
        artist: track.artist,
        isPlaying: track.isPlaying,
        artwork: track.artwork,
        duration: track.duration,
        currentTime: track.currentTime,
        volume: track.volume,
        liked: track.liked,
      };
    case "full":
      return track;
  }
}

export interface HydrationWindows {
  full: Set<number>;
  enhanced: Set<number>;
  partial: Set<number>;
}

export function orderedRegistryTabIds(
  registry: Map<number, RegistryEntry>,
  stripOrder: number[],
  tabById?: Map<number, RegistryTabInfo>,
  selectedSessionId?: number | null,
): number[] {
  const ctx = { selectedSessionId };
  const visible = [...registry.values()].filter((e) =>
    isVisibleRegistryEntry(e, tabById?.get(e.tabId), ctx),
  );
  const ids = new Set(visible.map((e) => e.tabId));
  const order = stripOrder.filter((id) => ids.has(id));
  for (const e of visible) {
    if (!order.includes(e.tabId)) order.push(e.tabId);
  }
  return order;
}

export function computeHydrationWindows(
  registry: Map<number, RegistryEntry>,
  selectedId: number | null,
  stripOrder: number[],
  tabById?: Map<number, RegistryTabInfo>,
): HydrationWindows {
  const order = orderedRegistryTabIds(registry, stripOrder, tabById, selectedId);
  const full = tabIdsAroundSelected(order, selectedId, HYDRATION_RADIUS);
  const enhanced = tabIdsAroundSelected(order, selectedId, RENDER_RADIUS);
  const partial = tabIdsAroundSelected(order, selectedId, PRELOAD_RADIUS);
  if (selectedId !== null) full.add(selectedId);
  return { full, enhanced, partial };
}

export function targetTierForTab(
  tabId: number,
  selectedId: number | null,
  windows: HydrationWindows,
): SessionHydration {
  if (tabId === selectedId) return "full";
  if (windows.full.has(tabId)) return "full";
  if (windows.enhanced.has(tabId)) return "enhanced";
  if (windows.partial.has(tabId)) return "partial";
  return "minimal";
}

export function trackForHydration(
  track: TrackInfo | null,
  hydration: SessionHydration,
): TrackInfo | null {
  return projectTrackForTier(track, hydration);
}

export function hydrationWindowTabIds(
  registry: Map<number, RegistryEntry>,
  selectedId: number | null,
  stripOrder: number[],
  tabById?: Map<number, RegistryTabInfo>,
): Set<number> {
  const order = orderedRegistryTabIds(registry, stripOrder, tabById, selectedId);
  return tabIdsAroundSelected(order, selectedId, HYDRATION_RADIUS);
}

export function preloadWindowTabIds(
  registry: Map<number, RegistryEntry>,
  selectedId: number | null,
  stripOrder: number[],
  tabById?: Map<number, RegistryTabInfo>,
): Set<number> {
  const order = orderedRegistryTabIds(registry, stripOrder, tabById, selectedId);
  return tabIdsAroundSelected(order, selectedId, PRELOAD_RADIUS);
}

export function renderWindowTabIds(
  registry: Map<number, RegistryEntry>,
  selectedId: number | null,
  stripOrder: number[],
  tabById?: Map<number, RegistryTabInfo>,
): Set<number> {
  return computeHydrationWindows(registry, selectedId, stripOrder, tabById).enhanced;
}

type DemoteCallback = (tabId: number, tier: SessionHydration) => void;

const demoteTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function cancelDemotion(tabId: number): void {
  const t = demoteTimers.get(tabId);
  if (t) clearTimeout(t);
  demoteTimers.delete(tabId);
}

export function cancelAllDemotions(): void {
  for (const t of demoteTimers.values()) clearTimeout(t);
  demoteTimers.clear();
}

export function scheduleDemotion(
  tabId: number,
  targetTier: SessionHydration,
  onDemote: DemoteCallback,
): void {
  cancelDemotion(tabId);
  demoteTimers.set(
    tabId,
    setTimeout(() => {
      demoteTimers.delete(tabId);
      onDemote(tabId, targetTier);
    }, BROWSER_FLAGS.hydrationDemoteMs),
  );
}

export function applyMonotonicHydration(
  current: SessionHydration,
  target: SessionHydration,
  tabId: number,
  onDemote: DemoteCallback,
): SessionHydration {
  if (tierRank(target) >= tierRank(current)) {
    cancelDemotion(tabId);
    const promoted = promoteTier(current, target);
    if (tierRank(promoted) > tierRank(current)) {
      runtimeTelemetry.recordHydrationPromotion();
    }
    return promoted;
  }
  if (tierRank(target) < tierRank(current)) {
    scheduleDemotion(tabId, target, onDemote);
  }
  return current;
}

let fullSelectTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedFullSelect(
  run: () => void | Promise<void>,
  delayMs = BROWSER_FLAGS.fullHydrateDebounceMs,
): void {
  if (fullSelectTimer) clearTimeout(fullSelectTimer);
  fullSelectTimer = setTimeout(() => {
    fullSelectTimer = null;
    void run();
  }, delayMs);
}

export function cancelDebouncedFullSelect(): void {
  if (fullSelectTimer) clearTimeout(fullSelectTimer);
  fullSelectTimer = null;
}
