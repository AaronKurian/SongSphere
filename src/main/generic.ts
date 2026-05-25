/* MAIN runtime mutation executors for generic HTML5 / MediaSession pages. */
import type { MainWorldCommand } from "~/shared/protocol";
import { clamp, dispatchMediaKey, getActiveMediaElement } from "~/main/dom";

export async function executeGenericBridgeCommand(
  command: MainWorldCommand,
): Promise<unknown> {
  switch (command.type) {
    case "PLAY": {
      const media = getActiveMediaElement();
      if (media?.paused) await media.play();
      return null;
    }
    case "PAUSE":
      getActiveMediaElement()?.pause();
      return null;
    case "PLAY_PAUSE": {
      const media = getActiveMediaElement();
      if (!media) return null;
      if (media.paused) await media.play();
      else media.pause();
      return null;
    }
    case "NEXT":
      dispatchMediaKey("MediaTrackNext");
      return null;
    case "PREVIOUS":
      dispatchMediaKey("MediaTrackPrevious");
      return null;
    case "SET_VOLUME": {
      const media = getActiveMediaElement();
      if (!media) return null;
      const v = clamp(command.volume, 0, 1);
      media.volume = v;
      media.muted = v === 0;
      return null;
    }
    case "SEEK": {
      const media = getActiveMediaElement();
      if (media) media.currentTime = command.position;
      return null;
    }
    default:
      return null;
  }
}
