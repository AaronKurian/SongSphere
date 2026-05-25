import { BUILD_ID } from "~/shared/constants";
import { ext } from "~/shared/browser";

/** Cross-context build freshness (leader / latest / stale) for debug log tags. */

const LATEST_BUILD_KEY = "songsphereLatestBuildId";

export type BuildFreshnessStatus = "checking" | "leader" | "latest" | "stale";

export type BuildFreshness = {
  buildId: string;
  status: BuildFreshnessStatus;
  latestId: string | null;
};

let status: BuildFreshnessStatus = "checking";
let latestId: string | null = null;
let bannerLogged = false;

export async function markExtensionBuildLatest(): Promise<void> {
  latestId = BUILD_ID;
  status = "leader";
  await ext.storage.local.set({ [LATEST_BUILD_KEY]: BUILD_ID });
}

export async function verifyBuildFreshness(context: string): Promise<BuildFreshness> {
  try {
    const stored = await ext.storage.local.get(LATEST_BUILD_KEY);
    latestId =
      typeof stored[LATEST_BUILD_KEY] === "string" ? stored[LATEST_BUILD_KEY] : null;

    if (!latestId) {
      status = "leader";
    } else if (latestId === BUILD_ID) {
      status = "latest";
    } else {
      status = "stale";
    }
  } catch {
    status = "checking";
  }

  logBuildBanner(context);
  return getBuildFreshness();
}

export function getBuildFreshness(): BuildFreshness {
  return { buildId: BUILD_ID, status, latestId };
}

export function buildLogTag(): string {
  switch (status) {
    case "latest":
      return `[build:${BUILD_ID} ✓latest]`;
    case "leader":
      return `[build:${BUILD_ID} ✓leader]`;
    case "stale":
      return `[build:${BUILD_ID} ✗STALE≠${latestId}]`;
    default:
      return `[build:${BUILD_ID} ?]`;
  }
}

export function logBuildBanner(context: string): void {
  if (bannerLogged) return;
  bannerLogged = true;

  const snap = getBuildFreshness();
  const hint =
    snap.status === "stale"
      ? " - reload extension + this tab"
      : snap.status === "leader"
        ? " - extension reloaded (this context is current)"
        : "";

  console.warn(`[SongSphere:build] ${context} ${buildLogTag()}${hint}`);
}

export function initBuildFreshness(context: string): void {
  if (context === "background") {
    void markExtensionBuildLatest().then(() => logBuildBanner(context));
    return;
  }
  void verifyBuildFreshness(context);
}

export function assertPageScriptBuild(pageBuildId: unknown, context: string): void {
  if (typeof pageBuildId !== "string" || !pageBuildId) return;
  if (pageBuildId === BUILD_ID) return;
  console.warn(
    `[SongSphere:build] ${context} page script STALE: page=${pageBuildId} context=${BUILD_ID} latest=${latestId ?? "?"}`,
  );
}
