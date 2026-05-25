import { clickFirst, queryFirst } from "~/isolated/media";
import { clamp } from "~/shared/utils";
import type { MainWorldCommand } from "~/shared/protocol";
import { youtubeSelectors as sel } from "~/isolated/adapters/selectors/youtube";

export interface YoutubePageDetails {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
}

type YoutubePlayerHost = HTMLElement & {
  nextVideo?: () => void;
  previousVideo?: () => void;
};

const PLAYER_HOST_SELECTORS = [
  ".html5-video-player",
  "#movie_player",
  "ytd-player",
] as const;

const SKIP_BUTTON_SELECTORS = {
  next: [".ytp-next-button", "#movie_player .ytp-next-button"],
  previous: [".ytp-prev-button", "#movie_player .ytp-prev-button"],
} as const;

function getYoutubeVideo(): HTMLVideoElement | null {
  const video = document.querySelector<HTMLVideoElement>(sel.video[0]);
  if (video?.isConnected) return video;
  for (const s of sel.video) {
    const el = document.querySelector<HTMLVideoElement>(s);
    if (el?.isConnected) return el;
  }
  return null;
}

function readDetailsInPage(): YoutubePageDetails | null {
  const w = window as unknown as {
    ytInitialPlayerResponse?: {
      videoDetails?: {
        videoId?: string;
        title?: string;
        author?: string;
        thumbnail?: { thumbnails?: { url?: string }[] };
      };
    };
  };
  const vd = w.ytInitialPlayerResponse?.videoDetails;
  if (!vd) return null;
  const thumbs = vd.thumbnail?.thumbnails;
  const thumbnailUrl =
    thumbs && thumbs.length > 0 ? (thumbs[thumbs.length - 1]?.url ?? "") : "";
  return {
    videoId: vd.videoId ?? "",
    title: vd.title ?? "",
    author: vd.author ?? "",
    thumbnailUrl,
  };
}

function findPlayerHost(): YoutubePlayerHost | null {
  for (const s of PLAYER_HOST_SELECTORS) {
    const el = document.querySelector(s);
    if (el) return el as YoutubePlayerHost;
  }
  return null;
}

function waitForPlayerApi(maxMs = 2000): Promise<YoutubePlayerHost | null> {
  const existing = findPlayerHost();
  if (existing && (existing.nextVideo || existing.previousVideo)) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const host = findPlayerHost();
      if (
        host &&
        (typeof host.nextVideo === "function" || typeof host.previousVideo === "function")
      ) {
        resolve(host);
        return;
      }
      if (Date.now() - started >= maxMs) {
        resolve(host);
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

function invokePlayerSkip(host: YoutubePlayerHost, direction: "next" | "previous"): boolean {
  try {
    if (direction === "next" && typeof host.nextVideo === "function") {
      host.nextVideo();
      return true;
    }
    if (direction === "previous" && typeof host.previousVideo === "function") {
      host.previousVideo();
      return true;
    }
  } catch {
    /* no playlist queue */
  }
  return false;
}

function clickSkipButton(direction: "next" | "previous"): boolean {
  for (const s of SKIP_BUTTON_SELECTORS[direction]) {
    const btn = document.querySelector(s) as HTMLElement | null;
    if (!btn || btn.getAttribute("aria-disabled") === "true") continue;
    const style = window.getComputedStyle(btn);
    if (style.display === "none" || style.visibility === "hidden") continue;
    btn.click();
    return true;
  }
  return false;
}

async function skipInPage(direction: "next" | "previous"): Promise<string> {
  const host = await waitForPlayerApi();
  if (host && invokePlayerSkip(host, direction)) {
    return direction === "next" ? "player.nextVideo" : "player.previousVideo";
  }
  if (clickSkipButton(direction)) return `click:${direction}`;
  return "unavailable";
}

function findYoutubeLikeButton(root: ParentNode = document): HTMLButtonElement | null {
  for (const s of sel.like) {
    const el = root.querySelector<HTMLButtonElement>(s);
    if (el) return el;
  }
  return null;
}

export async function executeYoutubeBridgeCommand(
  command: MainWorldCommand,
): Promise<unknown> {
  switch (command.type) {
    case "PLAY": {
      const video = getYoutubeVideo();
      if (video?.paused) await video.play();
      return null;
    }
    case "PAUSE": {
      getYoutubeVideo()?.pause();
      return null;
    }
    case "PLAY_PAUSE": {
      const video = getYoutubeVideo();
      if (!video) return null;
      if (video.paused) await video.play();
      else video.pause();
      return null;
    }
    case "NEXT":
      return skipInPage("next");
    case "PREVIOUS":
      return skipInPage("previous");
    case "SEEK": {
      const video = getYoutubeVideo();
      if (video) video.currentTime = command.position;
      return null;
    }
    case "SET_VOLUME": {
      const video = getYoutubeVideo();
      if (!video) return null;
      const v = clamp(command.volume, 0, 1);
      video.volume = v;
      video.muted = v === 0;
      return null;
    }
    case "LIKE": {
      const btn = findYoutubeLikeButton();
      if (btn) btn.click();
      else clickFirst(sel.like);
      return null;
    }
    case "DISLIKE":
    case "SHUFFLE":
    case "REPEAT":
      return null;
    case "READ_YOUTUBE_DETAILS":
      return readDetailsInPage();
    default:
      return null;
  }
}
