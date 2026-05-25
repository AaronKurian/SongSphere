import {
  BRIDGE_VERSION,
  type BridgeRequestEnvelope,
  type BridgeResponseEnvelope,
  type MainWorldCommand,
} from "~/shared/protocol";
import {
  dispatchBridgeResponse,
  dispatchBridgeReady,
  listenBridgeRequests,
  bridgeListenerCounts,
} from "~/shared/bridge-transport";
import {
  bridgeLog,
  markBridgeInitialized,
  recordBridgeError,
  recordBridgeRequest,
  setBridgeListenerCounts,
} from "~/shared/bridge-debug";
import { executeSpotifyBridgeCommand } from "~/main/spotify";
import { executeYtmusicBridgeCommand } from "~/main/ytmusic";
import { executeYoutubeBridgeCommand } from "~/main/youtube";
import { executeGenericBridgeCommand } from "~/main/generic";
import type { Platform } from "~/shared/types/player";

type HostState = {
  platform: Platform | null;
  stopRequests: (() => void) | null;
};

const hostState: HostState = { platform: null, stopRequests: null };

async function executeForPlatform(
  platform: Platform,
  command: MainWorldCommand,
): Promise<unknown> {
  switch (platform) {
    case "spotify":
      return executeSpotifyBridgeCommand(command);
    case "youtube":
      return executeYoutubeBridgeCommand(command);
    case "ytmusic":
      return executeYtmusicBridgeCommand(command);
    case "generic":
      return executeGenericBridgeCommand(command);
    default:
      return executeGenericBridgeCommand(command);
  }
}

export function installMutationHost(platform: Platform): void {
  if (hostState.platform === platform && hostState.stopRequests) {
    dispatchBridgeReady(platform);
    return;
  }

  hostState.stopRequests?.();
  hostState.platform = platform;
  hostState.stopRequests = listenBridgeRequests((envelope) => {
    void handleRequest(envelope, platform);
  });

  markBridgeInitialized(platform, "host");
  setBridgeListenerCounts(bridgeListenerCounts().request, bridgeListenerCounts().response);
  bridgeLog("host listening", platform);
  dispatchBridgeReady(platform);

  window.addEventListener(
    "pagehide",
    () => {
      hostState.stopRequests?.();
      hostState.stopRequests = null;
      hostState.platform = null;
      bridgeLog("host cleanup", platform);
    },
    { once: true },
  );
}

async function handleRequest(
  envelope: BridgeRequestEnvelope,
  hostPlatform: Platform,
): Promise<void> {
  if (envelope.version !== BRIDGE_VERSION) return;
  if (envelope.platform !== hostPlatform) {
    respond(envelope.id, false, undefined, `platform mismatch: ${envelope.platform}`);
    return;
  }

  bridgeLog("command receive", { id: envelope.id, type: envelope.command.type });
  recordBridgeRequest(envelope.id, envelope.command);

  try {
    bridgeLog("command execute", envelope.command.type);
    const result = await executeForPlatform(hostPlatform, envelope.command);
    bridgeLog("command ACK", { id: envelope.id, type: envelope.command.type });
    respond(envelope.id, true, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordBridgeError(`host ${envelope.command.type}: ${message}`);
    bridgeLog("command error", message);
    respond(envelope.id, false, undefined, message);
  }
}

function respond(id: string, ok: boolean, result?: unknown, error?: string): void {
  const envelope: BridgeResponseEnvelope = {
    version: BRIDGE_VERSION,
    id,
    ok,
    result,
    error,
  };
  dispatchBridgeResponse(envelope);
}
