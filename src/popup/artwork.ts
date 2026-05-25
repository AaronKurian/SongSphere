import { useEffect, useState } from "react";
import { BROWSER_FLAGS } from "~/shared/browser";
import { runtimeTelemetry } from "~/shared/telemetry";
import { HYDRATION_RADIUS, RENDER_RADIUS, tabIdsAroundSelected } from "~/background/session";
import type { PlayerSession } from "~/shared/types/session";

/** Popup artwork cache: URL register, blob decode, attach/detach, hydration-window promotion. */

export type ArtworkPhase = "cached" | "decoded" | "attached";

interface ArtworkEntry {
  sourceUrl: string;
  phase: ArtworkPhase;
  objectUrl?: string;
  attachRefs: number;
  lastTouch: number;
}

const memory = new Map<string, ArtworkEntry>();
const inflightDecode = new Map<string, Promise<string | undefined>>();
const decodeWaiters = new Map<string, Set<(url: string | undefined) => void>>();

function revokeEntry(entry: ArtworkEntry): void {
  if (entry.objectUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(entry.objectUrl);
  }
}

function notifyDecoded(sourceUrl: string, displayUrl: string | undefined): void {
  const waiters = decodeWaiters.get(sourceUrl);
  if (!waiters) return;
  decodeWaiters.delete(sourceUrl);
  for (const fn of waiters) fn(displayUrl);
}

function touchEntry(sourceUrl: string, entry: ArtworkEntry): void {
  entry.lastTouch = Date.now();
  memory.delete(sourceUrl);
  memory.set(sourceUrl, entry);
  evictIfNeeded();
}

function ensureEntry(sourceUrl: string): ArtworkEntry {
  const existing = memory.get(sourceUrl);
  if (existing) {
    touchEntry(sourceUrl, existing);
    return existing;
  }
  const entry: ArtworkEntry = {
    sourceUrl,
    phase: "cached",
    attachRefs: 0,
    lastTouch: Date.now(),
  };
  memory.set(sourceUrl, entry);
  return entry;
}

function evictEntry(sourceUrl: string, entry: ArtworkEntry): void {
  revokeEntry(entry);
  memory.delete(sourceUrl);
  inflightDecode.delete(sourceUrl);
  decodeWaiters.delete(sourceUrl);
}

function evictIfNeeded(): void {
  const softCap = Math.max(8, BROWSER_FLAGS.artworkCacheMax - 4);
  while (memory.size > BROWSER_FLAGS.artworkCacheMax) {
    let victim: string | undefined;
    let oldest = Infinity;
    for (const [url, entry] of memory) {
      if (entry.attachRefs > 0) continue;
      if (entry.lastTouch < oldest) {
        oldest = entry.lastTouch;
        victim = url;
      }
    }
    if (!victim) break;
    const evicted = memory.get(victim);
    if (evicted) evictEntry(victim, evicted);
  }

  if (memory.size <= softCap) return;

}

function displayUrl(entry: ArtworkEntry): string | undefined {
  if (entry.phase === "decoded" || entry.phase === "attached") {
    return entry.objectUrl ?? entry.sourceUrl;
  }
  return undefined;
}

function cacheArtworkUrl(sourceUrl: string | undefined): void {
  if (!sourceUrl) return;
  const entry = ensureEntry(sourceUrl);
  if (entry.phase === "cached") touchEntry(sourceUrl, entry);
}

export function peekArtworkUrl(sourceUrl: string | undefined): string | undefined {
  if (!sourceUrl) return undefined;
  const entry = memory.get(sourceUrl);
  if (!entry) return undefined;
  const url = displayUrl(entry);
  if (url) runtimeTelemetry.recordArtworkHit();
  return url;
}

export async function decodeArtwork(sourceUrl: string | undefined): Promise<string | undefined> {
  if (!sourceUrl) return undefined;

  const entry = memory.get(sourceUrl);
  if (entry && (entry.phase === "decoded" || entry.phase === "attached")) {
    touchEntry(sourceUrl, entry);
    runtimeTelemetry.recordArtworkHit();
    return displayUrl(entry);
  }

  const pending = inflightDecode.get(sourceUrl);
  if (pending) return pending;

  runtimeTelemetry.recordArtworkMiss();

  const promise = (async () => {
    try {
      const res = await fetch(sourceUrl, { mode: "cors", credentials: "omit" });
      if (!res.ok) return sourceUrl;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const current = ensureEntry(sourceUrl);
      if (current.objectUrl?.startsWith("blob:") && current.objectUrl !== objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
      }
      current.objectUrl = objectUrl;
      if (current.phase !== "attached") current.phase = "decoded";
      touchEntry(sourceUrl, current);
      const url = displayUrl(current);
      notifyDecoded(sourceUrl, url);
      return url;
    } catch {
      notifyDecoded(sourceUrl, sourceUrl);
      return sourceUrl;
    } finally {
      inflightDecode.delete(sourceUrl);
    }
  })();

  inflightDecode.set(sourceUrl, promise);
  return promise;
}

export function promoteArtworkDecode(urls: Iterable<string>): void {
  for (const url of urls) {
    if (!url) continue;
    cacheArtworkUrl(url);
    void decodeArtwork(url);
  }
}

export async function attachArtwork(sourceUrl: string | undefined): Promise<string | undefined> {
  if (!sourceUrl) return undefined;
  const entry = ensureEntry(sourceUrl);
  entry.attachRefs += 1;
  entry.phase = "attached";
  touchEntry(sourceUrl, entry);
  return decodeArtwork(sourceUrl);
}

export function detachArtwork(sourceUrl: string | undefined): void {
  if (!sourceUrl) return;
  const entry = memory.get(sourceUrl);
  if (!entry) return;
  entry.attachRefs = Math.max(0, entry.attachRefs - 1);
  if (entry.attachRefs === 0 && entry.phase === "attached") {
    entry.phase = entry.objectUrl ? "decoded" : "cached";
  }
  touchEntry(sourceUrl, entry);
  evictIfNeeded();
}

export function subscribeArtworkDecode(
  sourceUrl: string | undefined,
  listener: (displayUrl: string | undefined) => void,
): () => void {
  if (!sourceUrl) return () => undefined;
  const instant = peekArtworkUrl(sourceUrl);
  if (instant) {
    listener(instant);
    return () => undefined;
  }
  let set = decodeWaiters.get(sourceUrl);
  if (!set) {
    set = new Set();
    decodeWaiters.set(sourceUrl, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set?.size === 0) decodeWaiters.delete(sourceUrl);
  };
}

export function clearArtworkCache(): void {
  for (const [, entry] of memory) revokeEntry(entry);
  memory.clear();
  inflightDecode.clear();
  decodeWaiters.clear();
}

export interface UseArtworkUrlOptions {
  attach?: boolean;
}

export function useArtworkUrl(
  sourceUrl: string | undefined,
  options?: UseArtworkUrlOptions,
): string | undefined {
  const attach = options?.attach ?? false;
  const [resolved, setResolved] = useState<string | undefined>(() =>
    attach ? peekArtworkUrl(sourceUrl) : undefined,
  );

  useEffect(() => {
    if (!sourceUrl || !attach) {
      setResolved(undefined);
      return;
    }

    const instant = peekArtworkUrl(sourceUrl);
    if (instant) setResolved(instant);

    let cancelled = false;
    const unsub = subscribeArtworkDecode(sourceUrl, (url) => {
      if (!cancelled) setResolved(url);
    });

    void attachArtwork(sourceUrl).then((url) => {
      if (!cancelled && url) setResolved(url);
    });

    return () => {
      cancelled = true;
      unsub();
      detachArtwork(sourceUrl);
    };
  }, [sourceUrl, attach]);

  return attach ? resolved : undefined;
}

function collectPromotionArtwork(
  sessions: PlayerSession[],
  stripOrder: number[],
  selectedSessionId: number | null,
): string[] {
  const order = stripOrder.length > 0 ? stripOrder : sessions.map((s) => s.tabId);
  const decodeIds = new Set([
    ...tabIdsAroundSelected(order, selectedSessionId, RENDER_RADIUS),
    ...tabIdsAroundSelected(order, selectedSessionId, HYDRATION_RADIUS),
  ]);
  if (selectedSessionId !== null) decodeIds.add(selectedSessionId);

  const urls: string[] = [];
  for (const session of sessions) {
    const tier = session.hydration;
    const inWindow = decodeIds.has(session.tabId);
    if (!inWindow && tier !== "enhanced" && tier !== "full") continue;
    const artwork = session.snapshot.track?.artwork;
    if (artwork) urls.push(artwork);
  }
  return urls;
}

export function useArtworkPromotion(
  sessions: PlayerSession[],
  stripOrder: number[],
  selectedSessionId: number | null,
  selectedArtwork?: string,
): void {
  useEffect(() => {
    const urls = new Set(collectPromotionArtwork(sessions, stripOrder, selectedSessionId));
    if (selectedArtwork) urls.add(selectedArtwork);
    promoteArtworkDecode(urls);
  }, [sessions, stripOrder, selectedSessionId, selectedArtwork]);
}
