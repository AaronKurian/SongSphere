# SongSphere

Universal multi-session media controller for the browser — Spotify, YouTube Music, YouTube, and generic HTML5 players.

Built with **WXT · React · TypeScript · Tailwind · Zustand** (Manifest V3).

## Features

- **Multi-session strip** — see and switch between every playing tab
- **Projection-based hydration** — full registry truth, tiered transport/render views
- **Incremental sync** — field-level patches with coalesced delta flushes
- Play / pause / seek / volume / like (per-platform capabilities)
- Global keyboard shortcuts (Alt+Shift+P / arrows / L)
- Chrome and Firefox builds

## Layout

```
src/
  adapters/          # Platform adapters + selectors/
  entrypoints/       # background, *.content.ts, popup/
  runtime/           # Core runtime (hydration, session, artwork, timing, …)
  types/
  constants.ts
  styles/
public/icon/         # Extension icons
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [PRIVACY.md](PRIVACY.md).

## Development

```bash
npm install
npm run dev
npm run build
npm run compile
```

Dev telemetry: `localStorage.setItem("songsphere:dev", "1")` in the popup console.

## License

MIT
