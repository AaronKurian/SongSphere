import { create } from "zustand";
import { debugLog, debugWarn } from "~/shared/debug";
import { getCapabilities } from "~/shared/constants";
import { sendToRuntime } from "~/background/messaging";
import { PopupSession } from "~/background/popup-port";
import { getSelectedSession } from "~/background/session";
import { applySessionsDelta } from "~/background/session";
import {
  mergeSessions,
  patchSessionTrack,
  sessionsToSnapshot,
} from "~/background/session";
import { isWithinRadius, PRELOAD_RADIUS } from "~/background/session";
import { clearArtworkCache } from "~/popup/artwork";
import { runtimeTelemetry } from "~/shared/telemetry";
import { loadCachedSessions, saveCachedSessions } from "~/background/storage";
import { clamp } from "~/shared/utils";
import { BROWSER_FLAGS } from "~/shared/browser";
import type { AdapterCapabilities } from "~/shared/types/adapter";
import type { EventMessage } from "~/shared/types/messages";
import type { ConnectionState, Platform, TrackInfo } from "~/shared/types/player";
import type { SessionsPayload } from "~/shared/types/session";

interface PlayerStore {
  sessions: SessionsPayload;
  navDirection: -1 | 0 | 1;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  selectNextSession: () => Promise<void>;
  selectPreviousSession: () => Promise<void>;
  selectSession: (tabId: number) => Promise<void>;
  preloadSession: (tabId: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setVolume: (volume: number) => void;
  flushVolume: () => void;
  seek: (position: number) => void;
  toggleLike: () => Promise<void>;
  openPlayer: () => Promise<void>;
  dispose: () => void;
  track: () => TrackInfo | null;
  platform: () => Platform | null;
  connection: () => ConnectionState;
  capabilities: () => AdapterCapabilities;
}

const session = new PopupSession();

const applyEvent = (
  set: (partial: Partial<PlayerStore> | ((state: PlayerStore) => Partial<PlayerStore>)) => void,
  rawMsg: unknown,
) => {
  const msg = rawMsg as Partial<EventMessage> | undefined;
  if (!msg?.type) return;
  debugLog("popup", "event", msg.type);
  if (msg.type === "SESSIONS_UPDATED") {
    const event = msg as Extract<EventMessage, { type: "SESSIONS_UPDATED" }>;
    set((s) => {
      const merged = mergeSessions(s.sessions, event.payload);
      void saveCachedSessions(merged);
      return { sessions: merged };
    });
    return;
  }
  if (msg.type === "SESSIONS_DELTA") {
    const event = msg as Extract<EventMessage, { type: "SESSIONS_DELTA" }>;
    runtimeTelemetry.recordDeltaApply();
    set((s) => {
      const merged = mergeSessions(
        s.sessions,
        applySessionsDelta(s.sessions, event.delta),
      );
      void saveCachedSessions(merged);
      return { sessions: merged };
    });
    return;
  }
  if (msg.type === "TRACK_UPDATED") {
    set((s) => {
      const patched = patchSessionTrack(s.sessions, msg.track ?? null, msg.tabId);
      if (!patched) return s;
      return { sessions: patched };
    });
  }
};

const defaultSessions = (): SessionsPayload => ({
  sessions: [],
  stripOrder: [],
  selectedSessionId: null,
  version: 0,
  connection: "idle",
  capabilities: getCapabilities(null),
});

const VOLUME_SEND_OPTS = { retries: 0, timeoutMs: 2500, delayMs: 0 };

export const usePlayerStore = create<PlayerStore>((set, get) => {
  const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
  let volumeSendTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingVolumeSend: number | null = null;

  const flushVolumeSend = () => {
    if (volumeSendTimer) {
      clearTimeout(volumeSendTimer);
      volumeSendTimer = null;
    }
    const v = pendingVolumeSend;
    pendingVolumeSend = null;
    if (v == null || !get().capabilities().volume) return;
    void sendToRuntime({ type: "SET_VOLUME", volume: v }, VOLUME_SEND_OPTS, session.signal).catch(
      (e) => {
        if (!session.signal.aborted) set({ error: errMsg(e) });
      },
    );
  };

  const applySessions = (payload: SessionsPayload, opts?: { loading?: boolean }) => {
    set((s) => ({
      sessions: mergeSessions(s.sessions, payload),
      loading: opts?.loading ?? false,
      hydrated: true,
    }));
    void saveCachedSessions(get().sessions);
  };

  const selectedTrack = () => getSelectedSession(get().sessions)?.snapshot.track ?? null;

  const patchSelectedTrack = (patch: (t: TrackInfo) => TrackInfo) => {
    const payload = get().sessions;
    const selected = getSelectedSession(payload);
    if (!selected?.snapshot.track) return;
    const track = patch(selected.snapshot.track);
    const sessions = payload.sessions.map((s) =>
      s.tabId === selected.tabId
        ? { ...s, playing: track.isPlaying, snapshot: { track, updatedAt: Date.now() } }
        : s,
    );
    applySessions({ ...payload, version: payload.version + 1, sessions });
  };

  const run = async (
    action: () => Promise<unknown>,
    optimistic?: () => void,
    revert?: () => void,
    refreshAfter = true,
  ) => {
    const gen = session.beginRefresh();
    optimistic?.();
    try {
      await action();
      if (session.isStale(gen)) return;
      if (refreshAfter) await get().refresh();
      } catch (e) {
      if (session.signal.aborted) return;
      revert?.();
      debugWarn("popup", "command failed", errMsg(e));
      set({ error: errMsg(e) });
    }
  };

  return {
    sessions: defaultSessions(),
    navDirection: 0,
    hydrated: false,
    loading: false,
    error: null,

    async initialize() {
      const cached = await loadCachedSessions();
      if (cached) applySessions(cached, { loading: true });

      session.setMessageListener((rawMsg) => applyEvent(set, rawMsg));
      session.connectPort(() => {
        debugWarn("popup", "port dropped — refreshing sessions");
        void get().refresh();
      });

      set((s) => ({
        loading: !s.hydrated,
        error: null,
        sessions: { ...s.sessions, connection: "connecting" },
      }));

      const gen = session.beginRefresh();
      try {
        const payload = await sendToRuntime(
          { type: "GET_SESSIONS" },
          undefined,
          session.signal,
        );
        if (!session.isStale(gen)) applySessions(payload);
      } catch (e) {
        if (session.signal.aborted) return;
        set({
          loading: false,
          hydrated: true,
          error: errMsg(e),
          sessions: { ...get().sessions, connection: "disconnected" },
        });
      }
    },

    async refresh() {
      const gen = session.beginRefresh();
      set({ loading: true, error: null });
      try {
        const payload = await sendToRuntime(
          { type: "GET_SESSIONS" },
          undefined,
          session.signal,
        );
        if (!session.isStale(gen)) applySessions(payload);
      } catch (e) {
        if (session.signal.aborted) return;
        set({ error: errMsg(e), sessions: { ...get().sessions, connection: "disconnected" } });
      } finally {
        if (!session.isStale(gen)) set({ loading: false });
      }
    },

    async selectNextSession() {
      debugLog("popup", "header NEXT → switch session tab");
      set({ navDirection: 1, error: null });
      try {
        const payload = await sendToRuntime(
          { type: "NEXT_SESSION" },
          undefined,
          session.signal,
        );
        applySessions(payload);
      } catch (e) {
        if (!session.signal.aborted) set({ error: errMsg(e) });
      } finally {
        set({ navDirection: 0 });
      }
    },

    async selectPreviousSession() {
      debugLog("popup", "header PREVIOUS → switch session tab");
      set({ navDirection: -1, error: null });
      try {
        const payload = await sendToRuntime(
          { type: "PREVIOUS_SESSION" },
          undefined,
          session.signal,
        );
        applySessions(payload);
      } catch (e) {
        if (!session.signal.aborted) set({ error: errMsg(e) });
      } finally {
        set({ navDirection: 0 });
      }
    },

    async selectSession(tabId: number) {
      set({ error: null });
      debugLog("popup", "selectSession", tabId);
      try {
        const payload = await sendToRuntime(
          { type: "SET_ACTIVE_SESSION", tabId },
          undefined,
          session.signal,
        );
        applySessions(payload);
      } catch (e) {
        if (!session.signal.aborted) set({ error: errMsg(e) });
      }
    },

    async preloadSession(tabId: number) {
      const payload = get().sessions;
      if (tabId === payload.selectedSessionId) return;
      const order =
        payload.stripOrder.length > 0
          ? payload.stripOrder
          : payload.sessions.map((s) => s.tabId);
      if (!isWithinRadius(order, payload.selectedSessionId, tabId, PRELOAD_RADIUS)) return;
      try {
        const payload = await sendToRuntime(
          { type: "HYDRATE_SESSION", tabId },
          undefined,
          session.signal,
        );
        set((s) => ({ sessions: mergeSessions(s.sessions, payload) }));
      } catch {
        /* preload is best-effort */
      }
    },

    async togglePlay() {
      if (!get().capabilities().playPause) return;
      if (!selectedTrack()) return;
      debugLog("popup", "togglePlay", get().sessions.selectedSessionId);
      const flip = () =>
        patchSelectedTrack((t) => ({ ...t, isPlaying: !t.isPlaying }));
      await run(
        () => sendToRuntime({ type: "TOGGLE_PLAY" }, undefined, session.signal),
        flip,
        flip,
      );
    },

    next() {
      if (!get().capabilities().next) return Promise.resolve();
      debugLog("popup", "center NEXT → skip track (not session chevrons)");
      return run(() => sendToRuntime({ type: "NEXT" }, undefined, session.signal));
    },

    previous() {
      if (!get().capabilities().previous) return Promise.resolve();
      debugLog("popup", "center PREVIOUS → skip track (not session chevrons)");
      return run(() => sendToRuntime({ type: "PREVIOUS" }, undefined, session.signal));
    },

    setVolume(volume: number) {
      if (!get().capabilities().volume) return;
      const v = clamp(volume, 0, 1);
      patchSelectedTrack((t) => ({ ...t, volume: v }));
      pendingVolumeSend = v;
      if (volumeSendTimer) clearTimeout(volumeSendTimer);
      volumeSendTimer = setTimeout(flushVolumeSend, BROWSER_FLAGS.volumeCoalesceMs);
    },

    flushVolume: flushVolumeSend,

    seek(position: number) {
      if (!get().capabilities().seek) return;
      patchSelectedTrack((t) => ({ ...t, currentTime: position }));
      void sendToRuntime({ type: "SEEK", position }, undefined, session.signal).catch((e) => {
        if (!session.signal.aborted) set({ error: errMsg(e) });
      });
    },

    async toggleLike() {
      if (!get().capabilities().like) return;
      const flip = () =>
        patchSelectedTrack((t) => ({ ...t, liked: !t.liked }));
      await run(
        () => sendToRuntime({ type: "TOGGLE_LIKE" }, undefined, session.signal),
        flip,
        flip,
      );
    },

    openPlayer() {
      return run(
        () => sendToRuntime({ type: "OPEN_PLAYER" }, undefined, session.signal),
        undefined,
        undefined,
        false,
      );
    },

    dispose() {
      flushVolumeSend();
      session.dispose();
      clearArtworkCache();
    },

    track: () => selectedTrack(),
    platform: () => getSelectedSession(get().sessions)?.platform ?? null,
    connection: () => get().sessions.connection,
    capabilities: () => {
      const sessions = get().sessions;
      if (sessions.selectedSessionId != null) return sessions.capabilities;
      const platform = getSelectedSession(sessions)?.platform ?? null;
      return platform ? getCapabilities(platform) : sessions.capabilities;
    },
  };
});

export function useActiveSnapshot() {
  return sessionsToSnapshot(usePlayerStore((s) => s.sessions));
}
