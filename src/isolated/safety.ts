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

type Disposer = () => void;

export class CleanupManager {
  private disposers: Disposer[] = [];

  add(fn: Disposer): Disposer {
    this.disposers.push(fn);
    return () => this.remove(fn);
  }

  remove(fn: Disposer): void {
    const i = this.disposers.indexOf(fn);
    if (i >= 0) this.disposers.splice(i, 1);
  }

  runAll(): void {
    const fns = [...this.disposers].reverse();
    this.disposers = [];
    for (const fn of fns) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
  }
}

export class SongSphereError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SongSphereError";
  }
}

export class AdapterError extends SongSphereError {
  constructor(message: string) {
    super(message);
    this.name = "AdapterError";
  }
}

export class MessagingError extends SongSphereError {
  constructor(message: string) {
    super(message);
    this.name = "MessagingError";
  }
}

export class TimeoutError extends SongSphereError {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
