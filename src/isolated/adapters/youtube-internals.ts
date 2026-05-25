import { debugLog, debugWarn } from "~/shared/debug";
import { sendBridgeCommand } from "~/shared/bridge";
import { parseYoutubeDetailsFromScripts } from "~/isolated/youtube-page-data";
import type { CleanupManager } from "~/isolated/safety";
import type { YoutubePageDetails } from "~/main/youtube";

/** YouTube inline script bridge + cache (CSP fallback; MAIN-world READ_YOUTUBE_DETAILS preferred). */

export const YT_DETAILS_EVENT = "songsphere:yt-details";

export type { YoutubePageDetails };

let cached: YoutubePageDetails | null = null;
let pollId = 0;
let injectMisses = 0;

export function clearYoutubePageCache(): void {
  cached = null;
}

function mergeCache(next: YoutubePageDetails | null): boolean {
  if (!next) return false;
  const prevId = cached?.videoId;
  const prevTitle = cached?.title;
  const prevThumb = cached?.thumbnailUrl;
  cached = next;
  return (
    next.videoId !== prevId ||
    next.title !== prevTitle ||
    next.thumbnailUrl !== prevThumb
  );
}

function injectPageScript(body: string): void {
  const script = document.createElement("script");
  script.textContent = body;
  (document.head ?? document.documentElement).appendChild(script);
  script.remove();
}

export function requestYoutubePageDetails(): void {
  injectPageScript(`(function(){
    try {
      var pr = window.ytInitialPlayerResponse;
      if (!pr || !pr.videoDetails) return;
      var vd = pr.videoDetails;
      var thumbs = vd.thumbnail && vd.thumbnail.thumbnails;
      var thumb = thumbs && thumbs.length ? thumbs[thumbs.length - 1].url : "";
      document.dispatchEvent(new CustomEvent(${JSON.stringify(YT_DETAILS_EVENT)}, {
        detail: {
          videoId: vd.videoId || "",
          title: vd.title || "",
          author: vd.author || "",
          thumbnailUrl: thumb || ""
        }
      }));
    } catch (e) {}
  })();`);
}

export function peekYoutubePageDetails(): YoutubePageDetails | null {
  return cached;
}

export function peekYoutubePageDetailsForVideo(videoId: string): YoutubePageDetails | null {
  if (!cached) return null;
  if (!videoId) return cached;
  if (cached.videoId && cached.videoId !== videoId) {
    clearYoutubePageCache();
    return null;
  }
  return cached;
}

export function bindYoutubePageBridge(
  cleanup: CleanupManager,
  onUpdate?: () => void,
): void {
  const onDetails = (event: Event) => {
    const detail = (event as CustomEvent<YoutubePageDetails>).detail;
    if (!detail?.videoId && !detail?.title) return;
    injectMisses = 0;
    if (mergeCache(detail)) {
      debugLog("yt-bridge", "inject event", detail.videoId, detail.title.slice(0, 36));
      onUpdate?.();
    }
  };

  document.addEventListener(YT_DETAILS_EVENT, onDetails);
  cleanup.add(() => document.removeEventListener(YT_DETAILS_EVENT, onDetails));

  const tick = () => {
    const fromScripts = parseYoutubeDetailsFromScripts();
    if (fromScripts && mergeCache(fromScripts)) {
      debugLog("yt-bridge", "script parse", fromScripts.videoId, fromScripts.title.slice(0, 36));
      onUpdate?.();
    }

    const beforeInject = cached?.videoId;
    requestYoutubePageDetails();
    injectMisses += 1;
    if (injectMisses === 5 && !beforeInject) {
      debugWarn("yt-bridge", "inline inject never delivered (CSP?) — using script parse + MAIN bridge");
    }

    void sendBridgeCommand("youtube", { type: "READ_YOUTUBE_DETAILS" }).then((data) => {
      if (data && typeof data === "object" && "videoId" in data) {
        const details = data as YoutubePageDetails;
        if (mergeCache(details)) {
          debugLog("yt-bridge", "MAIN bridge read", details.videoId, details.title.slice(0, 36));
          onUpdate?.();
        }
      }
    });
  };

  tick();
  pollId = window.setInterval(tick, 1500);
  cleanup.add(() => clearInterval(pollId));

  const onEnded = () => {
    debugLog("yt-bridge", "video ended → refresh metadata");
    window.setTimeout(tick, 300);
    window.setTimeout(tick, 1000);
    window.setTimeout(tick, 2200);
  };
  document.addEventListener("ended", onEnded, true);
  cleanup.add(() => document.removeEventListener("ended", onEnded, true));

  document.addEventListener("yt-navigate-finish", tick);
  cleanup.add(() => document.removeEventListener("yt-navigate-finish", tick));
}
