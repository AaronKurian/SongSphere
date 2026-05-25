import { getCapabilities, TRACK_UPDATE_DEBOUNCE_MS } from "~/shared/constants";
import { CleanupManager } from "~/isolated/safety";
import { observePlayback } from "~/isolated/media";
import { CoalescingActionQueue } from "~/shared/scheduling";
import { bindSpaNavigation } from "~/isolated/spa";
import { debugLog } from "~/shared/debug";
import { broadcastEvent, onMessage } from "~/background/messaging";
import { setSyncTier, type SyncTier } from "~/shared/policy";
import type { CommandMessage } from "~/shared/types/messages";
import { debounce } from "~/shared/utils";
import type { AdapterCapabilities, MusicAdapter } from "~/shared/types/adapter";
import { trackHash, type Platform, type TrackInfo } from "~/shared/types/player";

export abstract class BaseMusicAdapter implements MusicAdapter {
  abstract readonly platform: Platform;
  abstract readonly capabilities: AdapterCapabilities;

  protected readonly cleanup = new CleanupManager();
  readonly actionQueue = new CoalescingActionQueue();
  protected subscribers = new Set<(t: TrackInfo | null) => void>();
  protected observer: ReturnType<typeof observePlayback> | null = null;
  protected last: TrackInfo | null = null;
  protected lastHash = "";

  abstract isReady(): boolean;
  protected abstract readTrack(): Promise<TrackInfo | null> | TrackInfo | null;

  abstract play(): Promise<void>;
  abstract pause(): Promise<void>;
  abstract togglePlay(): Promise<void>;
  abstract next(): Promise<void>;
  abstract previous(): Promise<void>;
  abstract setVolume(volume: number): Promise<void>;
  abstract seek(position: number): Promise<void>;
  abstract toggleLike(): Promise<void>;

  validateSelectors?(): Record<string, boolean>;

  async getTrackInfo(): Promise<TrackInfo | null> {
    const t = await this.readTrack();
    this.last = t;
    this.lastHash = trackHash(t);
    return t;
  }

  subscribe(onChange: (track: TrackInfo | null) => void): () => void {
    this.subscribers.add(onChange);
    this.ensureObserver();
    if (this.last !== null) onChange(this.last);
    return () => {
      this.subscribers.delete(onChange);
      if (this.subscribers.size === 0) this.destroy();
    };
  }

  protected notify(next: TrackInfo | null): void {
    const hash = trackHash(next);
    if (hash === this.lastHash) return;
    this.lastHash = hash;
    this.last = next;
    for (const sub of this.subscribers) sub(next);
  }

  protected ensureObserver(): void {
    if (this.observer) return;
    this.observer = observePlayback(
      () => this.readTrack(),
      (next) => this.notify(next),
      this.cleanup,
    );
    bindSpaNavigation(this.cleanup, () => this.rebind());
  }

  protected rebind(): void {
    this.lastHash = "";
    this.observer?.rebind();
    void this.getTrackInfo().then((t) => this.notify(t));
  }

  setSyncPriority(tier: SyncTier): void {
    setSyncTier(tier);
    this.observer?.setSyncTier();
  }

  destroy(): void {
    this.actionQueue.clear();
    this.observer?.stop();
    this.observer = null;
    this.cleanup.runAll();
  }
}

export function bootstrapAdapter(adapter: BaseMusicAdapter): () => void {
  const emit = debounce(() => {
    void adapter.getTrackInfo().then((track) => {
      broadcastEvent({ type: "TRACK_UPDATED", track });
    });
  }, TRACK_UPDATE_DEBOUNCE_MS);

  const unsubscribe = adapter.subscribe(() => emit());
  const run = <T>(fn: () => Promise<T>, priority: "high" | "medium" | "low" = "medium") =>
    adapter.actionQueue.enqueue(fn, priority);

  const off = [
    onMessage("GET_TRACK_INFO", () => adapter.getTrackInfo()),
    onMessage("GET_CAPABILITIES", () => adapter.capabilities),
    onMessage("PLAY", () => run(() => adapter.play(), "high")),
    onMessage("PAUSE", () => run(() => adapter.pause(), "high")),
    onMessage("TOGGLE_PLAY", () => run(() => adapter.togglePlay(), "high")),
    onMessage("NEXT", () => {
      debugLog(adapter.platform, "cmd NEXT received");
      return run(() => adapter.next(), "medium");
    }),
    onMessage("PREVIOUS", () => {
      debugLog(adapter.platform, "cmd PREVIOUS received");
      return run(() => adapter.previous(), "medium");
    }),
    onMessage("SET_VOLUME", (m) => {
      void adapter.actionQueue.enqueueVolume((v) => adapter.setVolume(v), m.volume);
      return undefined;
    }),
    onMessage("SEEK", (m) => run(() => adapter.seek(m.position), "medium")),
    onMessage("TOGGLE_LIKE", () => run(() => adapter.toggleLike(), "medium")),
    onMessage("PING", () => "pong" as const),
    onMessage("SET_SYNC_PRIORITY", (m: Extract<CommandMessage, { type: "SET_SYNC_PRIORITY" }>) => {
      adapter.setSyncPriority(m.tier);
      return undefined;
    }),
  ];

  return () => {
    unsubscribe();
    adapter.destroy();
    for (const u of off) u();
  };
}

export function capabilitiesFor(platform: Platform): AdapterCapabilities {
  return getCapabilities(platform);
}
