# Store listing assets

## Short description (132 chars)

Control Spotify, YouTube Music, YouTube and more from one popup - multi-tab sessions, keyboard shortcuts, no audio leaves your browser.

## Full description

SongSphere is a universal media controller for your browser. See every playing tab in a compact session strip, switch instantly and control playback without hunting for the right window.

**Supported players**

- Spotify (open.spotify.com)
- YouTube Music
- YouTube (watch pages with active video)
- Generic HTML5 / MediaSession sites

**Features**

- Multi-session strip with smart labels and platform accents
- Play, pause, seek, volume and like where the platform allows
- Keyboard shortcuts (Alt+Shift+P / arrows / L)
- Lightweight sync - metadata only, no streaming through SongSphere

**Privacy**

All state stays on your device. See [PRIVACY.md](../PRIVACY.md).

## Permissions (user-facing)

SongSphere needs access to supported music sites so it can read now-playing info and send play/pause commands. It does not upload your listening history.

## Screenshots checklist

Capture at 1280×800 or store-required sizes:

1. Popup with 3+ sessions in the strip and now playing
2. Spotify session selected with album art
3. Empty state / onboarding
4. YouTube Music session
5. Keyboard shortcuts hint (optional overlay in Figma)

Place files in `docs/store/screenshots/` before submission.

## Promo tile / marquee

- Source: `assets/songsphere.png` (1024×1024)
- Regenerate icons: `python scripts/gen-icons.py`

## Firefox AMO

AMO add-on ID is set in `wxt.config.ts` as `songsphere@aaron.dev` (must match addons.mozilla.org). `data_collection_permissions` is declared with empty `required` and `optional` arrays (no data collection).

## Chrome Web Store

Build: `npm run zip` → upload `.output/*-mv3.zip`.
