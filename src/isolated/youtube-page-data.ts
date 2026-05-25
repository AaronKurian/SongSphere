import { debugLog } from "~/shared/debug";
import type { YoutubePageDetails } from "~/isolated/adapters/youtube-internals";

/** Parse ytInitialPlayerResponse from inline scripts in the isolated content world. */

function extractJsonAssignment(source: string, varName: string): Record<string, unknown> | null {
  const markers = [`var ${varName} = `, `${varName} = `];
  let start = -1;
  for (const marker of markers) {
    const idx = source.indexOf(marker);
    if (idx !== -1) {
      start = idx + marker.length;
      break;
    }
  }
  if (start < 0 || source[start] !== "{") return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, i + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function detailsFromPlayerResponse(pr: Record<string, unknown> | null): YoutubePageDetails | null {
  if (!pr) return null;
  const vd = pr.videoDetails as Record<string, unknown> | undefined;
  if (!vd) return null;
  const videoId = String(vd.videoId ?? "").trim();
  const title = String(vd.title ?? "").trim();
  const author = String(vd.author ?? "").trim();
  const thumbs = vd.thumbnail as { thumbnails?: { url?: string }[] } | undefined;
  const list = thumbs?.thumbnails;
  const thumbnailUrl =
    list && list.length > 0 ? String(list[list.length - 1]?.url ?? "").trim() : "";
  if (!videoId && !title) return null;
  return { videoId, title, author, thumbnailUrl };
}

function readWatchVideoIdFromUrl(): string {
  try {
    return new URLSearchParams(location.search).get("v")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function parseYoutubeDetailsFromScripts(): YoutubePageDetails | null {
  const watchId = readWatchVideoIdFromUrl();
  const scripts = document.querySelectorAll("script");
  let fallback: YoutubePageDetails | null = null;

  for (const script of scripts) {
    const text = script.textContent;
    if (!text?.includes("ytInitialPlayerResponse")) continue;
    const pr = extractJsonAssignment(text, "ytInitialPlayerResponse");
    const details = detailsFromPlayerResponse(pr);
    if (!details) continue;
    if (watchId && details.videoId && details.videoId !== watchId) continue;
    debugLog("yt-parse", "ytInitialPlayerResponse", details.videoId, details.title.slice(0, 40));
    return details;
  }

  for (const script of scripts) {
    const text = script.textContent;
    if (!text?.includes("ytInitialPlayerResponse")) continue;
    const pr = extractJsonAssignment(text, "ytInitialPlayerResponse");
    const details = detailsFromPlayerResponse(pr);
    if (details && !fallback) fallback = details;
  }
  if (fallback) return fallback;

  for (const script of scripts) {
    const text = script.textContent;
    if (!text?.includes("ytInitialData")) continue;
    const data = extractJsonAssignment(text, "ytInitialData");
    const contents =
      (data?.contents as Record<string, unknown> | undefined) ??
      (data?.response as Record<string, unknown> | undefined)?.contents;
    const twoCol =
      (contents as { twoColumnWatchNextResults?: unknown } | undefined)
        ?.twoColumnWatchNextResults ?? contents;
    const primary =
      (twoCol as { results?: { results?: { contents?: unknown[] } } } | undefined)?.results
        ?.results?.contents?.[0];
    const vr = (
      primary as {
        videoPrimaryInfoRenderer?: { title?: { runs?: { text?: string }[] } };
      }
    )?.videoPrimaryInfoRenderer;
    const title = vr?.title?.runs?.[0]?.text?.trim() ?? "";
    const secondary =
      (twoCol as { secondaryResults?: { results?: { contents?: unknown[] } } } | undefined)
        ?.secondaryResults?.results?.contents?.[0];
    const playlistThumb = (
      secondary as { compactVideoRenderer?: { thumbnail?: { thumbnails?: { url?: string }[] } } }
    )?.compactVideoRenderer?.thumbnail?.thumbnails;
    const thumbnailUrl =
      playlistThumb && playlistThumb.length > 0
        ? String(playlistThumb[playlistThumb.length - 1]?.url ?? "").trim()
        : "";
    const videoId =
      (
        primary as {
          videoPrimaryInfoRenderer?: {
            navigationEndpoint?: { watchEndpoint?: { videoId?: string } };
          };
        }
      )?.videoPrimaryInfoRenderer?.navigationEndpoint?.watchEndpoint?.videoId?.trim() ?? "";
    if (title || videoId) {
      debugLog("yt-parse", "ytInitialData", videoId, title.slice(0, 40));
      return { videoId, title, author: "", thumbnailUrl };
    }
  }

  return null;
}
