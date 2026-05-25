import {
  detectPlatformFromUrl,
  getCapabilities,
  isMusicSessionPlatform,
  PLATFORMS,
} from "~/shared/constants";
import { trackForHydration } from "~/background/hydration";
import type { SessionsPayload, PlayerSession, SessionHydration, SessionPatch, SessionsDeltaPayload, SessionDelta, TrackPatch } from "~/shared/types/session";
import type { ConnectionState, Platform, TrackInfo } from "~/shared/types/player";
import type { SnapshotPayload } from "~/shared/types/messages";
import { tracksEqual } from "~/shared/types/player";

/** Multi-session radii: hydration (full sync), preload (hydrate + artwork), render (popup pills). Sub-second progress-only track patches are ignored (PROGRESS_EPS_*). */
export const HYDRATION_RADIUS = 1;
export const PRELOAD_RADIUS = 2;
export const RENDER_RADIUS = 4;

export function computeWindow(
  centerIndex: number,
  total: number,
  radius: number,
): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  const center = centerIndex >= 0 ? centerIndex : 0;
  const start = Math.max(0, center - radius);
  const end = Math.min(total, center + radius + 1);
  return { start, end };
}

export function tabIdsAroundIndex(
  orderedTabIds: number[],
  centerIndex: number,
  radius: number,
): Set<number> {
  const { start, end } = computeWindow(centerIndex, orderedTabIds.length, radius);
  return new Set(orderedTabIds.slice(start, end));
}

export function tabIdsAroundSelected(
  orderedTabIds: number[],
  selectedId: number | null,
  radius: number,
): Set<number> {
  const idx = selectedId === null ? 0 : orderedTabIds.indexOf(selectedId);
  return tabIdsAroundIndex(orderedTabIds, idx, radius);
}

export function isWithinRadius(
  orderedTabIds: number[],
  selectedId: number | null,
  tabId: number,
  radius: number,
): boolean {
  return tabIdsAroundSelected(orderedTabIds, selectedId, radius).has(tabId);
}

export function buildNavigationOrder(
  sessions: PlayerSession[],
  prevOrder: number[],
): number[] {
  const ids = new Set(sessions.map((s) => s.tabId));
  let order = prevOrder.filter((id) => ids.has(id));
  const known = new Set(order);
  const newcomers = sessions
    .map((s) => s.tabId)
    .filter((id) => !known.has(id))
    .sort((a, b) => a - b);
  return [...order, ...newcomers];
}

export function sessionsInNavigationOrder(
  sessions: PlayerSession[],
  navigationOrder: number[],
): PlayerSession[] {
  const byId = new Map(sessions.map((s) => [s.tabId, s]));
  return navigationOrder
    .map((id) => byId.get(id))
    .filter((s): s is PlayerSession => s !== undefined);
}

export function applyStripOrder(
  sessions: PlayerSession[],
  prevOrder: number[],
  selectedId: number | null,
): { ordered: PlayerSession[]; order: number[]; navigationOrder: number[] } {
  const byId = new Map(sessions.map((s) => [s.tabId, s]));
  const navigationOrder = buildNavigationOrder(sessions, prevOrder);

  let order = navigationOrder;
  if (selectedId !== null && order.includes(selectedId)) {
    order = [selectedId, ...order.filter((id) => id !== selectedId)];
  }

  const ordered = order
    .map((id) => byId.get(id))
    .filter((s): s is PlayerSession => s !== undefined);

  return { ordered, order, navigationOrder };
}

const MAX_PILL_LEN = 14;

export function truncateTitle(title: string, max = MAX_PILL_LEN): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function sessionPillLabel(session: PlayerSession): string {
  const title =
    session.title?.trim() ||
    session.snapshot.track?.title?.trim() ||
    "";
  if (title) {
    const mark = session.playing ? "▶ " : "⏸ ";
    return `${mark}${truncateTitle(title)}`;
  }
  return PLATFORMS[session.platform].shortLabel;
}

export function sessionPillTitle(session: PlayerSession): string {
  const parts = [
    session.snapshot.track?.title || session.title,
    session.snapshot.track?.artist,
    PLATFORMS[session.platform].label,
    session.playing ? "Playing" : "Paused",
  ].filter(Boolean);
  return parts.join(" · ");
}


export interface RegistryTabInfo {
  id?: number;
  url?: string;
  audible?: boolean;
  active?: boolean;
  discarded?: boolean;
  favIconUrl?: string;
  title?: string;
}

export interface RegistryEntry {
  tabId: number;
  platform: Platform;
  track: TrackInfo | null;
  hydration: SessionHydration;
  updatedAt: number;
  lastInteraction: number;
  controllable?: boolean;
}

export interface RegistryVisibilityContext {
  selectedSessionId?: number | null;
}

export function isVisibleRegistryEntry(
  entry: RegistryEntry,
  tab?: RegistryTabInfo,
  ctx?: RegistryVisibilityContext,
): boolean {
  if (!isMusicSessionPlatform(entry.platform)) return false;
  if (entry.platform === "youtube") return entry.track !== null;
  if (!tab) return false;
  if (tab.discarded === true) return false;

  if (ctx?.selectedSessionId === entry.tabId) return true;

  if (!entry.controllable) return false;

  const playing = entry.track?.isPlaying ?? false;
  if (playing || tab.audible === true) return true;

  if (entry.track?.title || entry.track?.artist) return true;

  return false;
}

export function pruneRegistry(
  entries: Map<number, RegistryEntry>,
  stripOrder: number[],
  tabs: RegistryTabInfo[],
  selectedSessionId?: number | null,
): number[] {
  const ctx: RegistryVisibilityContext = { selectedSessionId };
  const liveById = new Map(
    tabs.filter((t) => typeof t.id === "number").map((t) => [t.id as number, t]),
  );
  let nextStrip = stripOrder.filter((id) => liveById.has(id));

  for (const tabId of [...entries.keys()]) {
    const tab = liveById.get(tabId);
    if (!tab) {
      entries.delete(tabId);
      nextStrip = nextStrip.filter((id) => id !== tabId);
      continue;
    }
    const entry = entries.get(tabId);
    if (!entry) continue;

    if (!isMusicSessionPlatform(entry.platform)) {
      entries.delete(tabId);
      nextStrip = nextStrip.filter((id) => id !== tabId);
      continue;
    }

    const urlPlatform = detectPlatformFromUrl(tab.url);
    if (entry.platform !== "generic" && urlPlatform !== entry.platform) {
      entries.delete(tabId);
      nextStrip = nextStrip.filter((id) => id !== tabId);
      continue;
    }
    if (!isVisibleRegistryEntry(entry, tab, ctx)) {
      entries.delete(tabId);
      nextStrip = nextStrip.filter((id) => id !== tabId);
    }
  }

  return nextStrip;
}

export function sortSessions(
  sessions: PlayerSession[],
  selectedId: number | null,
): PlayerSession[] {
  return [...sessions].sort((a, b) => {
    const aSel = a.tabId === selectedId;
    const bSel = b.tabId === selectedId;
    if (aSel !== bSel) return aSel ? -1 : 1;
    if (a.playing !== b.playing) return a.playing ? -1 : 1;
    if (b.lastInteraction !== a.lastInteraction) return b.lastInteraction - a.lastInteraction;
    return a.tabId - b.tabId;
  });
}

export function adjacentSessionId(
  sessions: PlayerSession[],
  selectedId: number | null,
  direction: 1 | -1,
  navigationOrder?: number[],
): number | null {
  const ordered = navigationOrder?.length
    ? sessionsInNavigationOrder(sessions, navigationOrder)
    : [...sessions].sort((a, b) => a.tabId - b.tabId);
  if (!ordered.length) return null;
  const idx = ordered.findIndex((s) => s.tabId === selectedId);
  const current = idx >= 0 ? idx : 0;
  const next = (current + direction + ordered.length) % ordered.length;
  return ordered[next]?.tabId ?? null;
}

export function pickFallbackSelected(
  sessions: PlayerSession[],
  removedTabId: number,
): number | null {
  const remaining = sessions.filter((s) => s.tabId !== removedTabId);
  return remaining[0]?.tabId ?? null;
}

export function sessionIndex(
  sessions: PlayerSession[],
  selectedId: number | null,
  navigationOrder?: number[],
): { index: number; total: number } {
  const ordered = navigationOrder?.length
    ? sessionsInNavigationOrder(sessions, navigationOrder)
    : [...sessions].sort((a, b) => a.tabId - b.tabId);
  const idx = ordered.findIndex((s) => s.tabId === selectedId);
  return { index: idx >= 0 ? idx + 1 : 0, total: ordered.length };
}

export function toPlayerSession(
  entry: RegistryEntry,
  tab?: { audible?: boolean; active?: boolean; favIconUrl?: string; title?: string },
  hydration: SessionHydration = entry.hydration,
): PlayerSession {
  const label = PLATFORMS[entry.platform].label;
  const track = trackForHydration(entry.track, hydration);
  return {
    tabId: entry.tabId,
    platform: entry.platform,
    hydration,
    snapshot: { track, updatedAt: entry.updatedAt },
    audible: tab?.audible ?? false,
    focused: tab?.active ?? false,
    playing: entry.track?.isPlaying ?? false,
    lastInteraction: entry.lastInteraction,
    favicon: tab?.favIconUrl,
    title: entry.track?.title || tab?.title || label,
  };
}

export function resolveConnection(
  sessions: PlayerSession[],
  selectedId: number | null,
): ConnectionState {
  if (!sessions.length) return "idle";
  if (selectedId === null) return "unsupported";
  const selected = sessions.find((s) => s.tabId === selectedId);
  if (!selected) return "disconnected";
  if (selected.snapshot.track?.title || selected.snapshot.track?.artist) return "connected";
  return "reconnecting";
}

export function buildSessionsPayload(
  entries: Map<number, RegistryEntry>,
  selectedSessionId: number | null,
  version: number,
  tabs: RegistryTabInfo[],
  prevStripOrder: number[],
): SessionsPayload {
  const tabById = new Map(
    tabs.filter((t) => typeof t.id === "number").map((t) => [t.id as number, t]),
  );
  const ctx: RegistryVisibilityContext = { selectedSessionId };
  const raw = [...entries.values()]
    .filter((e) => isVisibleRegistryEntry(e, tabById.get(e.tabId), ctx))
    .map((e) => {
      const hydration = e.hydration;
      return toPlayerSession(e, tabById.get(e.tabId), hydration);
    });

  const { ordered: sessions, order: stripOrder, navigationOrder } = applyStripOrder(
    raw,
    prevStripOrder,
    selectedSessionId,
  );
  const selected = sessions.find((s) => s.tabId === selectedSessionId);
  return {
    sessions,
    stripOrder,
    navigationOrder,
    selectedSessionId,
    version,
    connection: resolveConnection(sessions, selectedSessionId),
    capabilities: getCapabilities(selected?.platform ?? null),
  };
}

export function getSelectedSession(payload: SessionsPayload): PlayerSession | null {
  if (payload.selectedSessionId === null) return null;
  return payload.sessions.find((s) => s.tabId === payload.selectedSessionId) ?? null;
}

export function sessionVisualEqual(a: PlayerSession, b: PlayerSession): boolean {
  return (
    a.tabId === b.tabId &&
    a.platform === b.platform &&
    a.hydration === b.hydration &&
    a.playing === b.playing &&
    a.audible === b.audible &&
    a.focused === b.focused &&
    a.title === b.title &&
    a.favicon === b.favicon &&
    a.lastInteraction === b.lastInteraction &&
    tracksEqual(a.snapshot.track, b.snapshot.track)
  );
}

export function mergePlayerSession(prev: PlayerSession, next: PlayerSession): PlayerSession {
  if (sessionVisualEqual(prev, next)) return prev;
  return next;
}

export function isNewerSessions(incoming: SessionsPayload, current: SessionsPayload): boolean {
  return incoming.version > current.version;
}

export function mergeSessions(prev: SessionsPayload, next: SessionsPayload): SessionsPayload {
  if (next.version < prev.version) return prev;

  const nextById = new Map(next.sessions.map((s) => [s.tabId, s]));
  const prevIds = prev.sessions.map((s) => s.tabId);
  const nextIdSet = new Set(next.sessions.map((s) => s.tabId));
  const sameTabSet =
    prevIds.length === next.sessions.length && prevIds.every((id) => nextIdSet.has(id));

  let sessions: PlayerSession[];
  if (sameTabSet && next.selectedSessionId === prev.selectedSessionId) {
    sessions = prev.sessions
      .map((s) => {
        const n = nextById.get(s.tabId);
        return n ? mergePlayerSession(s, n) : s;
      })
      .filter((s) => nextById.has(s.tabId));
    for (const s of next.sessions) {
      if (!prevIds.includes(s.tabId)) sessions.push(s);
    }
  } else {
    sessions = next.sessions;
  }

  const stripOrder =
    next.stripOrder ??
    (sameTabSet ? prev.stripOrder : undefined) ??
    sessions.map((s) => s.tabId);

  const navigationOrder =
    next.navigationOrder ??
    (sameTabSet ? prev.navigationOrder : undefined) ??
    stripOrder;

  const connection = next.connection === prev.connection ? prev.connection : next.connection;
  const capabilities = next.capabilities === prev.capabilities ? prev.capabilities : next.capabilities;

  if (
    sessions.every((s, i) => s === prev.sessions[i]) &&
    connection === prev.connection &&
    capabilities === prev.capabilities &&
    next.selectedSessionId === prev.selectedSessionId &&
    next.version === prev.version
  ) {
    return prev;
  }

  return {
    ...next,
    sessions,
    stripOrder,
    navigationOrder,
    connection,
    capabilities,
  };
}

export function sessionsToSnapshot(payload: SessionsPayload): SnapshotPayload {
  const selected = getSelectedSession(payload);
  return {
    track: selected?.snapshot.track ?? null,
    platform: selected?.platform ?? null,
    tabId: selected?.tabId ?? null,
    updatedAt: selected?.snapshot.updatedAt ?? Date.now(),
    version: payload.version,
    connection: payload.connection,
    capabilities: payload.capabilities,
  };
}

export function patchSessionTrack(
  prev: SessionsPayload,
  track: TrackInfo | null,
  tabId: number | undefined,
): SessionsPayload | null {
  if (typeof tabId !== "number") return null;
  const idx = prev.sessions.findIndex((s) => s.tabId === tabId);
  if (idx < 0) return null;

  const prevSession = prev.sessions[idx]!;
  const nextSession: PlayerSession = {
    ...prevSession,
    playing: track?.isPlaying ?? false,
    snapshot: { track, updatedAt: Date.now() },
  };
  if (sessionVisualEqual(prevSession, nextSession)) return null;

  const sessions = [...prev.sessions];
  sessions[idx] = nextSession;

  const next: SessionsPayload = {
    ...prev,
    version: prev.version + 1,
    sessions,
    connection: track ? "connected" : prev.connection,
  };

  const selected = getSelectedSession(next);
  if (selected?.tabId !== tabId) return mergeSessions(prev, next);
  return mergeSessions(prev, next);
}


const PATCH_FIELD_CAP = 12;
const PROGRESS_EPS_S = 0.5;
const PROGRESS_EPS_MS = 500;

const RESET_DELTA_RATIO = 0.5;
const RESET_DELTA_MIN = 6;

function progressEpsilon(platform: TrackInfo["platform"] | undefined): number {
  return platform === "spotify" ? PROGRESS_EPS_MS : PROGRESS_EPS_S;
}

function isProgressOnlyNoise(
  prev: TrackInfo,
  next: TrackInfo,
  patch: TrackPatch,
): boolean {
  const keys = Object.keys(patch).filter((k) => k !== "platform");
  if (keys.length !== 1 || keys[0] !== "currentTime") return false;
  const eps = progressEpsilon(next.platform);
  const a = prev.currentTime ?? 0;
  const b = next.currentTime ?? 0;
  return Math.abs(b - a) < eps;
}

function diffTrack(prev: TrackInfo | null, next: TrackInfo | null): TrackPatch | undefined {
  if (prev === next) return undefined;
  if (!next) return prev ? { cleared: true } : undefined;
  if (!prev) {
    return {
      platform: next.platform,
      title: next.title,
      artist: next.artist,
      artwork: next.artwork,
      duration: next.duration,
      currentTime: next.currentTime,
      volume: next.volume,
      isPlaying: next.isPlaying,
      liked: next.liked,
    };
  }

  const patch: TrackPatch = {};
  let changed = false;

  if (prev.platform !== next.platform) {
    patch.platform = next.platform;
    changed = true;
  }
  if (prev.title !== next.title) {
    patch.title = next.title;
    changed = true;
  }
  if (prev.artist !== next.artist) {
    patch.artist = next.artist;
    changed = true;
  }
  if (prev.artwork !== next.artwork) {
    patch.artwork = next.artwork;
    changed = true;
  }
  if (prev.duration !== next.duration) {
    patch.duration = next.duration;
    changed = true;
  }
  if (prev.currentTime !== next.currentTime) {
    const eps = progressEpsilon(next.platform);
    if (Math.abs((next.currentTime ?? 0) - (prev.currentTime ?? 0)) >= eps) {
      patch.currentTime = next.currentTime;
      changed = true;
    }
  }
  if (prev.volume !== next.volume) {
    patch.volume = next.volume;
    changed = true;
  }
  if (prev.isPlaying !== next.isPlaying) {
    patch.isPlaying = next.isPlaying;
    changed = true;
  }
  if (prev.liked !== next.liked) {
    patch.liked = next.liked;
    changed = true;
  }

  return changed ? patch : undefined;
}

export function diffSessionPatch(prev: PlayerSession, next: PlayerSession): SessionPatch | null {
  const patch: SessionPatch = { tabId: next.tabId };
  let fieldCount = 0;




  if (fieldCount === 0) return null;
  if (fieldCount > PATCH_FIELD_CAP) return null;
  return patch;
}

function applyTrackPatch(prev: TrackInfo | null, patch: TrackPatch): TrackInfo | null {
  if (patch.cleared) return null;
  if (!prev) {
    return {
      platform: patch.platform ?? "generic",
      title: patch.title ?? "",
      artist: patch.artist ?? "",
      artwork: patch.artwork,
      duration: patch.duration,
      currentTime: patch.currentTime,
      volume: patch.volume,
      isPlaying: patch.isPlaying ?? false,
      liked: patch.liked,
    };
  }
  return {
    ...prev,
    ...(patch.platform !== undefined ? { platform: patch.platform } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.artist !== undefined ? { artist: patch.artist } : {}),
    ...(patch.artwork !== undefined ? { artwork: patch.artwork } : {}),
    ...(patch.duration !== undefined ? { duration: patch.duration } : {}),
    ...(patch.currentTime !== undefined ? { currentTime: patch.currentTime } : {}),
    ...(patch.volume !== undefined ? { volume: patch.volume } : {}),
    ...(patch.isPlaying !== undefined ? { isPlaying: patch.isPlaying } : {}),
    ...(patch.liked !== undefined ? { liked: patch.liked } : {}),
  };
}

export function applySessionPatch(prev: PlayerSession, patch: SessionPatch): PlayerSession {
  const track = patch.track
    ? applyTrackPatch(prev.snapshot.track, patch.track)
    : prev.snapshot.track;

  return {
    tabId: patch.tabId,
    platform: patch.platform ?? prev.platform,
    hydration: patch.hydration ?? prev.hydration,
    playing: patch.playing ?? prev.playing,
    audible: patch.audible ?? prev.audible,
    focused: patch.focused ?? prev.focused,
    title: patch.title ?? prev.title,
    favicon: patch.favicon ?? prev.favicon,
    lastInteraction: patch.lastInteraction ?? prev.lastInteraction,
    snapshot: {
      track,
      updatedAt: patch.snapshotUpdatedAt ?? prev.snapshot.updatedAt,
    },
  };
}

function reorderSessions(sessions: PlayerSession[], stripOrder: number[]): PlayerSession[] {
  const byId = new Map(sessions.map((s) => [s.tabId, s]));
  const ordered = stripOrder
    .map((id) => byId.get(id))
    .filter((s): s is PlayerSession => s !== undefined);
  for (const s of sessions) {
    if (!stripOrder.includes(s.tabId)) ordered.push(s);
  }
  return ordered;
}

function sessionDeltaForChange(prev: PlayerSession, next: PlayerSession): SessionDelta {
  const patch = diffSessionPatch(prev, next);
  if (patch) return { kind: "patched", patch };
  return { kind: "updated", session: next };
}

export function computeSessionsDelta(
  prev: SessionsPayload | null,
  next: SessionsPayload,
): SessionsDeltaPayload {
  if (!prev) {
    return {
      version: next.version,
      selectedSessionId: next.selectedSessionId,
      deltas: [],
      reset: next,
    };
  }

  if (next.version < prev.version) {
    return {
      version: prev.version,
      selectedSessionId: prev.selectedSessionId,
      deltas: [],
    };
  }

  const prevById = new Map(prev.sessions.map((s) => [s.tabId, s]));
  const nextById = new Map(next.sessions.map((s) => [s.tabId, s]));
  const deltas: SessionDelta[] = [];

  for (const session of next.sessions) {
    const old = prevById.get(session.tabId);
    if (!old) deltas.push({ kind: "added", session });
    else if (!sessionVisualEqual(old, session)) {
      deltas.push(sessionDeltaForChange(old, session));
    }
  }

  for (const session of prev.sessions) {
    if (!nextById.has(session.tabId)) deltas.push({ kind: "removed", tabId: session.tabId });
  }

  const stripChanged =
    next.stripOrder.length !== prev.stripOrder.length ||
    next.stripOrder.some((id, i) => id !== prev.stripOrder[i]);

  const metaOnly =
    deltas.length === 0 &&
    (prev.selectedSessionId !== next.selectedSessionId ||
      prev.connection !== next.connection ||
      prev.capabilities !== next.capabilities ||
      stripChanged);

  if (
    deltas.length >= RESET_DELTA_MIN &&
    next.sessions.length > 0 &&
    deltas.length / next.sessions.length >= RESET_DELTA_RATIO
  ) {
    return {
      version: next.version,
      selectedSessionId: next.selectedSessionId,
      deltas: [],
      reset: next,
    };
  }

  if (deltas.length === 0 && !metaOnly) {
    return {
      version: next.version,
      selectedSessionId: next.selectedSessionId,
      deltas: [],
    };
  }

  const payload: SessionsDeltaPayload = {
    version: next.version,
    selectedSessionId: next.selectedSessionId,
    deltas,
  };

  if (stripChanged) {
    payload.stripOrder = next.stripOrder;
    payload.navigationOrder = next.navigationOrder;
  }
  if (prev.connection !== next.connection) payload.connection = next.connection;
  if (prev.capabilities !== next.capabilities) payload.capabilities = next.capabilities;

  return payload;
}

export function isEmptyDelta(
  delta: SessionsDeltaPayload,
  prev: SessionsPayload | null = null,
): boolean {
  if (delta.reset || delta.deltas.length > 0) return false;
  if (delta.stripOrder !== undefined) return false;
  if (delta.connection !== undefined) return false;
  if (delta.capabilities !== undefined) return false;
  if (prev && prev.selectedSessionId !== delta.selectedSessionId) return false;
  if (prev && prev.version !== delta.version) return false;
  return true;
}

export function applySessionsDelta(
  prev: SessionsPayload,
  delta: SessionsDeltaPayload,
): SessionsPayload {
  if (delta.reset) {
    return delta.reset.version >= prev.version ? delta.reset : prev;
  }

  if (delta.version < prev.version) return prev;
  if (isEmptyDelta(delta, prev)) return prev;

  let sessions = [...prev.sessions];

  for (const change of delta.deltas) {
    if (change.kind === "removed") {
      sessions = sessions.filter((s) => s.tabId !== change.tabId);
      continue;
    }
    if (change.kind === "added") {
      if (!sessions.some((s) => s.tabId === change.session.tabId)) {
        sessions.push(change.session);
      }
      continue;
    }
    if (change.kind === "patched") {
      const idx = sessions.findIndex((s) => s.tabId === change.patch.tabId);
      if (idx >= 0) {
        const merged = applySessionPatch(sessions[idx]!, change.patch);
        sessions[idx] = mergePlayerSession(sessions[idx]!, merged);
      }
      continue;
    }
    const idx = sessions.findIndex((s) => s.tabId === change.session.tabId);
    if (idx >= 0) {
      sessions[idx] = mergePlayerSession(sessions[idx]!, change.session);
    } else {
      sessions.push(change.session);
    }
  }

  if (delta.stripOrder?.length) {
    sessions = reorderSessions(sessions, delta.stripOrder);
  }

  return {
    version: delta.version,
    selectedSessionId: delta.selectedSessionId,
    sessions,
    stripOrder: delta.stripOrder ?? prev.stripOrder,
    navigationOrder: delta.navigationOrder ?? prev.navigationOrder,
    connection: delta.connection ?? prev.connection,
    capabilities: delta.capabilities ?? prev.capabilities,
  };
}
