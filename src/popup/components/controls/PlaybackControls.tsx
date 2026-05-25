import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { IconButton } from "~/popup/components/common/IconButton";
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
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      {showPrevious ? (
        <IconButton
          label="Previous video in playlist"
          size="md"
          variant="ghost"
          disabled={disabled}
          onClick={onPrevious}
          icon={<SkipBack className="h-5 w-5" strokeWidth={2.25} />}
        />
      ) : (
        <span className="h-10 w-10" aria-hidden />
      )}

      <IconButton
        label={isPlaying ? "Pause" : "Play"}
        size="lg"
        variant="primary"
        disabled={disabled}
        onClick={onTogglePlay}
        icon={
          isPlaying ? (
            <Pause className="h-6 w-6" strokeWidth={2.5} fill="currentColor" />
          ) : (
            <Play className="h-6 w-6 translate-x-0.5" strokeWidth={2.5} fill="currentColor" />
          )
        }
      />

      {showNext ? (
        <IconButton
          label="Next video in playlist"
          size="md"
          variant="ghost"
          disabled={disabled}
          onClick={onNext}
          icon={<SkipForward className="h-5 w-5" strokeWidth={2.25} />}
        />
      ) : (
        <span className="h-10 w-10" aria-hidden />
      )}
    </div>
  );
}
