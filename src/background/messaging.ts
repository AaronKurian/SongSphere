import { debugLog } from "~/shared/debug";
import { throwIfAborted } from "~/isolated/safety";
import { ext } from "~/shared/browser";
import { BROWSER_FLAGS } from "~/shared/browser";
import { MessagingError } from "~/isolated/safety";
import { withRetry, type RetryOptions } from "~/shared/scheduling";
import type {
  AnyMessage,
  CommandMessage,
  EventMessage,
  MessageResponse,
  MessageType,
  ResultOf,
} from "~/shared/types/messages";

export interface MessageSenderLike {
  id?: string;
  url?: string;
  tab?: { id?: number; url?: string; windowId?: number };
  frameId?: number;
}

export type MessageHandler<T extends MessageType> = (
  msg: Extract<AnyMessage, { type: T }>,
  sender: MessageSenderLike,
) => Promise<ResultOf<T>> | ResultOf<T>;

const DEFAULT_RETRY: RetryOptions = {
  retries: BROWSER_FLAGS.messageRetries,
  timeoutMs: BROWSER_FLAGS.messageTimeoutMs,
  delayMs: 120,
};

async function parseResponse<T>(raw: unknown, label: string): Promise<T> {
  const res = raw as MessageResponse<T> | undefined;
  if (!res) throw new MessagingError(`[SongSphere] no response for ${label}`);
  if (!res.ok) throw new MessagingError(`[SongSphere] ${label}: ${res.error}`);
  return res.data;
}

export async function sendToRuntime<M extends CommandMessage>(
  msg: M,
  retry: RetryOptions = DEFAULT_RETRY,
  signal?: AbortSignal,
): Promise<ResultOf<M["type"]>> {
  throwIfAborted(signal);
  debugLog("cmd", msg.type, "→ runtime");
  return withRetry(
    async () =>
      parseResponse<ResultOf<M["type"]>>(
        await ext.runtime.sendMessage(msg),
        msg.type,
      ),
    { ...retry, signal },
  );
}

export async function sendToTab<M extends CommandMessage>(
  tabId: number,
  msg: M,
  retry: RetryOptions = DEFAULT_RETRY,
  signal?: AbortSignal,
): Promise<ResultOf<M["type"]>> {
  throwIfAborted(signal);
  if (msg.type !== "SET_SYNC_PRIORITY") {
    debugLog("cmd", msg.type, "→ tab", tabId);
  }
  return withRetry(
    async () =>
      parseResponse<ResultOf<M["type"]>>(
        await ext.tabs.sendMessage(tabId, msg),
        `tab ${tabId} ${msg.type}`,
      ),
    { ...retry, signal },
  );
}

export function broadcastEvent(msg: EventMessage): void {
  void Promise.resolve(ext.runtime.sendMessage(msg)).catch((err: unknown) => {
    debugLog(
      "broadcast",
      msg.type,
      "runtime fallback no receiver",
      err instanceof Error ? err.message : err,
    );
  });
}

interface Registration {
  type: MessageType;
  handler: MessageHandler<MessageType>;
}

const registrations: Registration[] = [];
let listenerInstalled = false;

function installListener(): void {
  if (listenerInstalled) return;
  listenerInstalled = true;

  ext.runtime.onMessage.addListener((rawMsg, sender, sendResponse) => {
    const msg = rawMsg as AnyMessage | undefined;
    if (!msg || typeof msg !== "object" || !("type" in msg)) {
      sendResponse({ ok: false, error: "invalid message" } satisfies MessageResponse);
      return false;
    }
    const matches = registrations.filter((r) => r.type === msg.type);
    if (matches.length === 0) return false;

    void (async () => {
      try {
        let result: unknown;
        for (const reg of matches) {
          result = await reg.handler(msg as never, sender as MessageSenderLike);
        }
        sendResponse({ ok: true, data: result } satisfies MessageResponse);
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        } satisfies MessageResponse);
      }
    })();
    return true;
  });
}

export function onMessage<T extends MessageType>(
  type: T,
  handler: MessageHandler<T>,
): () => void {
  installListener();
  const reg: Registration = { type, handler: handler as unknown as MessageHandler<MessageType> };
  registrations.push(reg);
  return () => {
    const i = registrations.indexOf(reg);
    if (i >= 0) registrations.splice(i, 1);
  };
}
