import type { AdapterCapabilities } from "./adapter";
import type { ConnectionState, Platform, TrackInfo } from "./player";

/** Session registry payloads and incremental delta patches for popup sync. */

export type SessionHydration = "minimal" | "partial" | "enhanced" | "full";

export interface TrackSnapshot {
  track: TrackInfo | null;
  updatedAt: number;
}

export interface PlayerSession {
  tabId: number;
  platform: Platform;
  snapshot: TrackSnapshot;
  hydration: SessionHydration;
  audible: boolean;
  focused: boolean;
  playing: boolean;
  lastInteraction: number;
  favicon?: string;
  title?: string;
}

export interface SessionsPayload {
  sessions: PlayerSession[];
  stripOrder: number[];
  navigationOrder?: number[];
  selectedSessionId: number | null;
  version: number;
  connection: ConnectionState;
  capabilities: AdapterCapabilities;
}

export interface TrackPatch {
  platform?: Platform;
  title?: string;
  artist?: string;
  artwork?: string;
  duration?: number;
  currentTime?: number;
  volume?: number;
  isPlaying?: boolean;
  liked?: boolean;
  cleared?: boolean;
}

export interface SessionPatch {
  tabId: number;
  platform?: Platform;
  hydration?: SessionHydration;
  playing?: boolean;
  audible?: boolean;
  focused?: boolean;
  title?: string;
  favicon?: string;
  lastInteraction?: number;
  snapshotUpdatedAt?: number;
  track?: TrackPatch;
}

export type SessionDelta =
  | { kind: "added"; session: PlayerSession }
  | { kind: "removed"; tabId: number }
  | { kind: "patched"; patch: SessionPatch }
  | { kind: "updated"; session: PlayerSession };

export interface SessionsDeltaPayload {
  version: number;
  selectedSessionId: number | null;
  deltas: SessionDelta[];
  stripOrder?: number[];
  navigationOrder?: number[];
  connection?: ConnectionState;
  capabilities?: AdapterCapabilities;
  reset?: SessionsPayload;
}
