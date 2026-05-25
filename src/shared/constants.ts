import type { AdapterCapabilities } from "~/shared/types/adapter";
import { FULL_CAPABILITIES, GENERIC_CAPABILITIES, SPOTIFY_CAPABILITIES, YOUTUBE_CAPABILITIES } from "~/shared/types/adapter";
import type { Platform } from "~/shared/types/player";

/** Platform registry, polling intervals, dormant sync threshold, strip platform filter. */

export interface PlatformDescriptor {
  id: Platform;
  label: string;
  shortLabel: string;
  hosts: string[];
  playerUrl: string;
  matches: string[];
  excludeMatches?: string[];
  color: string;
  accent: string;
  capabilities: AdapterCapabilities;
}

export const PLATFORMS: Record<Platform, PlatformDescriptor> = {
  spotify: {
    id: "spotify",
    label: "Spotify",
    shortLabel: "SP",
    hosts: ["open.spotify.com"],
    playerUrl: "https://open.spotify.com",
    matches: ["https://open.spotify.com/*"],
    color: "#03ad40",
    accent: "#03ad40",
    capabilities: SPOTIFY_CAPABILITIES,
  },
  ytmusic: {
    id: "ytmusic",
    label: "YouTube Music",
    shortLabel: "YTM",
    hosts: ["music.youtube.com"],
    playerUrl: "https://music.youtube.com",
    matches: ["https://music.youtube.com/*"],
    color: "#b80208",
    accent: "#b80208",
    capabilities: FULL_CAPABILITIES,
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    shortLabel: "YT",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com"],
    playerUrl: "https://www.youtube.com",
    matches: [
      "https://www.youtube.com/*",
      "https://youtube.com/*",
      "https://m.youtube.com/*",
    ],
    excludeMatches: ["https://music.youtube.com/*"],
    color: "#fa050d",
    accent: "#fa050d",
    capabilities: YOUTUBE_CAPABILITIES,
  },
  generic: {
    id: "generic",
    label: "Media",
    shortLabel: "GEN",
    hosts: [],
    playerUrl: "https://open.spotify.com",
    matches: ["*://*/*"],
    excludeMatches: [
      "*://open.spotify.com/*",
      "*://music.youtube.com/*",
      "*://www.youtube.com/*",
      "*://youtube.com/*",
      "*://m.youtube.com/*",
    ],
    color: "#7c5cff",
    accent: "#7c5cff",
    capabilities: GENERIC_CAPABILITIES,
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

export const TRACK_UPDATE_DEBOUNCE_MS = 250;

export const POLL_PLAYING_MS = 1200;
export const POLL_PAUSED_MS = 4000;
export const POLL_HIDDEN_MS = 6000;
export const POLL_IDLE_MS = 12000;
export const POLL_DORMANT_MS = 45000;

export const DORMANT_STALE_MS = 5 * 60 * 1000;

const KNOWN_HOSTS = new Set(
  PLATFORM_LIST.flatMap((p) => p.hosts),
);

function hostnameMatches(hosts: string[], hostname: string): boolean {
  return hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

export function detectPlatformFromUrl(url: string | undefined): Platform | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    if (hostname === "music.youtube.com" || hostname.endsWith(".music.youtube.com")) {
      return "ytmusic";
    }
    for (const p of PLATFORM_LIST) {
      if (!p.hosts.length) continue;
      if (hostnameMatches(p.hosts, hostname)) return p.id;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export function isKnownMusicHost(url: string | undefined): boolean {
  return detectPlatformFromUrl(url) !== null;
}

export function isMusicSessionPlatform(platform: Platform): boolean {
  return platform === "spotify" || platform === "ytmusic" || platform === "youtube";
}

export function getCapabilities(platform: Platform | null): AdapterCapabilities {
  if (!platform) return GENERIC_CAPABILITIES;
  return PLATFORMS[platform].capabilities;
}

export const BUILD_ID = "bridge-hotfix-v3";
