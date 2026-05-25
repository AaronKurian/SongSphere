/** Spotify Web Player selectors — `data-testid` first, aria fallbacks. */

export const spotifySelectors = {
  nowPlayingBar: [
    "[data-testid='now-playing-bar']",
    "footer[data-testid='now-playing-bar']",
    ".main-nowPlayingBar-container",
  ],
  nowPlayingWidget: [
    "[data-testid='now-playing-widget']",
    ".main-nowPlayingWidget-nowPlaying",
  ],
  title: [
    "[data-testid='now-playing-widget'] [data-testid='context-item-link']",
    "[data-testid='context-item-info-title'] a",
    "[data-testid='context-item-info-title']",
  ],
  artist: [
    "[data-testid='now-playing-widget'] [data-testid='context-item-info-artist']",
    "[data-testid='context-item-info-artist'] a",
    "[data-testid='context-item-info-subtitles'] a",
  ],
  artwork: [
    "[data-testid='now-playing-widget'] [data-testid='cover-art-image']",
    "[data-testid='cover-art-image']",
    "[data-testid='now-playing-widget'] img",
  ],
  playPause: [
    "[data-testid='control-button-playpause']",
    "button[aria-label='Play']",
    "button[aria-label='Pause']",
  ],
  next: [
    "[data-testid='control-button-skip-forward']",
    "button[aria-label*='Next' i]",
  ],
  previous: [
    "[data-testid='control-button-skip-back']",
    "button[aria-label*='Previous' i]",
  ],
  like: [
    "[data-testid='add-button']",
    "[data-testid='remove-button']",
    "button.control-button-heart",
    ".control-button-heart",
    "button[aria-label^='Add to']",
    "button[aria-label^='Remove from']",
    "button[aria-label*='Save to Your Library' i]",
    "button[aria-label*='Remove from Your Library' i]",
  ],
  progressInput: ["[data-testid='playback-progressbar'] input[type='range']"],
} as const;
