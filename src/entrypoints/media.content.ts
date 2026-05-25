import { defineContentScript } from "wxt/utils/define-content-script";
import { MediaSessionAdapter } from "~/isolated/adapters/generic";
import { isKnownMusicHost, PLATFORMS } from "~/shared/constants";
import { bootstrapContentPlatform } from "~/isolated/bootstrap";

export default defineContentScript({
  matches: PLATFORMS.generic.matches,
  excludeMatches: PLATFORMS.generic.excludeMatches,
  runAt: "document_start",
  async main() {
    if (isKnownMusicHost(location.href)) return;
    return bootstrapContentPlatform("media-cs", "generic", () => new MediaSessionAdapter());
  },
});
