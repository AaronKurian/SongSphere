import type { MainWorldCommand } from "~/shared/protocol";
import type { Platform } from "~/shared/types/player";

export interface BridgeDebugState {
  initialized: boolean;
  listenerCounts: { request: number; response: number };
  pendingRequests: number;
  activePlatform: Platform | null;
  requestHistory: Array<{ id: string; command: MainWorldCommand; at: number }>;
  lastErrors: string[];
}

const MAX_HISTORY = 40;
const MAX_ERRORS = 20;

function ensureDebugRoot(): BridgeDebugState {
  const w = window as unknown as { __songsphereBridgeDebug?: BridgeDebugState };
  if (!w.__songsphereBridgeDebug) {
    w.__songsphereBridgeDebug = {
      initialized: false,
      listenerCounts: { request: 0, response: 0 },
      pendingRequests: 0,
      activePlatform: null,
      requestHistory: [],
      lastErrors: [],
    };
  }
  return w.__songsphereBridgeDebug;
}

export function getBridgeDebug(): BridgeDebugState {
  return ensureDebugRoot();
}

export function markBridgeInitialized(platform: Platform | null, role: "client" | "host"): void {
  const dbg = ensureDebugRoot();
  dbg.initialized = true;
  if (platform) dbg.activePlatform = platform;
  console.info(`[SongSphere bridge] init ${role}`, platform ?? "(none)");
}

export function setBridgeListenerCounts(request: number, response: number): void {
  ensureDebugRoot().listenerCounts = { request, response };
}

export function setBridgePending(count: number): void {
  ensureDebugRoot().pendingRequests = count;
}

export function recordBridgeRequest(id: string, command: MainWorldCommand): void {
  const dbg = ensureDebugRoot();
  dbg.requestHistory.unshift({ id, command, at: Date.now() });
  if (dbg.requestHistory.length > MAX_HISTORY) dbg.requestHistory.length = MAX_HISTORY;
}

export function recordBridgeError(message: string): void {
  const dbg = ensureDebugRoot();
  dbg.lastErrors.unshift(message);
  if (dbg.lastErrors.length > MAX_ERRORS) dbg.lastErrors.length = MAX_ERRORS;
}

export function bridgeLog(phase: string, detail?: unknown): void {
  if (detail !== undefined) console.info(`[SongSphere bridge] ${phase}`, detail);
  else console.info(`[SongSphere bridge] ${phase}`);
}
