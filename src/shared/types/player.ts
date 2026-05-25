/** Player track model, connection state and stable track hashing for sync. */

export type Platform = "spotify" | "ytmusic" | "youtube" | "generic";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "unsupported";

export interface TrackInfo {
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  currentTime?: number;
  isPlaying: boolean;
  volume?: number;
  liked?: boolean;
  platform: Platform;
}

export interface PlayerSnapshot {
  track: TrackInfo | null;
  platform: Platform | null;
  tabId: number | null;
  updatedAt: number;
  version: number;
  connection: ConnectionState;
}

export const emptySnapshot = (): PlayerSnapshot => ({
  track: null,
  platform: null,
  tabId: null,
  updatedAt: 0,
  version: 0,
  connection: "idle",
});

function artworkKey(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).pathname.slice(-48);
  } catch {
    return url.slice(-48);
  }
}

function youtubeWatchId(t: TrackInfo): string {
  if (t.platform !== "youtube") return "";
  const art = t.artwork ?? "";
  const m = art.match(/\/vi\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
  return m?.[1] ?? "";
}

export function trackHash(t: TrackInfo | null): string {
  if (!t) return "";
  const vol = t.volume != null ? Math.round(t.volume * 100) : "";
  const ytId = youtubeWatchId(t);
  return `${t.platform}|${ytId}|${t.title}|${t.artist}|${t.isPlaying}|${t.liked ?? ""}|${vol}|${Math.floor(t.currentTime ?? 0)}|${artworkKey(t.artwork)}`;
}

export function tracksEqual(a: TrackInfo | null, b: TrackInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return trackHash(a) === trackHash(b) && a.artwork === b.artwork && a.duration === b.duration;
}
