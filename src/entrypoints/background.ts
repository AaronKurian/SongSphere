import type { Browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { detectPlatformFromUrl, getCapabilities, isMusicSessionPlatform, PLATFORMS } from "~/shared/constants";
import type { AdapterCapabilities } from "~/shared/types/adapter";
import { ext } from "~/shared/browser";
import { BROWSER_FLAGS } from "~/shared/browser";
import {
  applyMonotonicHydration,
  cancelDemotion,
  debouncedFullSelect,
  computeHydrationWindows,
  hydrationWindowTabIds,
  preloadWindowTabIds,
  promoteTier,
  targetTierForTab,
} from "~/background/hydration";
import { runtimeTelemetry } from "~/shared/telemetry";
import { clearMainRuntimeInjected, ensureMainBridgeForTab } from "~/background/main-inject";
import { onMessage, sendToTab } from "~/background/messaging";
import {
  adjacentSessionId,
  buildSessionsPayload,
  isVisibleRegistryEntry,
  pickFallbackSelected,
  pruneRegistry,
  type RegistryEntry,
  type RegistryTabInfo,
} from "~/background/session";
import { createDeltaBatcher } from "~/shared/scheduling";
import { sessionsToSnapshot } from "~/background/session";
import { resolveSyncTier, type SyncTier } from "~/shared/policy";
import { shouldWakeSession } from "~/shared/policy";
import {
  loadPersistedMeta,
  saveCachedSessions,
  savePersistedMeta,
} from "~/background/storage";
import { bindPopupPort, broadcastToPopup, startHeartbeat } from "~/background/popup-port";
import { BUILD_ID } from "~/shared/constants";
import { getBuildFreshness, initBuildFreshness } from "~/shared/build";
import { installMainRuntimeInTab } from "~/background/main-inject";
import { debugLog, debugWarn } from "~/shared/debug";
import type { CommandMessage, EventMessage, ResultOf } from "~/shared/types/messages";
import type { Platform, TrackInfo } from "~/shared/types/player";
import type { SessionHydration, SessionsPayload } from "~/shared/types/session";

const RESYNC_MIN_MS = 400;
const WAKE_DEBOUNCE_MS = 200;

export default defineBackground(() => {
  initBuildFreshness("background");
  console.warn(`[SongSphere] background started ${BUILD_ID}`);
  debugLog("bg", "service worker", BUILD_ID);
  const registry = new Map<number, RegistryEntry>();
  let selectedSessionId: number | null = null;
  let stripOrder: number[] = [];
  let payloadVersion = 0;
  let resyncGen = 0;
  let lastResyncAt = 0;
  let lastBroadcast: SessionsPayload | null = null;
  const deltaBatcher = createDeltaBatcher((delta) => {
    runtimeTelemetry.recordDeltaFlush(delta);
    if (delta.reset) {
      broadcastToPopup({ type: "SESSIONS_UPDATED", payload: delta.reset });
      return;
    }
    broadcastToPopup({ type: "SESSIONS_DELTA", delta });
  });
  const prevPlaying = new Map<number, boolean>();
  const wakeTimers = new Map<number, ReturnType<typeof setTimeout>>();
  const lastSyncTier = new Map<number, SyncTier>();
  let storageRestored = false;
  let tabById = new Map<number, RegistryTabInfo>();

  const indexTabs = (tabs: Browser.tabs.Tab[]): Map<number, RegistryTabInfo> => {
    tabById = new Map(
      tabs
        .filter((t): t is typeof t & { id: number } => typeof t.id === "number")
        .map((t) => [t.id, t]),
    );
    return tabById;
  };

  const visibilityCtx = () => ({ selectedSessionId });

  const touchInteraction = (tabId: number) => {
    const entry = registry.get(tabId);
    if (entry) registry.set(tabId, { ...entry, lastInteraction: Date.now() });
  };

  const bumpVersion = () => ++payloadVersion;

  const buildPayload = async (touchVersion = false): Promise<SessionsPayload> => {
    if (touchVersion) bumpVersion();
    const tabs = await ext.tabs.query({});
    indexTabs(tabs);
    stripOrder = pruneRegistry(registry, stripOrder, tabs, selectedSessionId);
    const payload = buildSessionsPayload(
      registry,
      selectedSessionId,
      payloadVersion,
      tabs,
      stripOrder,
    );
    if (
      selectedSessionId !== null &&
      !payload.sessions.some((s) => s.tabId === selectedSessionId)
    ) {
      selectedSessionId = payload.sessions[0]?.tabId ?? null;
    }
    debugLog(
      "registry",
      `${payload.sessions.length} sessions`,
      payload.sessions.map((s) => `${s.tabId}:${s.platform}`).join(", ") || "(empty)",
    );
    return payload;
  };

  const removeRegistryTab = (tabId: number) => {
    if (!registry.has(tabId)) return;
    registry.delete(tabId);
    stripOrder = stripOrder.filter((id) => id !== tabId);
    lastSyncTier.delete(tabId);
    prevPlaying.delete(tabId);
    cancelDemotion(tabId);
    const wake = wakeTimers.get(tabId);
    if (wake) clearTimeout(wake);
    wakeTimers.delete(tabId);
  };

  const demoteEntryHydration = (tabId: number, tier: SessionHydration) => {
    const entry = registry.get(tabId);
    if (!entry || entry.hydration === tier) return;
    registry.set(tabId, { ...entry, hydration: tier });
    void persistAndBroadcast();
  };

  const syncRegistryHydrationFlags = () => {
    const windows = computeHydrationWindows(registry, selectedSessionId, stripOrder, tabById);
    for (const [tabId, entry] of registry) {
      const target = targetTierForTab(tabId, selectedSessionId, windows);
      const hydration = applyMonotonicHydration(
        entry.hydration,
        target,
        tabId,
        demoteEntryHydration,
      );
      registry.set(tabId, { ...entry, hydration });
    }
  };

  const broadcastSyncTiers = async () => {
    const tabs = await ext.tabs.query({});
    indexTabs(tabs);
    const windowIds = hydrationWindowTabIds(registry, selectedSessionId, stripOrder, tabById);
    for (const tabId of registry.keys()) {
      const entry = registry.get(tabId);
      const tab = tabById.get(tabId);
      if (!entry || !tab || !isVisibleRegistryEntry(entry, tab, visibilityCtx())) {
        lastSyncTier.delete(tabId);
        continue;
      }
      const tier = resolveSyncTier(
        tabId,
        entry,
        tab,
        selectedSessionId,
        windowIds,
      );
      if (lastSyncTier.get(tabId) === tier) continue;
      lastSyncTier.set(tabId, tier);
      try {
        await sendToTab(tabId, { type: "SET_SYNC_PRIORITY", tier });
        debugLog("sync", tabId, entry.platform, tier);
      } catch {
        lastSyncTier.delete(tabId);
      }
    }
  };

  const persistAndBroadcast = async (touchVersion = false) => {
    syncRegistryHydrationFlags();
    const payload = await buildPayload(touchVersion);
    await saveCachedSessions(payload);
    await savePersistedMeta(selectedSessionId, registry);
    await broadcastSyncTiers();

    lastBroadcast = payload;
    deltaBatcher.push(payload, { immediate: touchVersion });
  };

  const escalateSession = async (tabId: number) => {
    if (!registry.has(tabId)) return;
    const hydrationIds = hydrationWindowTabIds(registry, selectedSessionId, stripOrder, tabById);
    const preloadIds = preloadWindowTabIds(registry, selectedSessionId, stripOrder, tabById);
    const shouldPull = hydrationIds.has(tabId) || preloadIds.has(tabId);

    try {
      await sendToTab(tabId, { type: "SET_SYNC_PRIORITY", tier: "lite" });
    } catch {
      /* tab not ready */
    }

    if (shouldPull) await pullTrackFromTab(tabId);

    if (tabId === selectedSessionId) {
      try {
        await sendToTab(tabId, { type: "SET_SYNC_PRIORITY", tier: "full" });
      } catch {
        /* tab not ready */
      }
    }

    await persistAndBroadcast();
  };

  const scheduleWake = (tabId: number) => {
    runtimeTelemetry.recordDormantWake();
    const existing = wakeTimers.get(tabId);
    if (existing) clearTimeout(existing);
    wakeTimers.set(
      tabId,
      setTimeout(() => {
        wakeTimers.delete(tabId);
        void escalateSession(tabId);
      }, WAKE_DEBOUNCE_MS),
    );
  };

  const restoreFromStorage = async () => {
    const meta = await loadPersistedMeta();
    if (!meta) return;
    selectedSessionId = meta.selectedSessionId;
    registry.clear();
    for (const [id, entry] of meta.entries) {
      if (!isMusicSessionPlatform(entry.platform)) continue;
      registry.set(id, { ...entry, controllable: false });
    }
    stripOrder = [...registry.keys()].sort((a, b) => a - b);
    if (
      selectedSessionId !== null &&
      !registry.has(selectedSessionId)
    ) {
      selectedSessionId = stripOrder[0] ?? null;
    }
    debugLog("restore", `${registry.size} music entries from storage`);
  };

  const registerTab = (
    tabId: number,
    url: string | undefined,
    hint?: Platform,
    track?: TrackInfo | null,
    opts?: { controllable?: boolean },
  ) => {
    const platform = hint ?? detectPlatformFromUrl(url);
    if (!platform) {
      if (registry.has(tabId)) {
        debugLog("unregister", tabId, "url", url?.slice(0, 60));
        registry.delete(tabId);
        stripOrder = stripOrder.filter((id) => id !== tabId);
        lastSyncTier.delete(tabId);
        if (selectedSessionId === tabId) {
          const payload = buildSessionsPayload(registry, null, payloadVersion, [], stripOrder);
          selectedSessionId = pickFallbackSelected(payload.sessions, tabId);
        }
      }
      return;
    }

    if (platform === "generic") {
      removeRegistryTab(tabId);
      return;
    }

    if (platform === "youtube" && !registry.has(tabId) && !track) {
      return;
    }

    const existing = registry.get(tabId);
    const isNew = !existing;
    const controllable =
      opts?.controllable === true ||
      existing?.controllable === true ||
      Boolean(track?.title || track?.artist);
    registry.set(tabId, {
      tabId,
      platform,
      track: track ?? existing?.track ?? null,
      hydration: existing?.hydration ?? "minimal",
      updatedAt: existing?.updatedAt ?? Date.now(),
      lastInteraction: existing?.lastInteraction ?? Date.now(),
      controllable,
    });
    if (!stripOrder.includes(tabId)) {
      stripOrder.push(tabId);
      stripOrder.sort((a, b) => a - b);
    }
    if (selectedSessionId === null) selectedSessionId = tabId;
    if (isNew) {
      debugLog("register", tabId, platform, track?.title ?? url?.slice(0, 60));
    }
    syncRegistryHydrationFlags();
  };

  const pullTrackFromTab = async (
    tabId: number,
    minTier: SessionHydration = "partial",
  ): Promise<void> => {
    try {
      let track = await sendToTab(tabId, { type: "GET_TRACK_INFO" });
      const entry = registry.get(tabId);
      if (!entry) return;
      if (entry.platform === "youtube" && !track) {
        registry.delete(tabId);
        stripOrder = stripOrder.filter((id) => id !== tabId);
        return;
      }
      const windows = computeHydrationWindows(registry, selectedSessionId, stripOrder, tabById);
      const target = promoteTier(
        minTier,
        targetTierForTab(tabId, selectedSessionId, windows),
      );
      registry.set(tabId, {
        ...entry,
        track,
        controllable: true,
        hydration: promoteTier(entry.hydration, target),
        updatedAt: Date.now(),
      });
    } catch {
      const entry = registry.get(tabId);
      if (entry && !entry.controllable) removeRegistryTab(tabId);
    }
  };

  const probeAndRegisterTab = async (
    tabId: number,
    url: string | undefined,
    platform: Platform,
  ): Promise<boolean> => {
    try {
      await sendToTab(tabId, { type: "PING" });
    } catch {
      return false;
    }
    registerTab(tabId, url, platform, undefined, { controllable: true });
    await pullTrackFromTab(tabId);
    return true;
  };

  const revalidateRegistryTabs = async () => {
    for (const tabId of [...registry.keys()]) {
      const entry = registry.get(tabId);
      const tab = tabById.get(tabId);
      if (!entry || !tab) {
        removeRegistryTab(tabId);
        continue;
      }
      if (entry.controllable) continue;
      try {
        await sendToTab(tabId, { type: "PING" });
        registry.set(tabId, { ...entry, controllable: true });
        await pullTrackFromTab(tabId);
      } catch {
        removeRegistryTab(tabId);
      }
    }
  };

  const hydrateWindow = async () => {
    const ids = hydrationWindowTabIds(registry, selectedSessionId, stripOrder, tabById);
    await Promise.all([...ids].map((id) => pullTrackFromTab(id, "full")));
    syncRegistryHydrationFlags();
  };

  const hydrateSession = async (tabId: number) => {
    if (!registry.has(tabId)) return;
    touchInteraction(tabId);
    await pullTrackFromTab(tabId, "partial");
    syncRegistryHydrationFlags();
    await persistAndBroadcast(true);
  };

  const setSelectedSession = async (tabId: number): Promise<SessionsPayload> => {
    const current = await buildPayload();
    if (!current.sessions.some((s) => s.tabId === tabId)) {
      debugWarn("select", "ignored", tabId, "not in visible sessions");
      return current;
    }
    debugLog("select", tabId, "was", selectedSessionId);
    selectedSessionId = tabId;
    touchInteraction(tabId);
    syncRegistryHydrationFlags();
    await persistAndBroadcast(true);

    await new Promise<void>((resolve) => {
      debouncedFullSelect(async () => {
        await hydrateWindow();
        await persistAndBroadcast(true);
        resolve();
      });
    });
    return buildPayload();
  };

  const discoverTabs = async () => {
    const tabs = await ext.tabs.query({});
    indexTabs(tabs);
    stripOrder = pruneRegistry(registry, stripOrder, tabs, selectedSessionId);

    await Promise.all(
      tabs.map(async (t) => {
        if (typeof t.id !== "number") return;
        const platform = detectPlatformFromUrl(t.url);
        if (platform !== "spotify" && platform !== "ytmusic" && platform !== "youtube") return;
        if (registry.has(t.id)) return;
        await probeAndRegisterTab(t.id, t.url, platform);
      }),
    );

    await revalidateRegistryTabs();
    stripOrder = pruneRegistry(registry, stripOrder, tabs, selectedSessionId);
    return tabs;
  };

  const fullResync = async (opts?: { restore?: boolean }) => {
    const gen = ++resyncGen;
    const now = Date.now();
    if (now - lastResyncAt < RESYNC_MIN_MS) return;
    lastResyncAt = now;

    if (opts?.restore && !storageRestored) {
      await restoreFromStorage();
      storageRestored = true;
    }
    if (gen !== resyncGen) return;

    const tabs = await discoverTabs();
    if (gen !== resyncGen) return;

    if (selectedSessionId !== null && !registry.has(selectedSessionId)) {
      const payload = buildSessionsPayload(
        registry,
        null,
        payloadVersion,
        tabs,
        stripOrder,
      );
      selectedSessionId = pickFallbackSelected(payload.sessions, selectedSessionId);
    }

    await hydrateWindow();
    if (gen !== resyncGen) return;

    await persistAndBroadcast();
  };

  void fullResync({ restore: true });

  startHeartbeat(() => void fullResync());
  bindPopupPort(() => {
    void hydrateWindow().then(() => persistAndBroadcast(true));
  });

  ext.tabs.onUpdated.addListener((tabId, info, tab) => {
    const url = tab.url ?? info.url;
    const platform = detectPlatformFromUrl(url);
    if (platform === "spotify" || platform === "ytmusic" || platform === "youtube") {
      if (info.status === "complete" && url) {
        void ensureMainBridgeForTab(tabId, url);
      }
      if (registry.has(tabId)) {
        registerTab(tabId, url);
      } else if (info.status === "complete") {
        void probeAndRegisterTab(tabId, url, platform).then((ok) => {
          if (ok) void persistAndBroadcast();
        });
      }
    } else if (registry.has(tabId)) {
      registerTab(tabId, url);
    }

    const entry = registry.get(tabId);
    if (entry && info.audible && shouldWakeSession(entry, tab, prevPlaying.get(tabId) ?? false)) {
      scheduleWake(tabId);
      return;
    }
    if (entry) void persistAndBroadcast();
  });

  ext.tabs.onRemoved.addListener((tabId) => {
    clearMainRuntimeInjected(tabId);
    removeRegistryTab(tabId);
    if (selectedSessionId === tabId) {
      const payload = buildSessionsPayload(registry, null, payloadVersion, [], stripOrder);
      selectedSessionId = pickFallbackSelected(payload.sessions, tabId);
    }
    void persistAndBroadcast(true);
  });

  ext.tabs.onActivated.addListener((info) => {
    const entry = registry.get(info.tabId);
    if (entry && shouldWakeSession(entry, { active: true }, prevPlaying.get(info.tabId) ?? false)) {
      scheduleWake(info.tabId);
      return;
    }
    void persistAndBroadcast();
  });

  ext.runtime.onMessage.addListener((rawMsg, sender) => {
    const msg = rawMsg as Partial<EventMessage> | undefined;
    if (!msg || msg.type !== "TRACK_UPDATED") return false;
    const event = msg as Extract<EventMessage, { type: "TRACK_UPDATED" }>;
    const tabId = sender.tab?.id ?? event.tabId;
    if (typeof tabId !== "number") return false;

    const platform =
      event.track?.platform ??
      detectPlatformFromUrl(sender.tab?.url) ??
      (event.track ? "generic" : null);
    if (!platform) return false;

    if (platform === "generic") {
      removeRegistryTab(tabId);
      void persistAndBroadcast(true);
      return false;
    }

    if (platform === "youtube" && !event.track) {
      removeRegistryTab(tabId);
      if (selectedSessionId === tabId) {
        const payload = buildSessionsPayload(registry, null, payloadVersion, [], stripOrder);
        selectedSessionId = pickFallbackSelected(payload.sessions, tabId);
      }
      void persistAndBroadcast(true);
      return false;
    }

    registerTab(tabId, sender.tab?.url, platform, event.track, { controllable: true });
    const existing = registry.get(tabId);
    if (!existing) return false;

    const wasPlaying = prevPlaying.get(tabId) ?? false;
    const isPlaying = event.track?.isPlaying ?? false;
    prevPlaying.set(tabId, isPlaying);

    registry.set(tabId, {
      ...existing,
      track: event.track,
      updatedAt: Date.now(),
    });

    if (shouldWakeSession(registry.get(tabId)!, sender.tab, wasPlaying)) {
      scheduleWake(tabId);
      return false;
    }

    void persistAndBroadcast();
    return false;
  });

  type Forwardable = Exclude<
    CommandMessage,
    | { type: "GET_SESSIONS" }
    | { type: "GET_SNAPSHOT" }
    | { type: "SET_ACTIVE_SESSION" }
    | { type: "NEXT_SESSION" }
    | { type: "PREVIOUS_SESSION" }
    | { type: "HYDRATE_SESSION" }
    | { type: "OPEN_PLAYER" }
    | { type: "PING" }
    | { type: "GET_CAPABILITIES" }
    | { type: "SET_SYNC_PRIORITY" }
  >;

  type VolumeCoalesceEntry = {
    volume: number;
    timer: ReturnType<typeof setTimeout>;
  };

  const volumeCoalesceByTab = new Map<number, VolumeCoalesceEntry>();
  const VOLUME_TAB_OPTS = { retries: 0, timeoutMs: 2500, delayMs: 0 };

  const scheduleVolumeForward = (volume: number): void => {
    void (async () => {
      let payload = await buildPayload();
      if (
        selectedSessionId === null ||
        !payload.sessions.some((s) => s.tabId === selectedSessionId)
      ) {
        await discoverTabs();
        payload = await buildPayload();
        selectedSessionId = payload.sessions[0]?.tabId ?? null;
      }
      const tabId = selectedSessionId;
      if (tabId === null) return;

      let entry = volumeCoalesceByTab.get(tabId);
      if (entry) {
        clearTimeout(entry.timer);
        entry.volume = volume;
      } else {
        entry = { volume, timer: null as unknown as ReturnType<typeof setTimeout> };
        volumeCoalesceByTab.set(tabId, entry);
      }

      entry.timer = setTimeout(() => {
        volumeCoalesceByTab.delete(tabId);
        const v = entry!.volume;
        touchInteraction(tabId);
        debugLog("forward", "SET_VOLUME", "tab", tabId);
        void sendToTab(tabId, { type: "SET_VOLUME", volume: v }, VOLUME_TAB_OPTS).catch((err) => {
          debugWarn("forward", "SET_VOLUME", "failed tab", tabId, err);
        });
      }, BROWSER_FLAGS.volumeCoalesceMs);
    })();
  };

  const resolveTabPlatform = (tabId: number): Platform | null => {
    const entry = registry.get(tabId);
    if (entry?.platform && entry.platform !== "generic") return entry.platform;
    if (entry?.track?.platform && entry.track.platform !== "generic") return entry.track.platform;
    const tab = tabById.get(tabId);
    return detectPlatformFromUrl(tab?.url);
  };

  const forward = async <M extends Forwardable>(msg: M): Promise<ResultOf<M["type"]>> => {
    let payload = await buildPayload();
    if (
      selectedSessionId === null ||
      !payload.sessions.some((s) => s.tabId === selectedSessionId)
    ) {
      await discoverTabs();
      payload = await buildPayload();
      selectedSessionId = payload.sessions[0]?.tabId ?? null;
    }
    if (selectedSessionId === null) throw new Error("No supported music tab is open");

    const tabId = selectedSessionId;
    const platform = resolveTabPlatform(tabId);

    debugLog("forward", msg.type, "tab", tabId, platform);
    touchInteraction(tabId);
    try {
      const result = await sendToTab(tabId, msg);
      void pullTrackFromTab(tabId).then(() => persistAndBroadcast(true));
      return result;
    } catch (err) {
      debugWarn("forward", msg.type, "failed tab", tabId, err);
      throw err;
    }
  };

  const runCommand = (command: string) => {
    if (command === "next-track") {
      void forward({ type: "NEXT" }).catch(() => undefined);
      return;
    }
    if (command === "previous-track") {
      void forward({ type: "PREVIOUS" }).catch(() => undefined);
      return;
    }
    const map: Record<string, Forwardable> = {
      "toggle-play": { type: "TOGGLE_PLAY" },
      "toggle-like": { type: "TOGGLE_LIKE" },
    };
    const msg = map[command];
    if (msg) void forward(msg).catch(() => undefined);
  };

  if (ext.commands?.onCommand) ext.commands.onCommand.addListener(runCommand);

  onMessage("GET_SESSIONS", async () => {
    await discoverTabs();
    await hydrateWindow();
    if (selectedSessionId !== null) {
      await pullTrackFromTab(selectedSessionId, "full");
    }
    syncRegistryHydrationFlags();
    return buildPayload(true);
  });

  onMessage("GET_SNAPSHOT", async () => {
    const payload = await buildPayload(true);
    return sessionsToSnapshot(payload);
  });

  onMessage("HYDRATE_SESSION", async (m) => {
    await hydrateSession(m.tabId);
    return buildPayload();
  });

  onMessage("SET_ACTIVE_SESSION", async (m) => setSelectedSession(m.tabId));

  onMessage("NEXT_SESSION", async () => {
    const payload = await buildPayload();
    const nextId = adjacentSessionId(
      payload.sessions,
      selectedSessionId,
      1,
      payload.navigationOrder ?? stripOrder,
    );
    if (nextId !== null) return setSelectedSession(nextId);
    return payload;
  });

  onMessage("PREVIOUS_SESSION", async () => {
    const payload = await buildPayload();
    const prevId = adjacentSessionId(
      payload.sessions,
      selectedSessionId,
      -1,
      payload.navigationOrder ?? stripOrder,
    );
    if (prevId !== null) return setSelectedSession(prevId);
    return payload;
  });

  onMessage("GET_CAPABILITIES", async () => (await buildPayload()).capabilities);
  onMessage("PING", () => "pong" as const);
  onMessage("INSTALL_MAIN_RUNTIME", async (m, sender) => {
    const tabId = sender.tab?.id;
    if (typeof tabId !== "number") return;
    await installMainRuntimeInTab(tabId, m.platform);
  });
  onMessage("GET_DEV_TELEMETRY", () => runtimeTelemetry.snapshot());
  onMessage("GET_BUILD_STATUS", () => getBuildFreshness());
  onMessage("GET_TRACK_INFO", () => forward({ type: "GET_TRACK_INFO" }));
  onMessage("PLAY", () => forward({ type: "PLAY" }));
  onMessage("PAUSE", () => forward({ type: "PAUSE" }));
  onMessage("TOGGLE_PLAY", () => forward({ type: "TOGGLE_PLAY" }));
  onMessage("NEXT", () => forward({ type: "NEXT" }));
  onMessage("PREVIOUS", () => forward({ type: "PREVIOUS" }));
  onMessage("SET_VOLUME", (m) => {
    scheduleVolumeForward(m.volume);
    return undefined;
  });
  onMessage("SEEK", (m) => forward({ type: "SEEK", position: m.position }));
  onMessage("TOGGLE_LIKE", () => forward({ type: "TOGGLE_LIKE" }));

  onMessage("OPEN_PLAYER", async () => {
    const payload = await buildPayload();
    const tabId = payload.selectedSessionId;
    if (tabId !== null) {
      try {
        const tab = await ext.tabs.get(tabId);
        await ext.tabs.update(tabId, { active: true });
        if (BROWSER_FLAGS.isChrome && typeof tab.windowId === "number") {
          try {
            await ext.windows.update(tab.windowId, { focused: true });
          } catch {
            /* window focus optional */
          }
        }
        touchInteraction(tabId);
        debugLog("open", "tab", tabId, tab.url?.slice(0, 60));
        return;
      } catch (err) {
        debugWarn("open", "tab failed", tabId, err);
      }
    }
    const selected = payload.sessions.find((s) => s.tabId === tabId);
    const fallback: Platform =
      selected?.platform && selected.platform !== "generic"
        ? selected.platform
        : "spotify";
    if (selected?.platform === "generic" && tabId !== null) {
      try {
        await ext.tabs.update(tabId, { active: true });
        return;
      } catch {
        /* fall through */
      }
    }
    await ext.tabs.create({ url: PLATFORMS[fallback].playerUrl, active: true });
  });

  ext.runtime.onStartup?.addListener(() => {
    storageRestored = false;
    void fullResync({ restore: true });
  });
  ext.runtime.onInstalled?.addListener(() => {
    storageRestored = false;
    void fullResync({ restore: true });
  });
});
