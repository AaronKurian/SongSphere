/* Cross-browser extension API and feature flags. */
import { browser } from "wxt/browser";

export const ext = browser;
export type Ext = typeof browser;

export const BROWSER_FLAGS = {
  isFirefox: import.meta.env.BROWSER === "firefox",
  isChrome: import.meta.env.BROWSER === "chrome",
  messageTimeoutMs: import.meta.env.BROWSER === "firefox" ? 6000 : 4000,
  messageRetries: import.meta.env.BROWSER === "firefox" ? 3 : 2,
  heartbeatMinutes: import.meta.env.BROWSER === "firefox" ? 0.5 : 0.4,
  mediaThrottleMs: import.meta.env.BROWSER === "firefox" ? 150 : 100,
  volumeCoalesceMs: 50,
  artworkCacheMax: import.meta.env.BROWSER === "firefox" ? 36 : 48,
  fullHydrateDebounceMs: 120,
  hydrationDemoteMs: 4000,
  deltaCoalesceMs: 24,
} as const;
