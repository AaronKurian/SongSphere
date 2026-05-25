import type { AdapterCapabilities } from "./adapter";
import type { SessionsDeltaPayload } from "./session";
import type { SessionsPayload } from "./session";
import type { Platform, PlayerSnapshot, TrackInfo } from "./player";
import type { BuildFreshness } from "~/shared/build";
import type { TelemetrySnapshot } from "./telemetry";

export type CommandMessage =
  | { type: "GET_SESSIONS" }
  | { type: "GET_SNAPSHOT" }
  | { type: "SET_ACTIVE_SESSION"; tabId: number }
  | { type: "NEXT_SESSION" }
  | { type: "PREVIOUS_SESSION" }
  | { type: "GET_CAPABILITIES" }
  | { type: "GET_TRACK_INFO" }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "NEXT" }
  | { type: "PREVIOUS" }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "SEEK"; position: number }
  | { type: "TOGGLE_LIKE" }
  | { type: "OPEN_PLAYER" }
  | { type: "SET_SYNC_PRIORITY"; tier: "full" | "lite" | "dormant" }
  | { type: "HYDRATE_SESSION"; tabId: number }
  | { type: "PING" }
  | { type: "GET_DEV_TELEMETRY" }
  | { type: "GET_BUILD_STATUS" }
  | { type: "INSTALL_MAIN_RUNTIME"; platform: Platform };

export type EventMessage =
  | { type: "TRACK_UPDATED"; track: TrackInfo | null; tabId?: number }
  | { type: "SESSIONS_UPDATED"; payload: SessionsPayload }
  | { type: "SESSIONS_DELTA"; delta: SessionsDeltaPayload };

export type AnyMessage = CommandMessage | EventMessage;
export type MessageType = AnyMessage["type"];

export type MessageResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface SnapshotPayload extends PlayerSnapshot {
  capabilities: AdapterCapabilities;
}

export interface MessageResultMap {
  GET_SESSIONS: SessionsPayload;
  GET_SNAPSHOT: SnapshotPayload;
  SET_ACTIVE_SESSION: SessionsPayload;
  NEXT_SESSION: SessionsPayload;
  PREVIOUS_SESSION: SessionsPayload;
  GET_CAPABILITIES: AdapterCapabilities;
  GET_TRACK_INFO: TrackInfo | null;
  PLAY: void;
  PAUSE: void;
  TOGGLE_PLAY: void;
  NEXT: void;
  PREVIOUS: void;
  SET_VOLUME: void;
  SEEK: void;
  TOGGLE_LIKE: void;
  OPEN_PLAYER: void;
  SET_SYNC_PRIORITY: void;
  HYDRATE_SESSION: SessionsPayload;
  PING: "pong";
  GET_DEV_TELEMETRY: TelemetrySnapshot;
  GET_BUILD_STATUS: BuildFreshness;
  INSTALL_MAIN_RUNTIME: void;
  TRACK_UPDATED: void;
  SESSIONS_UPDATED: void;
  SESSIONS_DELTA: void;
}

export type ResultOf<T extends MessageType> = MessageResultMap[T];
