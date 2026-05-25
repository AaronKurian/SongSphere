import { useMemo } from "react";
import { cn } from "~/shared/utils";
import type { PlayerSession } from "~/shared/types/session";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BottomBarProps {
  sessions: PlayerSession[];
  navigationOrder?: number[];
  selectedSessionId: number | null;
  disabled?: boolean;
  onSelect: (tabId: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function BottomBar({
  sessions,
  navigationOrder,
  selectedSessionId,
  disabled,
  onSelect,
  onPrevious,
  onNext,
}: BottomBarProps) {
  const ordered = useMemo(() => {
    if (navigationOrder?.length) {
      const byId = new Map(sessions.map((s) => [s.tabId, s]));
      return navigationOrder
        .map((id) => byId.get(id))
        .filter((s): s is PlayerSession => s !== undefined);
    }
    return [...sessions].sort((a, b) => a.tabId - b.tabId);
  }, [sessions, navigationOrder]);

  if (!ordered.length) return null;

  const canNav = ordered.length > 1 && !disabled;

  return (
    <div className="flex items-center justify-between border-none p-1">
      <button
        type="button"
        aria-label="Previous session"
        disabled={!canNav}
        onClick={onPrevious}
        className={cn(
          "focus-ring flex h-7 w-7 items-center justify-center rounded-md border-none text-[#444455] transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-35",
        )}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2.25} />
      </button>

      <div
        className="flex flex-1 items-center justify-center gap-[5px] px-2"
        role="tablist"
        aria-label="Media sessions"
      >
        {ordered.map((session) => {
          const active = session.tabId === selectedSessionId;
          return (
            <button
              key={session.tabId}
              id={`session-tab-${session.tabId}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="player-panel"
              aria-label={`Session ${session.tabId}`}
              disabled={disabled}
              onClick={() => onSelect(session.tabId)}
              className={cn(
                "focus-ring h-[7px] shrink-0 rounded-full transition-[width,background] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                active ? "w-4 bg-[var(--accent)]" : "w-[7px] bg-white/15",
                disabled && "pointer-events-none opacity-40",
              )}
            />
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Next session"
        disabled={!canNav}
        onClick={onNext}
        className={cn(
          "focus-ring flex h-7 w-7 items-center justify-center rounded-md border-none text-[#444455] transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-35",
        )}
      >
        <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
