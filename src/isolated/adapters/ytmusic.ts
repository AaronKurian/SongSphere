import { BridgeBackedAdapter } from "~/isolated/adapters/bridge-backed";
import {
  getActiveMediaElement,
  queryFirst,
  queryRangeInContainer,
  readMediaSession,
  readText,
  readVolumeFromAriaSlider,
  readVolumeFromRange,
  validateSelectorMap,
} from "~/isolated/media";
import { clamp } from "~/shared/utils";
import { FULL_CAPABILITIES } from "~/shared/types/adapter";
import type { Platform, TrackInfo } from "~/shared/types/player";
import { ytmusicSelectors as sel } from "~/isolated/adapters/selectors/ytmusic";

function playerBarRoot(): ParentNode {
  return queryFirst(sel.playerBar) ?? document;
}

function readYtmVolume(root: ParentNode = playerBarRoot()): number | undefined {
  const fromAria = readVolumeFromAriaSlider(sel.volumeSlider, root);
  if (fromAria !== undefined) return fromAria;
  const range = queryRangeInContainer(sel.volumeSlider, root);
  if (range) {
    const max = Number(range.getAttribute("max")) || 100;
    const raw = Number(range.value);
    if (Number.isFinite(raw)) return clamp(raw / max, 0, 1);
  }
  const fromRange = readVolumeFromRange(sel.volumeInput, root);
  if (fromRange !== undefined) return fromRange;
  const media =
    queryFirst<HTMLMediaElement>(sel.media, root) ?? getActiveMediaElement();
  return media ? clamp(media.volume, 0, 1) : undefined;
}

export class YTMusicAdapter extends BridgeBackedAdapter {
  readonly platform: Platform = "ytmusic";
  readonly capabilities = FULL_CAPABILITIES;

  override isReady(): boolean {
    return !!queryFirst(sel.playerBar) || !!readMediaSession().title;
  }

  protected override readTrack(): TrackInfo | null {
    const root = playerBarRoot();
    const ms = readMediaSession();
    const domReady = !!queryFirst(sel.playerBar);
    const title = (domReady ? readText(sel.title) : "") || ms.title || "";
    const artist = (domReady ? readText(sel.artist) : "") || ms.artist || "";
    if (!title && !artist) return null;

    const artwork =
      queryFirst<HTMLImageElement>(sel.artwork)?.src || ms.artwork || undefined;

    const media =
      queryFirst<HTMLMediaElement>(sel.media, root) ?? getActiveMediaElement();
    const playPause = queryFirst<HTMLButtonElement>(sel.playPause, root);
    const label = (playPause?.getAttribute("aria-label") ?? playPause?.getAttribute("title") ?? "").toLowerCase();
    const isPlaying = media ? !media.paused && !media.ended : label.includes("pause");
    const currentTime = media?.currentTime;
    const duration = media && Number.isFinite(media.duration) ? media.duration : undefined;
    const volume = readYtmVolume(root);

    const likeBtn = queryFirst<HTMLButtonElement>(sel.like);
    const likeLabel = likeBtn?.getAttribute("aria-label")?.toLowerCase() ?? "";
    const liked = likeBtn?.getAttribute("aria-pressed") === "true" || likeLabel.startsWith("unlike");

    return {
      platform: this.platform,
      title,
      artist,
      artwork,
      isPlaying,
      liked,
      volume,
      currentTime,
      duration,
    };
  }

  override validateSelectors(): Record<string, boolean> {
    return validateSelectorMap(sel);
  }
}
