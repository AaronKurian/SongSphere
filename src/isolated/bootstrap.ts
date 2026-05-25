import { bootstrapAdapter, type BaseMusicAdapter } from "~/isolated/adapters/base";
import { initBuildFreshness } from "~/shared/build";
import { startBridgeRuntime } from "~/shared/bridge";
import type { Platform } from "~/shared/types/player";

export async function bootstrapContentPlatform(
  freshnessLabel: string,
  platform: Platform,
  createAdapter: () => BaseMusicAdapter,
): Promise<() => void> {
  initBuildFreshness(freshnessLabel);
  void startBridgeRuntime(platform);
  return new Promise((resolve) => {
    const startAdapter = () => resolve(bootstrapAdapter(createAdapter()));
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startAdapter, { once: true });
    } else {
      startAdapter();
    }
  });
}
