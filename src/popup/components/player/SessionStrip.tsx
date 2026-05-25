import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDevTelemetryEnabled } from "~/shared/dev-mode";
import { computeWindow, RENDER_RADIUS } from "~/background/session";
import { sessionPillLabel, sessionPillTitle } from "~/background/session";
import { runtimeTelemetry } from "~/shared/telemetry";
import { cn } from "~/shared/utils";
import { SessionPill } from "~/popup/components/player/SessionPill";
import type { PlayerSession } from "~/shared/types/session";

interface SessionStripProps {
  sessions: PlayerSession[];
  navigationOrder?: number[];
  selectedSessionId: number | null;
  disabled?: boolean;
  onSelect: (tabId: number) => void;
  onPreload: (tabId: number) => void;
  className?: string;
}

export function SessionStrip({
  sessions,
  navigationOrder,
  selectedSessionId,
  disabled,
  onSelect,
  onPreload,
  className,
}: SessionStripProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusTabId, setFocusTabId] = useState<number | null>(selectedSessionId);

  const handleSelect = useCallback((tabId: number) => onSelect(tabId), [onSelect]);
  const handlePreload = useCallback((tabId: number) => onPreload(tabId), [onPreload]);

  useEffect(() => {
    setFocusTabId(selectedSessionId);
  }, [selectedSessionId]);

  useEffect(() => {
    if (isDevTelemetryEnabled()) runtimeTelemetry.recordRenderPass();
  });

  const { visible, hiddenBefore, hiddenAfter, startIndex } = useMemo(() => {
    if (!sessions.length) {
      return { visible: [] as PlayerSession[], hiddenBefore: 0, hiddenAfter: 0, startIndex: 0 };
    }
    const centerIdx = sessions.findIndex((s) => s.tabId === selectedSessionId);
    const idx = centerIdx >= 0 ? centerIdx : 0;
    const { start, end } = computeWindow(idx, sessions.length, RENDER_RADIUS);
    return {
      visible: sessions.slice(start, end),
      hiddenBefore: start,
      hiddenAfter: sessions.length - end,
      startIndex: start,
    };
  }, [sessions, selectedSessionId]);

  const pillData = useMemo(
    () =>
      visible.map((session) => ({
        session,
        label: sessionPillLabel(session),
        tooltip: sessionPillTitle(session),
      })),
    [visible],
  );

  const navSessions = useMemo(() => {
    if (navigationOrder?.length) {
      const byId = new Map(sessions.map((s) => [s.tabId, s]));
      return navigationOrder
        .map((id) => byId.get(id))
        .filter((s): s is PlayerSession => s !== undefined);
    }
    return [...sessions].sort((a, b) => a.tabId - b.tabId);
  }, [sessions, navigationOrder]);

  const moveSelection = useCallback(
    (delta: number) => {
      if (!navSessions.length || disabled) return;
      const currentIdx = navSessions.findIndex(
        (s) => s.tabId === (focusTabId ?? selectedSessionId),
      );
      const from = currentIdx >= 0 ? currentIdx : 0;
      const next = Math.max(0, Math.min(navSessions.length - 1, from + delta));
      const tabId = navSessions[next]!.tabId;
      setFocusTabId(tabId);
      onSelect(tabId);
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelector<HTMLButtonElement>(`[data-tab-id="${tabId}"]`)
          ?.focus();
      });
    },
    [navSessions, focusTabId, selectedSessionId, disabled, onSelect],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        const tabId = navSessions[0]?.tabId;
        if (tabId !== undefined) {
          setFocusTabId(tabId);
          onSelect(tabId);
        }
      } else if (e.key === "End") {
        e.preventDefault();
        const tabId = navSessions[navSessions.length - 1]?.tabId;
        if (tabId !== undefined) {
          setFocusTabId(tabId);
          onSelect(tabId);
        }
      }
    },
    [disabled, moveSelection, navSessions, onSelect],
  );

  if (!sessions.length) return null;

  return (
    <div
      ref={listRef}
      className={cn(
        "flex items-center justify-center gap-1.5 overflow-x-hidden",
        className,
      )}
      role="tablist"
      aria-label="Media sessions"
      onKeyDown={onKeyDown}
    >
      {hiddenBefore > 0 && (
        <span
          className="shrink-0 px-1 text-[10px] tabular-nums text-text-muted"
          aria-hidden
        >
          +{hiddenBefore}
        </span>
      )}
      {pillData.map(({ session, label, tooltip }, i) => (
        <SessionPill
          key={session.tabId}
          session={session}
          selected={session.tabId === selectedSessionId}
          tabIndex={
            session.tabId === (focusTabId ?? selectedSessionId) ? 0 : -1
          }
          disabled={disabled}
          label={label}
          tooltip={tooltip}
          onSelect={handleSelect}
          onPreload={handlePreload}
          ariaPosInset={startIndex + i + 1}
          ariaSetSize={sessions.length}
        />
      ))}
      {hiddenAfter > 0 && (
        <span
          className="shrink-0 px-1 text-[10px] tabular-nums text-text-muted"
          aria-hidden
        >
          +{hiddenAfter}
        </span>
      )}
    </div>
  );
}
