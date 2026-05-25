import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { installMutationHost } from "~/main/host";
import type { Platform } from "~/shared/types/player";

function bootSongsphereMainRuntime(platform: Platform): void {
  installMutationHost(platform);
}

declare global {
  interface Window {
    __songsphereBootMain?: (platform: Platform) => void;
  }
}

window.__songsphereBootMain = bootSongsphereMainRuntime;

export default defineUnlistedScript(() => {
  const script = document.currentScript as HTMLScriptElement | null;
  const platform = (script?.dataset.platform ?? "generic") as Platform;
  bootSongsphereMainRuntime(platform);
});
