import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { cn } from "~/shared/utils";

interface PlaybackControlsProps {
  isPlaying: boolean;
  disabled?: boolean;
  showNext?: boolean;
  showPrevious?: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  className?: string;
}

const iconProps = {
  "aria-hidden": true as const,
  strokeWidth: 2,
};

export function PlaybackControls({
  isPlaying,
  disabled,
  showNext = true,
  showPrevious = true,
  onTogglePlay,
  onNext,
  onPrevious,
  className,
}: PlaybackControlsProps) {
  const transportClass =
    "focus-ring flex h-9 w-9 items-center justify-center text-[var(--text-secondary)] transition hover:opacity-60 hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div className={cn("flex items-center justify-center gap-2.5", className)}>
      {showPrevious ? (
        <button
          type="button"
          aria-label="Previous track"
          disabled={disabled}
          onClick={onPrevious}
          className={transportClass}
        >
          <SkipBack className="h-[18px] w-[18px]" {...iconProps} />
        </button>
      ) : null}

      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        disabled={disabled}
        onClick={onTogglePlay}
        className={cn(
          "focus-ring flex h-[42px] w-[42px] items-center text-white justify-center rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.6)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
          isPlaying &&
            "shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_20px_color-mix(in_srgb,var(--accent)_27%,transparent)]",
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" {...iconProps} />
        ) : (
          <Play className="h-5 w-5 translate-x-px fill-current" {...iconProps} />
        )}
      </button>

      {showNext ? (
        <button
          type="button"
          aria-label="Next track"
          disabled={disabled}
          onClick={onNext}
          className={transportClass}
        >
          <SkipForward className="h-[18px] w-[18px]" {...iconProps} />
        </button>
      ) : null}
    </div>
  );
}
