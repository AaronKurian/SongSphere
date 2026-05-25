import { ExternalLink, RefreshCw } from "lucide-react";
import { IconButton } from "~/popup/components/common/IconButton";
import { LikeButton } from "~/popup/components/controls/LikeButton";
import { PlaybackControls } from "~/popup/components/controls/PlaybackControls";
import { VolumeSlider } from "~/popup/components/controls/VolumeSlider";
import { AlbumArt } from "~/popup/components/player/AlbumArt";
import { ProgressBar } from "~/popup/components/player/ProgressBar";
import { SessionHeader } from "~/popup/components/player/SessionHeader";
import { EmptyState } from "~/popup/components/player/EmptyState";
import { SessionStrip } from "~/popup/components/player/SessionStrip";
import { TrackInfo } from "~/popup/components/player/TrackInfo";
import { TelemetryOverlay } from "~/popup/components/dev/TelemetryOverlay";
import { useCallback, useEffect } from "react";
import { PLATFORMS } from "~/shared/constants";
import { ext } from "~/shared/browser";
import {
  platformAccentStyle,
  useArtworkPromotion,
  useArtworkUrl,
  usePlayer,
} from "./hooks";
import { usePlayerStore } from "./store";
import { connectionMessage, isDegraded } from "~/background/popup-port";
import { cn } from "~/shared/utils";

const LOGO = "/icon/48.png";

export function App() {
  const {
    track,
    platform,
    connection,
    capabilities,
    hydrated,
    loading,
    error,
    sessionIndex,
    sessionTotal,
    navDirection,
    refresh,
    sessions,
    selectedSessionId,
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
  const showEmpty = hydrated && !loading && sessionList.length === 0;
  const accentStyle = platformAccentStyle(platform);
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
  const progressUnit: "ms" | "s" = track?.platform === "spotify" ? "ms" : "s";
  const statusText =
    error || connectionMessage(connection) || (loading ? "Connecting…" : "");

  const slideClass =
    navDirection === 1
      ? "motion-safe:animate-slide-left"
      : navDirection === -1
        ? "motion-safe:animate-slide-right"
        : "motion-safe:animate-fade-in";

  const openPlatformTab = useCallback((url: string) => {
    void ext.tabs.create({ url, active: true });
  }, []);

  return (
    <div
      className="flex max-h-[600px] min-h-[480px] w-[360px] flex-col gap-3 overflow-y-auto bg-surface p-4 text-text-primary"
      style={accentStyle}
    >
      <TelemetryOverlay />
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={LOGO}
            alt=""
            width={28}
            height={28}
            draggable={false}
            className="h-7 w-7 shrink-0 rounded-lg object-cover motion-safe:shadow-glow"
          />
          <span className="truncate text-xs font-semibold tracking-wide">SongSphere</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="Refresh"
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => void refresh()}
            icon={
              <RefreshCw
                className={cn("h-4 w-4", loading && "motion-safe:animate-spin")}
                strokeWidth={2.25}
              />
            }
          />
          <IconButton
            label="Open player"
            size="sm"
            variant="ghost"
            onClick={() => void openPlayer()}
            icon={<ExternalLink className="h-4 w-4" strokeWidth={2.25} />}
          />
        </div>
      </header>

      {!showEmpty && (
        <SessionHeader
          platform={platform}
          sessionIndex={sessionIndex}
          sessionTotal={sessionTotal}
          disabled={loading || !hydrated}
          onPrevious={() => void selectPreviousSession()}
          onNext={() => void selectNextSession()}
        />
      )}

      {!showEmpty && (
        <SessionStrip
          sessions={sessions}
          navigationOrder={navigationOrder}
          selectedSessionId={selectedSessionId}
          disabled={loading || !hydrated}
          onSelect={handleSelectSession}
          onPreload={handlePreloadSession}
        />
      )}

      {showEmpty ? (
        <EmptyState
          className="flex-1"
          onOpenSpotify={() => openPlatformTab(PLATFORMS.spotify.playerUrl)}
          onOpenYTMusic={() => openPlatformTab(PLATFORMS.ytmusic.playerUrl)}
        />
      ) : (
      <main
        id="player-panel"
        key={`${platform ?? "none"}-${sessionIndex}`}
        role="tabpanel"
        aria-labelledby={
          selectedSessionId != null ? `session-tab-${selectedSessionId}` : undefined
        }
        className={cn(
          "flex flex-1 flex-col gap-4",
          slideClass,
          !hydrated && "opacity-60",
        )}
        aria-busy={loading || !hydrated}
      >
        <AlbumArt
          className="mx-auto h-40 w-40 shrink-0"
          src={artworkUrl}
          alt={track ? `${track.title} cover` : "No track"}
          isPlaying={!!track?.isPlaying}
        />

        <div className="flex items-start justify-between gap-3">
          <TrackInfo
            title={track?.title ?? ""}
            artist={track?.artist ?? ""}
            className="flex-1"
          />
          {capabilities.like && (
            <LikeButton
              liked={!!track?.liked}
              disabled={!hasTrack || degraded}
              onToggle={() => void toggleLike()}
            />
          )}
        </div>

        <ProgressBar
          currentTime={track?.currentTime}
          duration={track?.duration}
          unit={progressUnit}
          isPlaying={!!track?.isPlaying}
          seekable={capabilities.seek && hasTrack && !degraded}
          onSeek={(pos) => seek(pos)}
        />

        <PlaybackControls
          isPlaying={!!track?.isPlaying}
          disabled={!hasTrack || !capabilities.playPause || degraded}
          showNext={capabilities.next}
          showPrevious={capabilities.previous}
          onTogglePlay={() => void togglePlay()}
          onNext={() => void next()}
          onPrevious={() => void previous()}
        />

        {capabilities.volume && (
          <VolumeSlider
            value={track?.volume}
            disabled={!hasTrack || degraded}
            onChange={setVolume}
            onCommit={flushVolume}
          />
        )}
      </main>
      )}

      {statusText && (
        <footer
          className="min-h-[16px] text-center text-[10px] leading-tight"
          role="status"
          aria-live="polite"
        >
          <span
            className={error ? "text-rose-400/90" : "text-text-muted"}
            title={error ?? undefined}
          >
            {statusText}
          </span>
        </footer>
      )}
    </div>
  );
}

export default App;
