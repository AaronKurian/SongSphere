import { memo, useCallback } from "react";
import { PLATFORMS } from "~/shared/constants";
import { cacheArtworkUrl } from "~/popup/artwork";
import { cn } from "~/shared/utils";
import type { PlayerSession } from "~/shared/types/session";

export interface SessionPillProps {
  session: PlayerSession;
  selected: boolean;
  tabIndex?: number;
  disabled?: boolean;
  label: string;
  tooltip: string;
  ariaPosInset?: number;
  ariaSetSize?: number;
  onSelect: (tabId: number) => void;
  onPreload: (tabId: number) => void;
}

function SessionPillInner({
  session,
  selected,
  tabIndex = selected ? 0 : -1,
  disabled,
  label,
  tooltip,
  ariaPosInset,
  ariaSetSize,
  onSelect,
  onPreload,
}: SessionPillProps) {
  const meta = PLATFORMS[session.platform];
  const tabId = session.tabId;
  const artwork = session.snapshot.track?.artwork;

  const handleClick = useCallback(() => onSelect(tabId), [onSelect, tabId]);
  const handleEnter = useCallback(() => {
    onPreload(tabId);
    cacheArtworkUrl(artwork);
  }, [onPreload, tabId, artwork]);

  return (
    <button
      type="button"
      role="tab"
      id={`session-tab-${tabId}`}
      data-tab-id={tabId}
      aria-selected={selected}
      aria-controls="player-panel"
      aria-label={tooltip}
      aria-posinset={ariaPosInset}
      aria-setsize={ariaSetSize}
      tabIndex={tabIndex}
      disabled={disabled}
      title={tooltip}
      onClick={handleClick}
      onMouseEnter={handleEnter}
      onFocus={handleEnter}
      className={cn(
        "inline-flex max-w-[7.5rem] shrink-0 items-center gap-1 rounded-full py-1 pl-1 pr-2 text-[10px] font-medium transition-colors focus-ring",
        selected
          ? "bg-[var(--platform-accent-muted)] text-text-primary ring-1 ring-[var(--platform-accent-soft)]"
          : "bg-white/5 text-text-secondary hover:bg-white/10",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {session.favicon ? (
        <img
          src={session.favicon}
          alt=""
          className="h-4 w-4 shrink-0 rounded-full object-cover"
          draggable={false}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "mx-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
            session.playing ? "bg-emerald-400" : "bg-white/25",
          )}
          style={selected ? { backgroundColor: meta.accent } : undefined}
        />
      )}
      <span className="truncate normal-case tracking-normal">{label}</span>
    </button>
  );
}

function pillPropsEqual(prev: SessionPillProps, next: SessionPillProps): boolean {
  return (
    prev.selected === next.selected &&
    prev.tabIndex === next.tabIndex &&
    prev.disabled === next.disabled &&
    prev.ariaPosInset === next.ariaPosInset &&
    prev.ariaSetSize === next.ariaSetSize &&
    prev.label === next.label &&
    prev.tooltip === next.tooltip &&
    prev.onSelect === next.onSelect &&
    prev.onPreload === next.onPreload &&
    prev.session.tabId === next.session.tabId &&
    prev.session.platform === next.session.platform &&
    prev.session.hydration === next.session.hydration &&
    prev.session.playing === next.session.playing &&
    prev.session.favicon === next.session.favicon &&
    prev.session.title === next.session.title &&
    prev.session.snapshot.updatedAt === next.session.snapshot.updatedAt &&
    prev.session.snapshot.track?.title === next.session.snapshot.track?.title &&
    prev.session.snapshot.track?.isPlaying === next.session.snapshot.track?.isPlaying
  );
}

export const SessionPill = memo(SessionPillInner, pillPropsEqual);
