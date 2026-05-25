import { ChevronLeft, ChevronRight } from "lucide-react";
import { PLATFORMS } from "~/shared/constants";
import { IconButton } from "~/popup/components/common/IconButton";
import { cn } from "~/shared/utils";
import type { Platform } from "~/shared/types/player";

interface SessionHeaderProps {
  platform: Platform | null;
  sessionIndex: number;
  sessionTotal: number;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export function SessionHeader({
  platform,
  sessionIndex,
  sessionTotal,
  disabled,
  onPrevious,
  onNext,
  className,
}: SessionHeaderProps) {
  const label = platform ? PLATFORMS[platform].label : "No session";
  const canNavigate = sessionTotal > 1 && !disabled;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 rounded-xl bg-white/[0.03] px-1 py-1",
        className,
      )}
    >
      <IconButton
        label="Previous tab (switch session)"
        size="sm"
        variant="ghost"
        disabled={!canNavigate}
        onClick={onPrevious}
        icon={<ChevronLeft className="h-4 w-4" strokeWidth={2.25} />}
      />
      <div className="min-w-0 flex-1 text-center">
        <span className="block truncate text-xs font-semibold text-text-primary">{label}</span>
        {sessionTotal > 0 && (
          <span className="text-[10px] text-text-muted">
            Tab {sessionIndex} / {sessionTotal}
          </span>
        )}
      </div>
      <IconButton
        label="Next tab (switch session)"
        size="sm"
        variant="ghost"
        disabled={!canNavigate}
        onClick={onNext}
        icon={<ChevronRight className="h-4 w-4" strokeWidth={2.25} />}
      />
    </div>
  );
}
