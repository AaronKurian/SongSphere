# SongSphere Privacy

SongSphere is a browser extension that controls media tabs you already have open. It does not operate a backend service and does not sell data.

## What stays on your device

- **Session metadata** (titles, artists, artwork URLs, playback state) read from supported tabs
- **Your selected session** and strip order in extension storage (`chrome.storage.session` / `browser.storage.local`)
- **Cached artwork blobs** in popup memory while the popup is open (revoked on close)

## What SongSphere accesses

| Permission | Why |
|------------|-----|
| `tabs` | Discover music tabs and focus the active player |
| `activeTab` | Interact with the tab you are controlling |
| `scripting` | Inject platform content scripts on supported sites |
| `storage` | Persist session strip and preferences locally |
| `alarms` | Periodic resync when the popup is closed |
| Host permissions | Read now-playing metadata from Spotify, YouTube, YouTube Music, and generic media pages |

SongSphere **does not** record audio, capture microphone input, or transmit playback data to SongSphere servers.

## Third parties

Metadata and commands go only between the extension and the websites you open (Spotify, YouTube, etc.), under those sites’ own privacy policies.

## Telemetry

SongSphere ships **no** product analytics. An optional hidden dev overlay (`localStorage songsphere:dev=1`) shows local counters for engineering only.

## Contact

For privacy questions about this open-source project, open an issue in the project repository.
