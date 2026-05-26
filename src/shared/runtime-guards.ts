import type { Platform } from "~/shared/types/player";

/** Per-context singleton flags (isolated content, MAIN world, popup). */

export type SongsphereRuntimeWindow = Window & {
  __songsphereMainRuntimeInstalled?: boolean;
  __songsphereBootMain?: (platform: Platform) => void;
  __songsphereBridgeInstalled?: boolean;
  __songspherePopupInstalled?: boolean;
  __songsphereContentInstalled?: boolean;
};

export function runtimeWindow(): SongsphereRuntimeWindow {
  return window as SongsphereRuntimeWindow;
}

export function runtimeGlobal(): SongsphereRuntimeWindow {
  return globalThis as unknown as SongsphereRuntimeWindow;
}
