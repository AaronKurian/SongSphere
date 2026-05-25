# SongSphere layout

```
src/
  entrypoints/          # WXT shells only (thin re-exports)
  popup/                # UI, store, artwork
  background/           # registry, hydration, messaging, storage
  isolated/             # content scripts: reads, observers, adapters
  main/                 # MAIN-world mutation runtime
  shared/               # protocol, bridge client, types, constants, utils
```

## Dependency rules

- `popup` → `shared`, `background` (via messaging)
- `background` → `shared`
- `isolated` → `shared`
- `main` → `shared`, `isolated/adapters/selectors` (DOM selectors only)
- No `main` → `popup` / `background` / `isolated` adapters (except selectors)

## Worlds

| World | Owns |
|-------|------|
| Isolated | `readTrack`, observers orchestration, bridge client |
| MAIN | `songsphere-main-runtime.js`, command executors, DOM mutations |
