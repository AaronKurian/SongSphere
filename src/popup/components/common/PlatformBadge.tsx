import { PLATFORMS } from "~/shared/constants";
import { cn } from "~/shared/utils";
import type { Platform } from "~/shared/types/player";

interface PlatformBadgeProps {
  platform: Platform | null;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  if (!platform) return null;
  const meta = PLATFORMS[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        "bg-white/5 text-text-secondary border border-white/5",
        className,
      )}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </span>
  );
}
