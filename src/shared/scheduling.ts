/* Scheduling, coalescing queues, delta batching and async retry helpers. */
import { BROWSER_FLAGS } from "~/shared/browser";
import { computeSessionsDelta, isEmptyDelta } from "~/background/session";
import type { SessionsDeltaPayload, SessionsPayload } from "~/shared/types/session";

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function withAbortTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortSignal,
): Promise<T> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms`)),
      ms,
    );
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}


export type QueuePriority = "high" | "medium" | "low";

export class CoalescingActionQueue {
  private chains: Record<QueuePriority, Promise<void>> = {
    high: Promise.resolve(),
    medium: Promise.resolve(),
    low: Promise.resolve(),
  };
  private pendingVolume: number | null = null;
  private volumeTimer: ReturnType<typeof setTimeout> | null = null;
  private volumeResolvers: Array<() => void> = [];

  clear(): void {
    this.chains = {
      high: Promise.resolve(),
      medium: Promise.resolve(),
      low: Promise.resolve(),
    };
    if (this.volumeTimer) clearTimeout(this.volumeTimer);
    this.volumeTimer = null;
    this.pendingVolume = null;
    this.flushVolumeResolvers();
  }

  enqueue<T>(task: () => Promise<T>, priority: QueuePriority = "medium"): Promise<T> {
    if (priority === "high") this.cancelVolumePending();
    const run = this.chains[priority].then(task, task);
    this.chains[priority] = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  enqueueVolume(task: (volume: number) => Promise<void>, volume: number): Promise<void> {
    this.pendingVolume = volume;
    return new Promise((resolve, reject) => {
      this.volumeResolvers.push(resolve);
      if (this.volumeTimer) clearTimeout(this.volumeTimer);
      this.volumeTimer = setTimeout(() => {
        this.volumeTimer = null;
        const v = this.pendingVolume ?? volume;
        this.pendingVolume = null;
        this.flushVolumeResolvers();
        void this.enqueue(() => task(v), "low").catch(reject);
      }, BROWSER_FLAGS.volumeCoalesceMs);
    });
  }

  private flushVolumeResolvers(): void {
    const resolvers = this.volumeResolvers.splice(0);
    for (const resolve of resolvers) resolve();
  }

  private cancelVolumePending(): void {
    if (this.volumeTimer) clearTimeout(this.volumeTimer);
    this.volumeTimer = null;
    this.pendingVolume = null;
    this.flushVolumeResolvers();
  }
}

export type ActionQueue = CoalescingActionQueue;


export class RuntimeScheduler {
  private intervals = new Set<ReturnType<typeof setInterval>>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();

  interval(fn: () => void, ms: number, signal?: AbortSignal): void {
    throwIfAborted(signal);
    const id = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(id);
        this.intervals.delete(id);
        return;
      }
      fn();
    }, ms);
    this.intervals.add(id);
    signal?.addEventListener(
      "abort",
      () => {
        clearInterval(id);
        this.intervals.delete(id);
      },
      { once: true },
    );
  }

  timeout(fn: () => void, ms: number, signal?: AbortSignal): void {
    throwIfAborted(signal);
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      if (signal?.aborted) return;
      fn();
    }, ms);
    this.timeouts.add(id);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        this.timeouts.delete(id);
      },
      { once: true },
    );
  }

  clearAll(): void {
    for (const id of this.intervals) clearInterval(id);
    for (const id of this.timeouts) clearTimeout(id);
    this.intervals.clear();
    this.timeouts.clear();
  }
}

export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): (...args: A) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;

  const flush = () => {
    if (!pending) return;
    const args = pending;
    pending = null;
    last = Date.now();
    fn(...args);
  };

  return (...args: A) => {
    const now = Date.now();
    pending = args;
    if (now - last >= waitMs) {
      if (timer) clearTimeout(timer);
      timer = null;
      flush();
      return;
    }
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, waitMs - (now - last));
    }
  };
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export interface RetryOptions {
  retries?: number;
  timeoutMs?: number;
  delayMs?: number;
  signal?: AbortSignal;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, timeoutMs = 4000, delayMs = 120, signal }: RetryOptions = {},
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    throwIfAborted(signal);
    try {
      return await withAbortTimeout(fn(), timeoutMs, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      last = e;
      if (attempt < retries) await sleep(delayMs * (attempt + 1), signal);
    }
  }
  throw last instanceof Error ? last : new TimeoutError(String(last));
}

export interface DeltaBatcher {
  push(next: SessionsPayload, opts?: { immediate?: boolean }): void;
  flush(): SessionsDeltaPayload | null;
  dispose(): void;
}

export function createDeltaBatcher(
  onFlush: (delta: SessionsDeltaPayload) => void,
): DeltaBatcher {
  let lastSent: SessionsPayload | null = null;
  let pending: SessionsPayload | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const runFlush = () => {
    timer = null;
    if (!pending) return null;
    const next = pending;
    pending = null;
    if (lastSent && next.version < lastSent.version) return null;

    const prev = lastSent;
    const delta = computeSessionsDelta(prev, next);
    if (isEmptyDelta(delta, prev)) return null;
    lastSent = next;
    onFlush(delta);
    return delta;
  };

  const schedule = (immediate: boolean) => {
    if (timer) clearTimeout(timer);
    if (immediate) {
      runFlush();
      return;
    }
    timer = setTimeout(runFlush, BROWSER_FLAGS.deltaCoalesceMs);
  };

  return {
    push(next, opts) {
      if (lastSent && next.version < lastSent.version) return;
      pending = next;
      schedule(opts?.immediate ?? false);
    },
    flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      return runFlush();
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}