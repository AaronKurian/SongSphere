import { defineContentScript } from "wxt/utils/define-content-script";
import { YTMusicAdapter } from "~/isolated/adapters/ytmusic";
import { PLATFORMS } from "~/shared/constants";
import { bootstrapContentPlatform } from "~/isolated/bootstrap";

export default defineContentScript({
  matches: PLATFORMS.ytmusic.matches,
  runAt: "document_start",
  async main() {
    return bootstrapContentPlatform("ytmusic-cs", "ytmusic", () => new YTMusicAdapter());
  },
});
