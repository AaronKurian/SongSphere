import { defineContentScript } from "wxt/utils/define-content-script";
import { SpotifyAdapter } from "~/isolated/adapters/spotify";
import { PLATFORMS } from "~/shared/constants";
import { bootstrapContentPlatform } from "~/isolated/bootstrap";

export default defineContentScript({
  matches: PLATFORMS.spotify.matches,
  runAt: "document_start",
  async main() {
    return bootstrapContentPlatform("spotify-cs", "spotify", () => new SpotifyAdapter());
  },
});
