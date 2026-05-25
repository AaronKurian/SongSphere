import { BridgeBackedAdapter } from "~/isolated/adapters/bridge-backed";
import {
  getActiveMediaElement,
  readMediaSession,
  readMediaSessionPlaybackState,
} from "~/isolated/media";
import { clamp } from "~/shared/utils";
import { GENERIC_CAPABILITIES } from "~/shared/types/adapter";
import type { Platform, TrackInfo } from "~/shared/types/player";

export class MediaSessionAdapter extends BridgeBackedAdapter {
  readonly platform: Platform = "generic";
  readonly capabilities = GENERIC_CAPABILITIES;

  override isReady(): boolean {
    const ms = readMediaSession();
    return !!(ms.title || ms.artist) || !!getActiveMediaElement();
  }

  protected override readTrack(): TrackInfo | null {
    const ms = readMediaSession();
    const media = getActiveMediaElement();
    const title = ms.title || document.title || "";
    const artist = ms.artist || ms.album || "";
    if (!title && !artist && !media) return null;

    const sessionState = readMediaSessionPlaybackState();
    const isPlaying = media
      ? !media.paused && !media.ended
      : sessionState === "playing";

    return {
      platform: this.platform,
      title: title || "Unknown track",
      artist: artist || "Unknown artist",
      artwork: ms.artwork,
      isPlaying,
      volume: media ? clamp(media.volume, 0, 1) : undefined,
      currentTime: media?.currentTime,
      duration: media && Number.isFinite(media.duration) ? media.duration : undefined,
    };
  }
}
