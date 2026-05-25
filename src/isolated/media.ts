import {
  POLL_DORMANT_MS,
  POLL_HIDDEN_MS,
  POLL_IDLE_MS,
  POLL_PAUSED_MS,
  POLL_PLAYING_MS,
} from "~/shared/constants";
import { BROWSER_FLAGS } from "~/shared/browser";
import { getSyncTier } from "~/shared/policy";
import type { CleanupManager } from "~/isolated/safety";
import { throttle } from "~/shared/scheduling";
import { clamp } from "~/shared/utils";
import { trackHash, type TrackInfo } from "~/shared/types/player";

/** DOM helpers: resilient selectors, volume read/write (range + aria), adaptive polling. */

export function queryFirst<T extends Element = HTMLElement>(
  selectors: readonly string[],
  root: ParentNode = document,
): T | null {
  for (const s of selectors) {
    try {
      const el = root.querySelector(s);
      if (el) return el as T;
    } catch {
      /* invalid selector */
    }
  }
  return null;
}

export function readText(selectors: readonly string[], root: ParentNode = document): string {
  return (queryFirst(selectors, root)?.textContent ?? "").trim();
}

export function readAttr(
  selectors: readonly string[],
  attr: string,
  root: ParentNode = document,
): string {
  return (queryFirst<HTMLElement>(selectors, root)?.getAttribute(attr) ?? "").trim();
}

export function clickFirst(selectors: readonly string[], root: ParentNode = document): boolean {
  const el = queryFirst<HTMLElement>(selectors, root);
  if (!el) return false;
  el.click();
  return true;
}

export function readVolumeFromRange(
  inputSelectors: readonly string[],
  root: ParentNode = document,
  defaultMax = 100,
): number | undefined {
  const input = queryFirst<HTMLInputElement>(inputSelectors, root);
  if (!input) return undefined;
  const raw = Number(input.value);
  if (!Number.isFinite(raw)) return undefined;
  const max = Number(input.getAttribute("max")) || defaultMax;
  if (max <= 0) return undefined;
  return clamp(raw / max, 0, 1);
}

export function writeVolumeToInput(
  input: HTMLInputElement,
  volume: number,
  defaultMax = 100,
): void {
  const max = Number(input.getAttribute("max")) || defaultMax;
  const next = String(Math.round(clamp(volume, 0, 1) * max));
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  desc?.set?.call(input, next);
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function writeVolumeToRange(
  inputSelectors: readonly string[],
  volume: number,
  root: ParentNode = document,
  defaultMax = 100,
): boolean {
  const input = queryFirst<HTMLInputElement>(inputSelectors, root);
  if (!input) return false;
  writeVolumeToInput(input, volume, defaultMax);
  return true;
}

export function queryRangeInContainer(
  containerSelectors: readonly string[],
  root: ParentNode = document,
): HTMLInputElement | null {
  const container = queryFirst(containerSelectors, root);
  if (!container) return null;
  const direct = container.querySelector("input[type='range']");
  if (direct instanceof HTMLInputElement) return direct;
  const host = container as HTMLElement;
  const shadow = host.shadowRoot?.querySelector("input[type='range']");
  if (shadow instanceof HTMLInputElement) return shadow;
  return null;
}

export function readVolumeFromAriaSlider(
  containerSelectors: readonly string[],
  root: ParentNode = document,
): number | undefined {
  const el = queryFirst(containerSelectors, root);
  if (!el) return undefined;
  const now = el.getAttribute("aria-valuenow");
  const max = Number(el.getAttribute("aria-valuemax") || 100);
  if (now == null || !Number.isFinite(Number(now)) || max <= 0) return undefined;
  return clamp(Number(now) / max, 0, 1);
}

export function validateSelectorMap(map: Record<string, readonly string[]>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [key, selectors] of Object.entries(map)) {
    out[key] = !!queryFirst(selectors);
  }
  return out;
}

export interface MediaSessionSnapshot {
  title?: string;
  artist?: string;
  artwork?: string;
  album?: string;
}

export function readMediaSession(): MediaSessionSnapshot {
  const md = (navigator as unknown as {
    mediaSession?: {
      metadata?: {
        title?: string;
        artist?: string;
        album?: string;
        artwork?: { src?: string }[];
      };
      playbackState?: MediaSessionPlaybackState;
    };
  }).mediaSession?.metadata;
  if (!md) return {};
  const artworks = Array.isArray(md.artwork) ? md.artwork : [];
  return {
    title: md.title || undefined,
    artist: md.artist || undefined,
    album: md.album || undefined,
    artwork: artworks[artworks.length - 1]?.src || undefined,
  };
}

export function readMediaSessionPlaybackState(): MediaSessionPlaybackState | null {
  return (navigator as unknown as { mediaSession?: { playbackState?: MediaSessionPlaybackState } })
    .mediaSession?.playbackState ?? null;
}

export function getActiveMediaElement(): HTMLMediaElement | null {
  const elements = [...document.querySelectorAll<HTMLMediaElement>("audio, video")];
  const playing = elements.filter((el) => !el.paused && !el.ended && el.readyState > 2);
  if (playing.length) return playing[playing.length - 1] ?? null;
  return elements[elements.length - 1] ?? null;
}

export function dispatchMediaKey(key: string): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

export function getAdaptivePollMs(isPlaying: boolean): number {
  if (document.hidden) return POLL_HIDDEN_MS;
  if (!isPlaying) return POLL_PAUSED_MS;
  return POLL_PLAYING_MS;
}

export interface PlaybackObserverHandle {
  stop(): void;
  rebind(): void;
  setSyncTier(): void;
}

const OBSERVER_OPTS: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "aria-label",
    "aria-pressed",
    "aria-checked",
    "aria-valuenow",
    "title",
    "src",
    "value",
    "style",
  ],
};

export function observePlayback(
  read: () => Promise<TrackInfo | null> | TrackInfo | null,
  onChange: (track: TrackInfo | null) => void,
  cleanup: CleanupManager,
): PlaybackObserverHandle {
  let lastHash = "";
  let stopped = false;
  let scheduled = false;
  let pollMs = POLL_PAUSED_MS;
  let pollId = 0;
  let liteMode = false;
  let lastPlaying = false;

  const setLiteMode = (playing: boolean) => {
    lastPlaying = playing;
    const nextLite = document.hidden && !playing;
    if (nextLite === liteMode) return;
    liteMode = nextLite;
    if (nextLite) observer.disconnect();
    else observer.observe(document.documentElement, OBSERVER_OPTS);
  };

  const resolvePollMs = (playing: boolean) => {
    const tier = getSyncTier();
    if (tier === "dormant") return POLL_DORMANT_MS;
    if (tier === "lite") return POLL_IDLE_MS;
    return liteMode ? POLL_IDLE_MS : getAdaptivePollMs(playing);
  };

  const applySyncTier = () => {
    const tier = getSyncTier();
    if (tier === "dormant" || tier === "lite") observer.disconnect();
    else if (!liteMode) observer.observe(document.documentElement, OBSERVER_OPTS);
  };

  const fire = async () => {
    if (stopped) return;
    scheduled = false;
    try {
      const next = await read();
      const hash = trackHash(next);
      if (hash !== lastHash) {
        lastHash = hash;
        onChange(next);
      }
      const playing = !!next?.isPlaying;
      setLiteMode(playing);
      const nextPoll = resolvePollMs(playing);
      if (nextPoll !== pollMs) {
        pollMs = nextPoll;
        window.clearInterval(pollId);
        pollId = window.setInterval(schedule, pollMs);
      }
    } catch {
      /* never let observer errors escape */
    }
  };

  const schedule = () => {
    if (scheduled || stopped) return;
    if (getSyncTier() === "dormant") return;
    if (liteMode && getSyncTier() !== "lite") return;
    scheduled = true;
    setTimeout(fire, 80);
  };

  const pollTick = () => {
    if (stopped) return;
    scheduled = true;
    const dormant = getSyncTier() === "dormant";
    setTimeout(fire, dormant || (liteMode && getSyncTier() !== "lite") ? 0 : 80);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, OBSERVER_OPTS);
  cleanup.add(() => observer.disconnect());

  const throttled = throttle(schedule, BROWSER_FLAGS.mediaThrottleMs);
  const instantEvents = ["play", "pause", "ended"] as const;
  const throttledEvents = ["timeupdate", "volumechange"] as const;
  for (const evt of instantEvents) {
    document.addEventListener(evt, schedule, true);
    cleanup.add(() => document.removeEventListener(evt, schedule, true));
  }
  for (const evt of throttledEvents) {
    const guarded = () => {
      if (getSyncTier() === "dormant") return;
      throttled();
    };
    document.addEventListener(evt, guarded, true);
    cleanup.add(() => document.removeEventListener(evt, guarded, true));
  }

  const onVisibility = () => {
    setLiteMode(lastPlaying);
    applySyncTier();
    const nextPoll = resolvePollMs(lastPlaying);
    if (nextPoll !== pollMs) {
      pollMs = nextPoll;
      window.clearInterval(pollId);
      pollId = window.setInterval(pollTick, pollMs);
    }
    pollTick();
  };
  document.addEventListener("visibilitychange", onVisibility);
  cleanup.add(() => document.removeEventListener("visibilitychange", onVisibility));

  pollId = window.setInterval(pollTick, pollMs);
  cleanup.add(() => clearInterval(pollId));

  pollTick();

  applySyncTier();

  return {
    stop() {
      stopped = true;
      cleanup.runAll();
    },
    rebind() {
      lastHash = "";
      applySyncTier();
      pollTick();
    },
    setSyncTier() {
      applySyncTier();
      const nextPoll = resolvePollMs(lastPlaying);
      if (nextPoll !== pollMs) {
        pollMs = nextPoll;
        window.clearInterval(pollId);
        pollId = window.setInterval(pollTick, pollMs);
      }
      pollTick();
    },
  };
}
