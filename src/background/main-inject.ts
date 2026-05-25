import { detectPlatformFromUrl } from "~/shared/constants";
import { ext } from "~/shared/browser";
import { debugLog, debugWarn } from "~/shared/debug";
import type { Platform } from "~/shared/types/player";

/** Idempotent MAIN-world bridge injection for music tabs. */

const MAIN_RUNTIME_FILE = "/songsphere-main-runtime.js";
const injectedTabs = new Set<number>();

export async function installMainRuntimeInTab(
  tabId: number,
  platform: Platform,
): Promise<void> {
  if (!ext.scripting?.executeScript) {
    debugWarn("main-inject", "scripting API unavailable");
    return;
  }

  try {
    await ext.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: "MAIN",
      injectImmediately: true,
      files: [MAIN_RUNTIME_FILE],
    });

    await ext.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: "MAIN",
      injectImmediately: true,
      func: (p: Platform) => {
        const w = window as Window & {
          __songsphereBootMain?: (platform: Platform) => void;
        };
        w.__songsphereBootMain?.(p);
      },
      args: [platform],
    });

    injectedTabs.add(tabId);
    debugLog("main-inject", "installed", platform, "tab", tabId);
  } catch (err) {
    debugWarn("main-inject", "failed tab", tabId, err);
    throw err;
  }
}

export function clearMainRuntimeInjected(tabId: number): void {
  injectedTabs.delete(tabId);
}

export async function ensureMainBridgeForTab(
  tabId: number,
  url: string | undefined,
): Promise<void> {
  const platform = detectPlatformFromUrl(url);
  if (!platform || platform === "generic") return;
  try {
    await installMainRuntimeInTab(tabId, platform);
  } catch {
    /* restricted URL or duplicate inject */
  }
}
