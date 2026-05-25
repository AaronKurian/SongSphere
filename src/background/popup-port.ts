import { ext } from "~/shared/browser";
import { BROWSER_FLAGS } from "~/shared/browser";
import { debugLog, debugWarn } from "~/shared/debug";
import type { ConnectionState } from "~/shared/types/player";
import type { EventMessage } from "~/shared/types/messages";

/** Popup long-lived port, heartbeat alarm and session broadcast (port first, runtime fallback). */

export const HEARTBEAT_ALARM = "songsphere-heartbeat";
export const POPUP_PORT = "songsphere-popup";

type Port = ReturnType<typeof ext.runtime.connect>;
const popupPorts = new Set<Port>();

export function startHeartbeat(onTick: () => void): void {
  if (!ext.alarms?.create) return;
  void ext.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: BROWSER_FLAGS.heartbeatMinutes });
  ext.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === HEARTBEAT_ALARM) onTick();
  });
}

export function bindPopupPort(onWake: () => void): void {
  ext.runtime.onConnect.addListener((port) => {
    if (port.name !== POPUP_PORT) return;
    popupPorts.add(port);
    debugLog("port", "popup connected", popupPorts.size);
    onWake();
    port.onDisconnect.addListener(() => {
      popupPorts.delete(port);
      debugLog("port", "popup disconnected", popupPorts.size);
    });
  });
}

export function broadcastToPopup(msg: EventMessage): void {
  let delivered = 0;
  for (const port of [...popupPorts]) {
    try {
      port.postMessage(msg);
      delivered += 1;
    } catch {
      popupPorts.delete(port);
    }
  }
  if (delivered > 0) {
    debugLog("broadcast", msg.type, "via port", delivered);
    return;
  }
  void Promise.resolve(ext.runtime.sendMessage(msg)).catch((err: unknown) => {
    debugLog("broadcast", msg.type, "no receiver", err instanceof Error ? err.message : err);
  });
}

const MESSAGES: Record<ConnectionState, string> = {
  idle: "Open Spotify, YouTube Music or any page with media playing.",
  connecting: "Connecting to player…",
  connected: "",
  reconnecting: "Reconnecting to player…",
  disconnected: "Player tab was closed. Open a music tab to continue.",
  unsupported: "No supported player detected on this tab.",
};

export function connectionMessage(state: ConnectionState): string {
  return MESSAGES[state];
}

export function isDegraded(state: ConnectionState): boolean {
  return state === "reconnecting" || state === "disconnected" || state === "unsupported";
}

type MessageListener = (rawMsg: unknown) => void;

export class PopupSession {
  private controller = new AbortController();
  private port: Port | null = null;
  private messageListener: MessageListener | null = null;
  private refreshGen = 0;

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  beginRefresh(): number {
    return ++this.refreshGen;
  }

  isStale(gen: number): boolean {
    return gen !== this.refreshGen || this.controller.signal.aborted;
  }

  setMessageListener(listener: MessageListener): void {
    this.messageListener = listener;
  }

  connectPort(onReconnect?: () => void): void {
    if (this.port) {
      try {
        this.port.disconnect();
      } catch {
        /* already closed */
      }
      this.port = null;
    }

    try {
      this.port = ext.runtime.connect({ name: POPUP_PORT });
      debugLog("popup", "port connected");
      this.port.onMessage.addListener((raw) => {
        if (this.controller.signal.aborted || !this.messageListener) return;
        debugLog("popup", "port message", (raw as { type?: string })?.type);
        this.messageListener(raw);
      });
      this.port.onDisconnect.addListener(() => {
        debugWarn("popup", "port disconnected - will reconnect on next open");
        this.port = null;
        onReconnect?.();
      });
    } catch (err) {
      debugWarn("popup", "port connect failed", err);
      this.port = null;
    }
  }

  dispose(): void {
    this.controller.abort();
    this.controller = new AbortController();
    this.messageListener = null;
    if (this.port) {
      try {
        this.port.disconnect();
      } catch {
        /* already closed */
      }
      this.port = null;
    }
    this.refreshGen++;
  }
}
