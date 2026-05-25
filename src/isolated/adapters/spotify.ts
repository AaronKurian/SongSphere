import { BridgeBackedAdapter } from "~/isolated/adapters/bridge-backed";
import {
  getActiveMediaElement,
  queryFirst,
  readMediaSession,
  readText,
  validateSelectorMap,
} from "~/isolated/media";
import { SPOTIFY_CAPABILITIES } from "~/shared/types/adapter";
import type { AdapterCapabilities } from "~/shared/types/adapter";
import type { Platform, TrackInfo } from "~/shared/types/player";
import { spotifySelectors as sel } from "~/isolated/adapters/selectors/spotify";

function playerRoot(): ParentNode {
  return (
    queryFirst(sel.nowPlayingWidget) ??
    queryFirst(sel.nowPlayingBar) ??
    document
  );
}

function findLikeButton(root: ParentNode = playerRoot()): HTMLButtonElement | null {
  for (const selector of sel.like) {
    try {
      const nodes = root.querySelectorAll<HTMLButtonElement>(selector);
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return node;
      }
    } catch {
      /* invalid selector */
    }
  }
  return null;
}

function readSpotifyLiked(root: ParentNode = playerRoot()): boolean {
  const btn = findLikeButton(root);
  if (!btn) return false;
  const label = btn.getAttribute("aria-label")?.toLowerCase() ?? "";
  return (
    btn.getAttribute("aria-checked") === "true" ||
    btn.getAttribute("aria-pressed") === "true" ||
    label.startsWith("remove from") ||
    label.includes("remove from your library") ||
    label.startsWith("unlike")
  );
}

export class SpotifyAdapter extends BridgeBackedAdapter {
  readonly platform: Platform = "spotify";

  get capabilities(): AdapterCapabilities {
    return SPOTIFY_CAPABILITIES;
  }

  override isReady(): boolean {
    return !!queryFirst(sel.nowPlayingBar) || !!readMediaSession().title;
  }

  protected override readTrack(): TrackInfo | null {
    const root = playerRoot();
    const ms = readMediaSession();
    const domReady = !!queryFirst(sel.nowPlayingBar, document) || !!queryFirst(sel.nowPlayingWidget, document);
    const title = (domReady ? readText(sel.title) : "") || ms.title || "";
    const artist = (domReady ? readText(sel.artist) : "") || ms.artist || "";
    if (!title && !artist) return null;

    const artwork =
      queryFirst<HTMLImageElement>(sel.artwork)?.src || ms.artwork || undefined;

    const playPause = queryFirst<HTMLButtonElement>(sel.playPause);
    const media = getActiveMediaElement();
    const isPlaying = playPause
      ? (playPause.getAttribute("aria-label")?.toLowerCase() ?? "").includes("pause")
      : media
        ? !media.paused
        : false;

    const liked = readSpotifyLiked(root);

    const progress = queryFirst<HTMLInputElement>(sel.progressInput);
    const currentTime = progress && Number.isFinite(Number(progress.value))
      ? Number(progress.value)
      : media?.currentTime;
    const maxAttr = Number(progress?.getAttribute("max"));
    const duration =
      Number.isFinite(maxAttr) && maxAttr > 0 ? maxAttr : media?.duration;

    return {
      platform: this.platform,
      title,
      artist,
      artwork,
      isPlaying,
      liked,
      currentTime,
      duration,
    };
  }

  override validateSelectors(): Record<string, boolean> {
    return validateSelectorMap(sel);
  }

  override async setVolume(_volume: number): Promise<void> {
    /* Spotify volume unsupported - use Spotify's own player controls. */
  }

  override async toggleLike(): Promise<void> {
    await super.toggleLike();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const track = await this.readTrack();
    if (track) this.notify(track);
  }
}
