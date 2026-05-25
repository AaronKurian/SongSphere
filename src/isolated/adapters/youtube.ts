import { BridgeBackedAdapter } from "~/isolated/adapters/bridge-backed";
import {
  queryFirst,
  readAttr,
  readMediaSession,
  readText,
} from "~/isolated/media";
import { clamp } from "~/shared/utils";
import {
  bindYoutubePageBridge,
  clearYoutubePageCache,
  peekYoutubePageDetailsForVideo,
  requestYoutubePageDetails,
} from "~/isolated/adapters/youtube-internals";
import { sendBridgeCommand } from "~/shared/bridge";
import { debugLog } from "~/shared/debug";
import { parseYoutubeDetailsFromScripts } from "~/isolated/youtube-page-data";
import { YOUTUBE_CAPABILITIES } from "~/shared/types/adapter";
import type { Platform, TrackInfo } from "~/shared/types/player";
import { youtubeSelectors as sel } from "~/isolated/adapters/selectors/youtube";

/** YouTube watch adapter — video id from URL/player attrs (SPA-safe), bridge-backed controls. */

export function getYoutubeVideo(): HTMLVideoElement | null {
  const video = document.querySelector<HTMLVideoElement>(sel.video[0]);
  if (video?.isConnected) return video;
  for (const s of sel.video) {
    const el = document.querySelector<HTMLVideoElement>(s);
    if (el?.isConnected) return el;
  }
  return null;
}

export function isYoutubeMediaReady(video: HTMLVideoElement | null): video is HTMLVideoElement {
  if (!video) return false;
  if (video.readyState <= 0) return false;
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) return false;
  return true;
}

function readWatchVideoIdFromUrl(): string {
  try {
    const url = new URL(location.href);
    const v = url.searchParams.get("v")?.trim();
    if (v) return v;
    const shorts = url.pathname.match(/^\/shorts\/([^/?]+)/)?.[1]?.trim();
    if (shorts) return shorts;
  } catch {
    /* ignore */
  }
  return "";
}

function readPlayerVideoId(): string {
  for (const s of sel.playerVideoId) {
    const el = document.querySelector(s);
    const id = el?.getAttribute("video-id")?.trim();
    if (id) return id;
  }
  return "";
}

function readCanonicalVideoId(): string {
  const href =
    readAttr(['link[rel="canonical"]'], "href") ||
    readAttr(['meta[property="og:url"]'], "content");
  if (!href) return "";
  try {
    return new URL(href).searchParams.get("v")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function readYoutubeVideoId(): string {
  const fromUrl = readWatchVideoIdFromUrl();
  if (fromUrl) return fromUrl;
  const fromPlayer = readPlayerVideoId();
  if (fromPlayer) return fromPlayer;
  const meta = readAttr(sel.videoIdMeta, "content");
  if (meta) return meta;
  return readCanonicalVideoId();
}

function readOgImage(): string {
  return readAttr(sel.ogImage, "content");
}

function cleanYoutubeTitle(raw: string): string {
  return raw.replace(/\s*[-–|]\s*YouTube\s*$/i, "").trim();
}

function readDomTitle(): string {
  const dom = readText(sel.title);
  if (dom) return cleanYoutubeTitle(dom) || dom;
  const ogTitle = readAttr(sel.ogTitle, "content");
  const rawTitle = ogTitle || document.title || "";
  return cleanYoutubeTitle(rawTitle) || "YouTube video";
}

function isYoutubeDislikeLabel(label: string): boolean {
  const l = label.toLowerCase();
  return l.includes("dislike") || l.includes("thumb down") || l.includes("i don't like");
}

function isYoutubeLikeLabel(label: string): boolean {
  const l = label.toLowerCase();
  if (!l || isYoutubeDislikeLabel(l)) return false;
  return (
    l.startsWith("like") ||
    l.startsWith("unlike") ||
    l.includes("like this video") ||
    l.includes("remove from liked") ||
    l.includes("save to") ||
    l.includes("saved to")
  );
}

function findYoutubeLikeButton(root: ParentNode = document): HTMLButtonElement | null {
  for (const selector of sel.like) {
    try {
      const nodes = root.querySelectorAll<HTMLButtonElement>(selector);
      for (const node of nodes) {
        const label = node.getAttribute("aria-label") ?? "";
        if (label && !isYoutubeLikeLabel(label)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return node;
      }
    } catch {
      /* invalid selector */
    }
  }

  const meta = root.querySelector("ytd-watch-metadata");
  if (meta) {
    for (const btn of meta.querySelectorAll<HTMLButtonElement>("button")) {
      const label = btn.getAttribute("aria-label") ?? "";
      if (!isYoutubeLikeLabel(label)) continue;
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return btn;
    }
  }
  return null;
}

function readYoutubeLiked(root: ParentNode = document): boolean {
  const btn = findYoutubeLikeButton(root);
  if (!btn) return false;
  const label = btn.getAttribute("aria-label")?.toLowerCase() ?? "";
  return (
    btn.getAttribute("aria-pressed") === "true" ||
    label.startsWith("unlike") ||
    label.includes("remove from liked") ||
    label.includes("saved to")
  );
}

function readDomArtwork(videoId: string): string | undefined {
  const linkThumb = readAttr(sel.thumbnail, "href");
  if (linkThumb) return linkThumb;
  const img = queryFirst<HTMLImageElement>(sel.thumbnail);
  const src = img?.src?.trim();
  if (src) return src;
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return readOgImage() || undefined;
}

export class YouTubeAdapter extends BridgeBackedAdapter {
  readonly platform: Platform = "youtube";
  readonly capabilities = YOUTUBE_CAPABILITIES;

  private youtubeExtrasBound = false;

  override isReady(): boolean {
    return isYoutubeMediaReady(getYoutubeVideo());
  }

  protected override readTrack(): TrackInfo | null {
    const video = getYoutubeVideo();
    if (!isYoutubeMediaReady(video)) return null;

    const videoId = readYoutubeVideoId();
    const fromScripts = parseYoutubeDetailsFromScripts();
    if (fromScripts?.videoId && videoId && fromScripts.videoId !== videoId) {
      clearYoutubePageCache();
    }
    const page =
      peekYoutubePageDetailsForVideo(videoId) ??
      (fromScripts?.videoId === videoId || !fromScripts?.videoId ? fromScripts : null);

    const ms = readMediaSession();
    const domTitle = readDomTitle();
    const pageTitle =
      page?.videoId === videoId && page.title
        ? cleanYoutubeTitle(page.title) || page.title
        : "";
    const title =
      (domTitle && domTitle !== "YouTube video" ? domTitle : "") ||
      ms.title ||
      pageTitle ||
      domTitle;
    const channel =
      readText(sel.channel) || ms.artist || page?.author || "YouTube";
    const thumbFromPage =
      page?.videoId === videoId && page.thumbnailUrl ? page.thumbnailUrl : undefined;
    const artwork =
      (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined) ||
      ms.artwork ||
      readDomArtwork(videoId) ||
      thumbFromPage;

    debugLog(
      "yt-track",
      videoId || "(no id)",
      title.slice(0, 48),
      channel.slice(0, 24),
      artwork?.includes("/vi/") ? artwork.split("/vi/")[1]?.slice(0, 11) : "",
    );

    return {
      platform: this.platform,
      title,
      artist: channel,
      artwork,
      duration: video.duration,
      currentTime: video.currentTime,
      volume: clamp(video.volume, 0, 1),
      isPlaying: !video.paused && !video.ended,
      liked: readYoutubeLiked(),
    };
  }

  protected override ensureObserver(): void {
    super.ensureObserver();
    if (this.youtubeExtrasBound) return;
    this.youtubeExtrasBound = true;

    bindYoutubePageBridge(this.cleanup, () => {
      this.lastHash = "";
      void this.getTrackInfo().then((t) => this.notify(t));
    });

    let lastHref = location.href;
    let lastVideoId = readYoutubeVideoId();

    const onVideoChange = () => {
      clearYoutubePageCache();
      requestYoutubePageDetails();
      this.lastHash = "";
      void sendBridgeCommand(this.platform, { type: "READ_YOUTUBE_DETAILS" });
      const bump = () => void this.getTrackInfo().then((t) => this.notify(t));
      bump();
      window.setTimeout(bump, 150);
      window.setTimeout(bump, 500);
      window.setTimeout(bump, 1200);
    };

    const checkNavigation = () => {
      const href = location.href;
      const videoId = readYoutubeVideoId();
      if (href === lastHref && videoId === lastVideoId) return;
      lastHref = href;
      lastVideoId = videoId;
      onVideoChange();
    };

    const navObserver = new MutationObserver(checkNavigation);
    navObserver.observe(document.body, { childList: true, subtree: true });
    this.cleanup.add(() => navObserver.disconnect());

    const bindVideo = () => {
      const v = getYoutubeVideo();
      if (!v || v.dataset.songsphereBound === "1") return;
      v.dataset.songsphereBound = "1";
      for (const evt of ["loadeddata", "emptied", "loadedmetadata", "loadstart"] as const) {
        v.addEventListener(evt, onVideoChange);
        this.cleanup.add(() => v.removeEventListener(evt, onVideoChange));
      }
    };

    bindVideo();
    const videoObserver = new MutationObserver(() => {
      bindVideo();
      checkNavigation();
    });
    videoObserver.observe(document.body, { childList: true, subtree: true });
    this.cleanup.add(() => videoObserver.disconnect());

    const metaRoot = document.querySelector("ytd-watch-metadata");
    if (metaRoot) {
      const metaObserver = new MutationObserver(() => onVideoChange());
      metaObserver.observe(metaRoot, { childList: true, subtree: true, characterData: true });
      this.cleanup.add(() => metaObserver.disconnect());
    }

    const playerEl = queryFirst(sel.playerVideoId);
    if (playerEl) {
      const playerObserver = new MutationObserver(checkNavigation);
      playerObserver.observe(playerEl, {
        attributes: true,
        attributeFilter: ["video-id"],
      });
      this.cleanup.add(() => playerObserver.disconnect());
    }

    window.addEventListener("yt-navigate-finish", onVideoChange);
    this.cleanup.add(() => window.removeEventListener("yt-navigate-finish", onVideoChange));
    window.addEventListener("popstate", checkNavigation);
    this.cleanup.add(() => window.removeEventListener("popstate", checkNavigation));
  }

  private refreshTrackAfterSkip(): void {
    this.lastHash = "";
    clearYoutubePageCache();
    const bump = () => void this.getTrackInfo().then((t) => this.notify(t));
    bump();
    window.setTimeout(bump, 300);
    window.setTimeout(bump, 700);
    window.setTimeout(bump, 1400);
    window.setTimeout(bump, 2400);
  }

  override async next(): Promise<void> {
    await super.next();
    debugLog("youtube", "NEXT via bridge");
    this.refreshTrackAfterSkip();
  }

  override async previous(): Promise<void> {
    await super.previous();
    debugLog("youtube", "PREVIOUS via bridge");
    this.refreshTrackAfterSkip();
  }

  override async toggleLike(): Promise<void> {
    await super.toggleLike();
    debugLog("youtube", "toggleLike", readYoutubeLiked() ? "liked" : "not liked");
    window.setTimeout(() => {
      void this.getTrackInfo().then((t) => this.notify(t));
    }, 350);
  }
}
