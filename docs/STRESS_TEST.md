# Stress test checklist

Run before each store release. Enable dev telemetry for observability:

```js
localStorage.setItem("songsphere:dev", "1");
```

Reopen the popup — counters appear bottom-right.

## Session scale (20+ tabs)

1. Open 20+ tabs across Spotify, YTM, YouTube, and generic media pages.
2. Start playback on 5+ tabs simultaneously.
3. Open popup — strip should render ±4 pills with overflow counts.
4. Rapidly arrow-key through sessions; verify no hydration thrash (promotions stable in dev overlay).
5. Leave popup open 10 minutes — memory should plateau (patch ratio high, flush rate modest).

## Carousel / selection

1. Rapid-click session pills for 30s.
2. Use Alt+Shift+Left/Right — selection and strip order stay coherent.
3. Dev overlay: `Δ flushes` should coalesce (not 1:1 with clicks).

## Popup reopen spam

1. Open/close popup every 2s for 1 minute.
2. Artwork cache hits should recover; no runaway blob URLs (check DevTools Memory on popup).
3. State matches background after reopen (`GET_SESSIONS`).

## YouTube multi-tab

1. Three YouTube watch tabs with active video.
2. Confirm only ready sessions register; switching updates selected controls.

## Browser sleep / wake

1. Play Spotify, suspend laptop 5 minutes, resume.
2. Background heartbeat resyncs; popup shows current track within one refresh.

## Firefox long session

1. `npm run dev:firefox` — leave playing overnight (or 4+ hours).
2. Compare `about:memory` before/after; extension should not grow unbounded.
3. Artwork cache cap: 36 entries (see `browser-flags.ts`).

## Regression gates

- [ ] `npm run compile`
- [ ] `npm run build` and `npm run build:firefox`
- [ ] No console errors in background service worker
- [ ] Empty state shows when no sessions
- [ ] Reduced motion: OS setting disables slide animations
