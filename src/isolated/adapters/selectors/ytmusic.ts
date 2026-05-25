/** YouTube Music player-bar selectors - stable IDs with aria fallbacks. */

export const ytmusicSelectors = {
  playerBar: ["ytmusic-player-bar"],
  title: [
    "ytmusic-player-bar .title.ytmusic-player-bar",
    "ytmusic-player-bar yt-formatted-string.title",
    ".content-info-wrapper .title",
  ],
  artist: [
    "ytmusic-player-bar .byline.ytmusic-player-bar",
    "ytmusic-player-bar yt-formatted-string.byline",
    ".content-info-wrapper .byline",
  ],
  artwork: [
    "ytmusic-player-bar img.image",
    "ytmusic-player-bar img.thumbnail",
    "ytmusic-player-bar img",
  ],
  playPause: [
    "ytmusic-player-bar #play-pause-button",
    "tp-yt-paper-icon-button.play-pause-button",
    "button[aria-label='Play']",
    "button[aria-label='Pause']",
  ],
  next: [
    "ytmusic-player-bar .next-button",
    "tp-yt-paper-icon-button.next-button",
  ],
  previous: [
    "ytmusic-player-bar .previous-button",
    "tp-yt-paper-icon-button.previous-button",
  ],
  like: [
    "ytmusic-player-bar #button-shape-like button",
    "ytmusic-like-button-renderer #button-shape-like button",
    "ytmusic-like-button-renderer [aria-label*='like' i]",
  ],
  volumeSlider: ["ytmusic-player-bar #volume-slider", "#volume-slider"],
  volumeInput: [
    "ytmusic-player-bar #volume-slider input[type='range']",
    "#volume-slider input[type='range']",
  ],
  media: ["ytmusic-player-bar video", "ytmusic-player-bar audio", "video", "audio"],
} as const;
