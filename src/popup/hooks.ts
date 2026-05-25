import { useEffect, useMemo } from "react";
import { getCapabilities, PLATFORMS } from "~/shared/constants";
import type { Platform } from "~/shared/types/player";
import type { CSSProperties } from "react";
import { usePlayerStore } from "./store";

const DEFAULT_ACCENT = "#7c5cff";

const ART_BG: Partial<Record<Platform, string>> = {
  spotify: "#061a08",
  ytmusic: "#1c0508",
  youtube: "#1a0800",
  generic: "#15151f",
};

export function platformAccentColor(platform: Platform | null): string {
  if (!platform) return DEFAULT_ACCENT;
  return PLATFORMS[platform].accent;
}

export function platformArtBackground(platform: Platform | null): string {
  if (!platform) return ART_BG.generic ?? "#15151f";
  return ART_BG[platform] ?? ART_BG.generic ?? "#15151f";
}

export function platformAccentStyle(platform: Platform | null): CSSProperties {
  const accent = platformAccentColor(platform);
  return {
    "--accent": accent,
    "--art-bg": platformArtBackground(platform),
  } as CSSProperties;
}

export function usePlayer() {
  const sessions = usePlayerStore((s) => s.sessions);
  const hydrated = usePlayerStore((s) => s.hydrated);
  const loading = usePlayerStore((s) => s.loading);
  const error = usePlayerStore((s) => s.error);
  const initialize = usePlayerStore((s) => s.initialize);
  const refresh = usePlayerStore((s) => s.refresh);
  const selectNextSession = usePlayerStore((s) => s.selectNextSession);
  const selectPreviousSession = usePlayerStore((s) => s.selectPreviousSession);
  const selectSession = usePlayerStore((s) => s.selectSession);
  const preloadSession = usePlayerStore((s) => s.preloadSession);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const flushVolume = usePlayerStore((s) => s.flushVolume);
  const seek = usePlayerStore((s) => s.seek);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const openPlayer = usePlayerStore((s) => s.openPlayer);

  const selected =
    sessions.sessions.find((s) => s.tabId === sessions.selectedSessionId) ?? null;
  const track = selected?.snapshot.track ?? null;
  const platform = selected?.platform ?? null;
  const capabilities = useMemo(() => {
    if (sessions.selectedSessionId != null) return sessions.capabilities;
    return platform ? getCapabilities(platform) : sessions.capabilities;
  }, [platform, sessions.capabilities, sessions.selectedSessionId]);
  useEffect(() => {
    void initialize();
  }, [initialize]);

  return {
    track,
    platform,
    connection: sessions.connection,
    capabilities,
    sessions: sessions.sessions,
    navigationOrder: sessions.navigationOrder,
    selectedSessionId: sessions.selectedSessionId,
    hydrated,
    tabId: sessions.selectedSessionId,
    loading: loading && !hydrated,
    error,
    refresh,
    selectNextSession,
    selectPreviousSession,
    selectSession,
    preloadSession,
    togglePlay,
    next,
    previous,
    setVolume,
    flushVolume,
    seek,
    toggleLike,
    openPlayer,
  };
}

export { useArtworkUrl, useArtworkPromotion } from "~/popup/artwork";
