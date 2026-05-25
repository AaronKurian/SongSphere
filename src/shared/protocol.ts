import type { Platform } from "~/shared/types/player";

/** MAIN-world bridge commands - privileged playback mutations and reads (not isolated DOM). */

export const BRIDGE_VERSION = "songsphere-bridge-v1" as const;

export const BRIDGE_REQUEST_EVENT = "songsphere:bridge:request" as const;
export const BRIDGE_RESPONSE_EVENT = "songsphere:bridge:response" as const;

export type MainWorldCommand =
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "PLAY_PAUSE" }
  | { type: "NEXT" }
  | { type: "PREVIOUS" }
  | { type: "SEEK"; position: number }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "LIKE" }
  | { type: "DISLIKE" }
  | { type: "SHUFFLE" }
  | { type: "REPEAT" }
  | { type: "READ_YOUTUBE_DETAILS" };

export interface BridgeRequestEnvelope {
  version: typeof BRIDGE_VERSION;
  id: string;
  platform: Platform;
  command: MainWorldCommand;
}

export interface BridgeResponseEnvelope {
  version: typeof BRIDGE_VERSION;
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface BridgeSendOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export const DEFAULT_BRIDGE_TIMEOUT_MS = 3000;
export const DEFAULT_BRIDGE_RETRIES = 0;
export const DEFAULT_BRIDGE_RETRY_DELAY_MS = 150;
