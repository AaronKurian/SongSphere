import { defineContentScript } from "wxt/utils/define-content-script";
import { YouTubeAdapter } from "~/isolated/adapters/youtube";
import { PLATFORMS } from "~/shared/constants";
import { bootstrapContentPlatform } from "~/isolated/bootstrap";

export default defineContentScript({
  matches: PLATFORMS.youtube.matches,
  excludeMatches: PLATFORMS.youtube.excludeMatches,
  runAt: "document_start",
  async main() {
    return bootstrapContentPlatform("youtube-cs", "youtube", () => new YouTubeAdapter());
  },
});
