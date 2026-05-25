import { ArrowUpRight, RefreshCw } from "lucide-react";
import { ext } from "~/shared/browser";
import { platformAccentColor } from "~/popup/hooks";
import { cn } from "~/shared/utils";
import type { Platform } from "~/shared/types/player";

interface PopupHeaderProps {
  platform: Platform | null;
  loading?: boolean;
  onRefresh: () => void;
  onOpenPlayer: () => void;
}

const APP_ICON_SRC = ext.runtime.getURL("/icon/128.png");

export function PopupHeader({ platform, loading, onRefresh, onOpenPlayer }: PopupHeaderProps) {
  const accent = platformAccentColor(platform);

  return (
    <header className="flex items-center justify-between gap-2 px-[15px] py-2 ">
      <div className="flex min-w-0 items-center gap-2">
        <img
          src={APP_ICON_SRC}
          alt=""
          width={48}
          height={48}
          draggable={false}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
          aria-hidden
        />
        <span className="truncate text-[13px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
          SongSphere
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Refresh"
          disabled={loading}
          onClick={onRefresh}
          className="focus-ring flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-40"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "motion-safe:animate-spin")}
            strokeWidth={2.25}
          />
        </button>
        <button
          type="button"
          onClick={onOpenPlayer}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md border p-[5px] text-[10.5px] font-semibold transition hover:brightness-110 active:scale-95 motion-safe:duration-150"
          style={{
            borderColor: `${accent}33`,
            backgroundColor: `${accent}0f`,
            color: `${accent}cc`,
          }}
        >
          <ArrowUpRight
            aria-hidden
            className="h-3 w-3 shrink-0 text-white/20 hover:text-white/50"
            strokeWidth={2.25}
          />
        </button>
      </div>
    </header>
  );
}
