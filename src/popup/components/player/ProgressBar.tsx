import { useEffect, useRef, useState } from "react";
import { cn, clamp, formatTime } from "~/shared/utils";

interface ProgressBarProps {
  currentTime?: number;
  duration?: number;
  unit?: "ms" | "s";
  isPlaying?: boolean;
  seekable?: boolean;
  loading?: boolean;
  onSeek?: (position: number) => void;
  className?: string;
}

export function ProgressBar({
  currentTime,
  duration,
  unit = "s",
  isPlaying = false,
  seekable,
  loading,
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
    <div className={cn("mb-2.5", className)}>
      <div className="flex h-5 cursor-pointer items-center gap-[7px]">
        <span className="min-w-[26px] text-[10px] font-medium tabular-nums text-[#444455]">
          {formatTime(currentTime, unit)}
        </span>
        <div
          role={seekable ? "slider" : "progressbar"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(displayPct)}
          aria-label="Playback progress"
          tabIndex={seekable ? 0 : undefined}
          className={cn(
            "relative h-[3px] min-w-0 flex-1 overflow-visible rounded-full bg-white/[0.07]",
            seekable && "cursor-pointer focus-ring",
            loading && "[&>div]:overflow-hidden",
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
          {loading ? (
            <div className="absolute inset-0 animate-pulse bg-white/10" />
          ) : (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)] motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-linear"
              style={{
                width: `${displayPct}%`,
                transitionProperty: "width, background",
                transitionDuration: "0.95s, 0.4s",
              }}
            >
              <span
                className="absolute right-[-5.5px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-black"
                style={{
                  boxShadow:
                    "0 0 0 2.5px var(--accent), 0 0 8px color-mix(in srgb, var(--accent) 33%, transparent)",
                }}
              />
            </div>
          )}
        </div>
        <span className="min-w-[26px] text-right text-[10px] tabular-nums text-[#333344]">
          {formatTime(duration, unit)}
        </span>
      </div>
    </div>
  );
}
