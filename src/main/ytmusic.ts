import {
  clickFirst,
  getActiveMediaElement,
  queryFirst,
  queryRangeInContainer,
  writeVolumeToInput,
  writeVolumeToRange,
} from "~/isolated/media";
import { clamp } from "~/shared/utils";
import type { MainWorldCommand } from "~/shared/protocol";
import { ytmusicSelectors as sel } from "~/isolated/adapters/selectors/ytmusic";

function playerBarRoot(): ParentNode {
  return queryFirst(sel.playerBar) ?? document;
}

function isPlayingFromAria(root: ParentNode = playerBarRoot()): boolean {
  const btn = queryFirst<HTMLButtonElement>(sel.playPause, root);
  const label = (btn?.getAttribute("aria-label") ?? btn?.getAttribute("title") ?? "").toLowerCase();
  return label.includes("pause");
}

function writeYtmVolume(volume: number, root: ParentNode = playerBarRoot()): void {
  const clamped = clamp(volume, 0, 1);
  const range = queryRangeInContainer(sel.volumeSlider, root);
  if (range) {
    writeVolumeToInput(range, clamped);
  } else {
    writeVolumeToRange(sel.volumeInput, clamped, root);
  }
  const media =
    queryFirst<HTMLMediaElement>(sel.media, root) ?? getActiveMediaElement();
  if (media) {
    media.volume = clamped;
    media.muted = clamped === 0;
  }
}

export async function executeYtmusicBridgeCommand(
  command: MainWorldCommand,
): Promise<unknown> {
  const root = playerBarRoot();

  switch (command.type) {
    case "PLAY": {
      const media = queryFirst<HTMLMediaElement>(sel.media, root) ?? getActiveMediaElement();
      if (media?.paused) {
        try {
          await media.play();
          return null;
        } catch {
          /* fall through */
        }
      }
      if (!isPlayingFromAria(root)) clickFirst(sel.playPause, root);
      return null;
    }
    case "PAUSE": {
      const media = queryFirst<HTMLMediaElement>(sel.media, root) ?? getActiveMediaElement();
      if (media && !media.paused) {
        media.pause();
        return null;
      }
      if (isPlayingFromAria(root)) clickFirst(sel.playPause, root);
      return null;
    }
    case "PLAY_PAUSE": {
      if (!clickFirst(sel.playPause, root)) {
        if (isPlayingFromAria(root)) await executeYtmusicBridgeCommand({ type: "PAUSE" });
        else await executeYtmusicBridgeCommand({ type: "PLAY" });
      }
      return null;
    }
    case "NEXT":
      clickFirst(sel.next, root);
      return null;
    case "PREVIOUS":
      clickFirst(sel.previous, root);
      return null;
    case "SET_VOLUME":
      writeYtmVolume(command.volume, root);
      return null;
    case "SEEK": {
      const media = queryFirst<HTMLMediaElement>(sel.media, root) ?? getActiveMediaElement();
      if (media) media.currentTime = command.position;
      return null;
    }
    case "LIKE":
      clickFirst(sel.like, root);
      return null;
    case "DISLIKE":
    case "SHUFFLE":
    case "REPEAT":
    case "READ_YOUTUBE_DETAILS":
      return null;
    default:
      return null;
  }
}
