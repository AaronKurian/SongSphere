import {
  BRIDGE_REQUEST_EVENT,
  BRIDGE_RESPONSE_EVENT,
  type BridgeRequestEnvelope,
  type BridgeResponseEnvelope,
} from "~/shared/protocol";
import type { Platform } from "~/shared/types/player";

export const BRIDGE_WM = "songsphere-bridge-v1" as const;

export type BridgeWindowMessage =
  | { channel: typeof BRIDGE_WM; kind: "request"; envelope: BridgeRequestEnvelope }
  | { channel: typeof BRIDGE_WM; kind: "response"; envelope: BridgeResponseEnvelope }
  | { channel: typeof BRIDGE_WM; kind: "ready"; platform: Platform };

export type BridgeRequestHandler = (envelope: BridgeRequestEnvelope) => void;
export type BridgeResponseHandler = (envelope: BridgeResponseEnvelope) => void;

function isBridgeMessage(data: unknown): data is BridgeWindowMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as BridgeWindowMessage).channel === BRIDGE_WM
  );
}

let requestListener: ((event: Event) => void) | null = null;
let responseListener: ((event: Event) => void) | null = null;
let requestMessageListener: ((event: MessageEvent) => void) | null = null;
let responseMessageListener: ((event: MessageEvent) => void) | null = null;

export function dispatchBridgeRequest(envelope: BridgeRequestEnvelope): void {
  document.dispatchEvent(
    new CustomEvent(BRIDGE_REQUEST_EVENT, { detail: envelope, bubbles: false }),
  );
  window.postMessage(
    { channel: BRIDGE_WM, kind: "request", envelope } satisfies BridgeWindowMessage,
    "*",
  );
}

export function dispatchBridgeResponse(envelope: BridgeResponseEnvelope): void {
  document.dispatchEvent(
    new CustomEvent(BRIDGE_RESPONSE_EVENT, { detail: envelope, bubbles: false }),
  );
  window.postMessage(
    { channel: BRIDGE_WM, kind: "response", envelope } satisfies BridgeWindowMessage,
    "*",
  );
}

export function dispatchBridgeReady(platform: Platform): void {
  window.postMessage(
    { channel: BRIDGE_WM, kind: "ready", platform } satisfies BridgeWindowMessage,
    "*",
  );
}

export function listenBridgeRequests(handler: BridgeRequestHandler): () => void {
  if (requestListener) document.removeEventListener(BRIDGE_REQUEST_EVENT, requestListener);
  if (requestMessageListener) window.removeEventListener("message", requestMessageListener);

  requestListener = (event: Event) => {
    const detail = (event as CustomEvent<BridgeRequestEnvelope>).detail;
    if (!detail?.id) return;
    handler(detail);
  };
  requestMessageListener = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!isBridgeMessage(data) || data.kind !== "request") return;
    handler(data.envelope);
  };

  document.addEventListener(BRIDGE_REQUEST_EVENT, requestListener);
  window.addEventListener("message", requestMessageListener);
  return () => {
    if (requestListener) {
      document.removeEventListener(BRIDGE_REQUEST_EVENT, requestListener);
      requestListener = null;
    }
    if (requestMessageListener) {
      window.removeEventListener("message", requestMessageListener);
      requestMessageListener = null;
    }
  };
}

export function listenBridgeResponses(handler: BridgeResponseHandler): () => void {
  if (responseListener) document.removeEventListener(BRIDGE_RESPONSE_EVENT, responseListener);
  if (responseMessageListener) window.removeEventListener("message", responseMessageListener);

  responseListener = (event: Event) => {
    const detail = (event as CustomEvent<BridgeResponseEnvelope>).detail;
    if (!detail?.id) return;
    handler(detail);
  };
  responseMessageListener = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!isBridgeMessage(data) || data.kind !== "response") return;
    handler(data.envelope);
  };

  document.addEventListener(BRIDGE_RESPONSE_EVENT, responseListener);
  window.addEventListener("message", responseMessageListener);
  return () => {
    if (responseListener) {
      document.removeEventListener(BRIDGE_RESPONSE_EVENT, responseListener);
      responseListener = null;
    }
    if (responseMessageListener) {
      window.removeEventListener("message", responseMessageListener);
      responseMessageListener = null;
    }
  };
}

export function bridgeListenerCounts(): { request: number; response: number } {
  return {
    request: requestListener || requestMessageListener ? 1 : 0,
    response: responseListener || responseMessageListener ? 1 : 0,
  };
}

export function waitForBridgeReady(platform: Platform, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`main bridge ready timeout (${timeoutMs}ms) for ${platform}`));
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!isBridgeMessage(data) || data.kind !== "ready" || data.platform !== platform) return;
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };

    window.addEventListener("message", onMessage);
  });
}
