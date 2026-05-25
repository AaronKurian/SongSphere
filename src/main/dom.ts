/* MAIN-world DOM helpers for platform mutation executors. */

export function queryFirst<T extends Element = HTMLElement>(
  selectors: readonly string[],
  root: ParentNode = document,
): T | null {
  for (const s of selectors) {
    try {
      const el = root.querySelector(s);
      if (el) return el as T;
    } catch {
      /* invalid selector */
    }
  }
  return null;
}

export function clickFirst(selectors: readonly string[], root: ParentNode = document): boolean {
  const el = queryFirst<HTMLElement>(selectors, root);
  if (!el) return false;
  el.click();
  return true;
}

export function getActiveMediaElement(): HTMLMediaElement | null {
  const videos = document.querySelectorAll<HTMLVideoElement>("video");
  for (const v of videos) {
    if (!v.isConnected) continue;
    if (!v.paused && !v.ended) return v;
  }
  for (const v of videos) {
    if (v.isConnected) return v;
  }
  const audios = document.querySelectorAll<HTMLAudioElement>("audio");
  for (const a of audios) {
    if (a.isConnected) return a;
  }
  return null;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function setMediaTime(
  position: number,
  inputSelectors: readonly string[],
  root: ParentNode = document,
): boolean {
  const input = queryFirst<HTMLInputElement>(inputSelectors, root);
  if (input) {
    const ms = Math.round(position * 1000);
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    desc?.set?.call(input, String(ms));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  const media = getActiveMediaElement();
  if (media) {
    media.currentTime = position;
    return true;
  }
  return false;
}

export function writeVolumeToInput(input: HTMLInputElement, volume: number, defaultMax = 100): void {
  const max = Number(input.getAttribute("max")) || defaultMax;
  const next = String(Math.round(clamp(volume, 0, 1) * max));
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  desc?.set?.call(input, next);
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function queryRangeInContainer(
  selectors: readonly string[],
  root: ParentNode,
): HTMLInputElement | null {
  for (const s of selectors) {
    const el = root.querySelector<HTMLInputElement>(s);
    if (el && (el.type === "range" || el.getAttribute("role") === "slider")) return el;
  }
  return null;
}

export function dispatchMediaKey(key: string): void {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }),
  );
  target.dispatchEvent(
    new KeyboardEvent("keyup", { key, code: key, bubbles: true, cancelable: true }),
  );
}
