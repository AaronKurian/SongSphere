import { useEffect, useRef, useState } from "react";
import { cn, clamp, formatTime } from "~/shared/utils";

interface ProgressBarProps {
  currentTime?: number;
  duration?: number;
  unit?: "ms" | "s";
  isPlaying?: boolean;
  seekable?: boolean;
  onSeek?: (position: number) => void;
  className?: string;
}

export function ProgressBar({
  currentTime,
  duration,
  unit = "s",
  isPlaying = false,
  seekable,
  onSeek,
  className,
}: ProgressBarProps) {
  const toSeconds = (v: number) => (unit === "ms" ? v / 1000 : v);
  const durationSec = duration ? toSeconds(duration) : 0;
  const serverPct =
    currentTime != null && durationSec > 0
      ? clamp((toSeconds(currentTime) / durationSec) * 100, 0, 100)
      : 0;

  const [displayPct, setDisplayPct] = useState(serverPct);
  const anchorRef = useRef({ pct: serverPct, at: performance.now() });
  const rafRef = useRef(0);

  useEffect(() => {
    anchorRef.current = { pct: serverPct, at: performance.now() };
    const start = displayPct;
    const delta = serverPct - start;
    if (Math.abs(delta) < 0.4) {
      setDisplayPct(serverPct);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = clamp((now - t0) / 280, 0, 1);
      setDisplayPct(start + delta * t);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [serverPct]);

  useEffect(() => {
    if (!isPlaying || durationSec <= 0) return;
    const tick = () => {
      const elapsed = (performance.now() - anchorRef.current.at) / 1000;
      const drift = anchorRef.current.pct + (elapsed / durationSec) * 100;
      const snapped = Math.abs(drift - serverPct) > 2 ? serverPct : drift;
      setDisplayPct(clamp(snapped, 0, 100));
    };
    const id = window.setInterval(tick, 500);
    return () => clearInterval(id);
  }, [isPlaying, durationSec, serverPct]);

  const seekFromClientX = (el: HTMLElement, clientX: number) => {
    if (!durationSec || !onSeek) return;
    const rect = el.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    onSeek(durationSec * ratio);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        role={seekable ? "slider" : "progressbar"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayPct)}
        aria-label="Playback progress"
        tabIndex={seekable ? 0 : undefined}
        className={cn(
          "relative h-1 w-full overflow-hidden rounded-full bg-white/8",
          seekable && "cursor-pointer focus-ring",
        )}
        onClick={(e) => seekable && seekFromClientX(e.currentTarget, e.clientX)}
        onKeyDown={(e) => {
          if (!seekable || !durationSec || !onSeek) return;
          const step = durationSec * 0.05;
          const base = currentTime != null ? toSeconds(currentTime) : 0;
          if (e.key === "ArrowRight") onSeek(base + step);
          if (e.key === "ArrowLeft") onSeek(Math.max(0, base - step));
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
          style={{
            width: `${displayPct}%`,
            background:
              "linear-gradient(to right, var(--platform-accent-soft, #a690ff), var(--platform-accent, #7c5cff))",
          }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-text-muted">
        <span>{formatTime(currentTime, unit)}</span>
        <span>{formatTime(duration, unit)}</span>
      </div>
    </div>
  );
}
