/* MAIN runtime mutation executors for Spotify Web Player. */
import type { MainWorldCommand } from "~/shared/protocol";
import { spotifySelectors as sel } from "~/isolated/adapters/selectors/spotify";
import { clickFirst, getActiveMediaElement, queryFirst, setMediaTime } from "~/main/dom";

function playerRoot(): ParentNode {
  return queryFirst(sel.nowPlayingBar) ?? document;
}

function isPlayingFromAria(root: ParentNode = playerRoot()): boolean {
  const el = queryFirst<HTMLButtonElement>(sel.playPause, root);
  if (el) return (el.getAttribute("aria-label")?.toLowerCase() ?? "").includes("pause");
  const media = getActiveMediaElement();
  return media ? !media.paused : false;
}

function clickLikeButton(root: ParentNode = playerRoot()): boolean {
  const btn = queryFirst<HTMLButtonElement>(sel.like, root);
  if (!btn) return false;
  btn.click();
  return true;
}

export async function executeSpotifyBridgeCommand(
  command: MainWorldCommand,
): Promise<unknown> {
  const root = playerRoot();
  switch (command.type) {
    case "PLAY":
      if (!isPlayingFromAria(root)) {
        if (!clickFirst(sel.playPause, root)) await getActiveMediaElement()?.play();
      }
      return null;
    case "PAUSE":
      if (isPlayingFromAria(root)) {
        if (!clickFirst(sel.playPause, root)) getActiveMediaElement()?.pause();
      }
      return null;
    case "PLAY_PAUSE":
      if (!clickFirst(sel.playPause, root)) {
        if (isPlayingFromAria(root)) await executeSpotifyBridgeCommand({ type: "PAUSE" });
        else await executeSpotifyBridgeCommand({ type: "PLAY" });
      }
      return null;
    case "NEXT":
      clickFirst(sel.next, root);
      return null;
    case "PREVIOUS":
      clickFirst(sel.previous, root);
      return null;
    case "SEEK":
      setMediaTime(command.position, sel.progressInput, root);
      return null;
    case "SET_VOLUME": {
      const media = getActiveMediaElement();
      if (media) {
        media.volume = Math.max(0, Math.min(1, command.volume));
      }
      return null;
    }
    case "LIKE":
      clickLikeButton(root);
      return null;
    default:
      return null;
  }
}
