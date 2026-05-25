import { browser } from "wxt/browser";
import { sendToRuntime } from "~/background/messaging";
import {
  BRIDGE_VERSION,
  DEFAULT_BRIDGE_RETRY_DELAY_MS,
  DEFAULT_BRIDGE_RETRIES,
  DEFAULT_BRIDGE_TIMEOUT_MS,
  type BridgeRequestEnvelope,
  type BridgeResponseEnvelope,
  type BridgeSendOptions,
  type MainWorldCommand,
} from "~/shared/protocol";
import {
  dispatchBridgeRequest,
  listenBridgeResponses,
  waitForBridgeReady,
} from "~/shared/bridge-transport";
import {
  bridgeLog,
  markBridgeInitialized,
  recordBridgeError,
  recordBridgeRequest,
  setBridgeListenerCounts,
  setBridgePending,
} from "~/shared/bridge-debug";
import { bridgeListenerCounts } from "~/shared/bridge-transport";
import type { Platform } from "~/shared/types/player";

export { getBridgeDebug } from "~/shared/bridge-debug";
export {
  BRIDGE_VERSION,
  BRIDGE_REQUEST_EVENT,
  BRIDGE_RESPONSE_EVENT,
  type MainWorldCommand,
} from "~/shared/protocol";

export const MAIN_RUNTIME_SCRIPT = "/songsphere-main-runtime.js";

const CLIENT_GUARD = "__songsphereBridgeClientInstalled" as const;
const MAIN_READY_TIMEOUT_MS = 8000;

interface PendingEntry {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

let clientPlatform: Platform | null = null;
let stopResponses: (() => void) | null = null;
const pending = new Map<string, PendingEntry>();
let requestSeq = 0;

function nextRequestId(): string {
  requestSeq += 1;
  return `ss-${Date.now()}-${requestSeq}`;
}

function updatePendingCount(): void {
  setBridgePending(pending.size);
}

function handleResponse(envelope: BridgeResponseEnvelope): void {
  const entry = pending.get(envelope.id);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(envelope.id);
  updatePendingCount();
  if (envelope.ok) {
    bridgeLog("command ACK", { id: envelope.id });
    entry.resolve(envelope.result);
  } else {
    const err = new Error(envelope.error ?? "bridge command failed");
    recordBridgeError(err.message);
    entry.reject(err);
  }
}

export function initBridgeClient(platform: Platform): void {
  const w = window as unknown as Record<string, boolean>;
  if (w[CLIENT_GUARD] && clientPlatform === platform) return;
  if (stopResponses) stopResponses();

  clientPlatform = platform;
  w[CLIENT_GUARD] = true;
  stopResponses = listenBridgeResponses(handleResponse);

  markBridgeInitialized(platform, "client");
  setBridgeListenerCounts(bridgeListenerCounts().request, bridgeListenerCounts().response);
  bridgeLog("client ready", platform);

  window.addEventListener(
    "pagehide",
    () => {
      for (const [id, entry] of pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error("bridge client unloaded"));
        pending.delete(id);
      }
      stopResponses?.();
      stopResponses = null;
      w[CLIENT_GUARD] = false;
      bridgeLog("client cleanup", platform);
    },
    { once: true },
  );
}

export async function sendBridgeCommand(
  platform: Platform,
  command: MainWorldCommand,
  options: BridgeSendOptions = {},
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_BRIDGE_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_BRIDGE_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_BRIDGE_RETRY_DELAY_MS;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await sendBridgeCommandOnce(platform, command, timeoutMs);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  throw lastError ?? new Error("bridge command failed");
}

function sendBridgeCommandOnce(
  platform: Platform,
  command: MainWorldCommand,
  timeoutMs: number,
): Promise<unknown> {
  const id = nextRequestId();
  const envelope: BridgeRequestEnvelope = {
    version: BRIDGE_VERSION,
    id,
    platform,
    command,
  };

  recordBridgeRequest(id, command);
  bridgeLog("command send", { id, type: command.type });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      updatePendingCount();
      const err = new Error(`bridge timeout (${timeoutMs}ms) for ${command.type}`);
      recordBridgeError(err.message);
      bridgeLog("timeout", { id, type: command.type });
      reject(err);
    }, timeoutMs);

    pending.set(id, { resolve, reject, timer });
    updatePendingCount();
    dispatchBridgeRequest(envelope);
  });
}

async function injectHostScriptTag(platform: Platform): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = browser.runtime.getURL(MAIN_RUNTIME_SCRIPT);
    script.dataset.platform = platform;
    script.async = false;
    script.onload = () => {
      script.remove();
      bridgeLog("host script tag loaded", platform);
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load ${MAIN_RUNTIME_SCRIPT} via script tag`));
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

async function ensureMainHost(platform: Platform): Promise<void> {
  try {
    await sendToRuntime(
      { type: "INSTALL_MAIN_RUNTIME", platform },
      { retries: 1, timeoutMs: 8000 },
    );
    bridgeLog("host install via background", platform);
  } catch (err) {
    bridgeLog("host background install failed, trying script tag", err);
    try {
      await injectHostScriptTag(platform);
    } catch (tagErr) {
      throw tagErr;
    }
  }
}

export async function startBridgeRuntime(platform: Platform): Promise<void> {
  try {
    await ensureMainHost(platform);
    await waitForBridgeReady(platform, MAIN_READY_TIMEOUT_MS);
  } catch (err) {
    bridgeLog(
      `bridge not ready for ${platform} - reload the Spotify tab after extension reload`,
      err,
    );
  }
  initBridgeClient(platform);
}
