import { useCallback, useEffect } from "react";
import { PLATFORMS } from "~/shared/constants";
import { ext } from "~/shared/browser";
import { connectionMessage, isDegraded } from "~/background/popup-port";
import { AlbumArt } from "~/popup/components/player/AlbumArt";
import { ProgressBar } from "~/popup/components/player/ProgressBar";
import { EmptyState } from "~/popup/components/player/EmptyState";
import { LikeButton } from "~/popup/components/controls/LikeButton";
import { PlaybackControls } from "~/popup/components/controls/PlaybackControls";
import { VolumeSlider } from "~/popup/components/controls/VolumeSlider";
import { MarqueeText } from "~/popup/components/common/MarqueeText";
import { PopupHeader } from "~/popup/components/layout/PopupHeader";
import { BottomBar } from "~/popup/components/layout/BottomBar";
import { TelemetryOverlay } from "~/popup/components/dev/TelemetryOverlay";
import {
  platformAccentColor,
  platformAccentStyle,
  useArtworkPromotion,
  useArtworkUrl,
  usePlayer,
} from "./hooks";
import { usePlayerStore } from "./store";
import { cn } from "~/shared/utils";

export function App() {
  const {
    track,
    platform,
    connection,
    capabilities,
    hydrated,
    loading,
    error,
    selectedSessionId,
    refresh,
    sessions,
    navigationOrder,
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
  } = usePlayer();
  const dispose = usePlayerStore((s) => s.dispose);
  const stripOrder = usePlayerStore((s) => s.sessions.stripOrder);
  const sessionList = usePlayerStore((s) => s.sessions.sessions);
  const showEmpty = hydrated && sessionList.length === 0;
  const showPlayer = sessionList.length > 0;
  const showBoot = !hydrated && sessionList.length === 0;
  const accentStyle = platformAccentStyle(platform);
  const accent = platformAccentColor(platform);
  useArtworkPromotion(sessions, stripOrder, selectedSessionId, track?.artwork);
  const artworkUrl = useArtworkUrl(track?.artwork, { attach: true });

  useEffect(() => () => dispose(), [dispose]);

  const handleSelectSession = useCallback(
    (tabId: number) => void selectSession(tabId),
    [selectSession],
  );
  const handlePreloadSession = useCallback(
    (tabId: number) => void preloadSession(tabId),
    [preloadSession],
  );

  const hasTrack = !!track;
  const degraded = isDegraded(connection);
  const controlsDisabled = !hasTrack || degraded || loading || !hydrated;
  const progressUnit: "ms" | "s" = track?.platform === "spotify" ? "ms" : "s";
  const platformLabel = platform ? PLATFORMS[platform].label.toUpperCase() : "";
  const artistLine = track?.artist?.trim() || "-";

  const statusText =
    error ||
    (connection === "reconnecting"
      ? "Connection lost - retrying…"
      : connectionMessage(connection)) ||
    (loading ? "Connecting…" : "");

  const openPlatformTab = useCallback((url: string) => {
    void ext.tabs.create({ url, active: true });
  }, []);

  return (
    <div className="popup-shell" style={accentStyle}>
      <TelemetryOverlay />
      <div
        className="accent-line"
        style={{
          background: `linear-gradient(90deg, ${accent}cc, ${accent}44)`,
        }}
      />

      <PopupHeader
        platform={platform}
        loading={loading}
        onRefresh={() => void refresh()}
        onOpenPlayer={() => void openPlayer()}
      />

      {showBoot && (
        <div className="flex flex-1 items-center justify-center px-4 py-10 text-[11px] text-[var(--text-secondary)]">
          Connecting…
        </div>
      )}

      {showEmpty && (
        <EmptyState
          className="flex-1"
          onOpenSpotify={() => openPlatformTab(PLATFORMS.spotify.playerUrl)}
          onOpenYTMusic={() => openPlatformTab(PLATFORMS.ytmusic.playerUrl)}
        />
      )}

      {showPlayer && (
        <>
          <div
            key={selectedSessionId ?? "none"}
            className={cn(
              "flex gap-3.5 px-3.5 pb-0 pt-1 session-enter",
              (loading || !hydrated) && "opacity-45",
            )}
            id="player-panel"
            role="tabpanel"
            aria-labelledby={
              selectedSessionId != null ? `session-tab-${selectedSessionId}` : undefined
            }
            aria-busy={loading || !hydrated}
          >
            <div className="w-[120px] shrink-0">
              <AlbumArt
                src={artworkUrl}
                alt={track ? `${track.title} cover` : "No track"}
                isPlaying={!!track?.isPlaying}
                platform={platform}
              />
              <VolumeSlider
                value={track?.volume}
                visible={capabilities.volume}
                disabled={controlsDisabled}
                onChange={setVolume}
                onCommit={flushVolume}
              />
            </div>

            <div className="min-w-0 flex-1 pt-px">
              {platformLabel && (
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--accent)] opacity-90">
                  {platformLabel}
                </p>
              )}

              <div className="mb-[11px] flex items-end gap-1.5 leading-none">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <MarqueeText
                    text={track?.title ?? "Nothing playing"}
                    resetKey={`${selectedSessionId ?? 0}-${track?.title ?? ""}`}
                    className="text-[14.5px] font-bold leading-none tracking-[-0.025em] text-[var(--text-primary)]"
                  />
                  <MarqueeText
                    text={artistLine}
                    resetKey={`${selectedSessionId ?? 0}-${artistLine}`}
                    className="text-[11px] font-normal leading-none text-[var(--text-secondary)]"
                  />
                </div>
                {capabilities.like && (
                  <LikeButton
                    liked={!!track?.liked}
                    disabled={controlsDisabled}
                    onToggle={() => void toggleLike()}
                    className="shrink-0 self-end"
                  />
                )}
              </div>

              <ProgressBar
                currentTime={track?.currentTime}
                duration={track?.duration}
                unit={progressUnit}
                isPlaying={!!track?.isPlaying}
                seekable={capabilities.seek && hasTrack && !degraded}
                loading={loading && !hydrated}
                onSeek={(pos) => seek(pos)}
              />

              <PlaybackControls
                isPlaying={!!track?.isPlaying}
                disabled={!hasTrack || !capabilities.playPause || controlsDisabled}
                showNext={capabilities.next}
                showPrevious={capabilities.previous}
                onTogglePlay={() => void togglePlay()}
                onNext={() => void next()}
                onPrevious={() => void previous()}
              />
            </div>
          </div>

          <BottomBar
            sessions={sessionList}
            navigationOrder={navigationOrder}
            selectedSessionId={selectedSessionId}
            disabled={loading || !hydrated}
            onSelect={(tabId) => {
              handlePreloadSession(tabId);
              handleSelectSession(tabId);
            }}
            onPrevious={() => void selectPreviousSession()}
            onNext={() => void selectNextSession()}
          />
        </>
      )}

      {statusText && !showBoot && (
        <footer
          className="px-3 pb-2 pt-0 text-center text-[10px] leading-tight"
          role="status"
          aria-live="polite"
        >
          <span className={error || connection === "reconnecting" ? "text-[#ff4444]" : "text-[var(--text-muted)]"}>
            {statusText}
          </span>
        </footer>
      )}
    </div>
  );
}

export default App;
