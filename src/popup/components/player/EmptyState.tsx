import { Music2 } from "lucide-react";
import { PLATFORMS } from "~/shared/constants";
import { cn } from "~/shared/utils";

interface EmptyStateProps {
  className?: string;
  onOpenSpotify?: () => void;
  onOpenYTMusic?: () => void;
}

export function EmptyState({ className, onOpenSpotify, onOpenYTMusic }: EmptyStateProps) {
  return (
    <section
      className={cn("flex flex-1 flex-col items-center justify-center gap-4 text-center", className)}
      aria-labelledby="empty-state-heading"
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-brand"
        aria-hidden
      >
        <Music2 className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <div className="max-w-[260px] space-y-2">
        <h2 id="empty-state-heading" className="text-sm font-semibold text-text-primary">
          No media sessions yet
        </h2>
        <p className="text-[11px] leading-relaxed text-text-muted">
          Open a supported player and start playback. SongSphere reads the active tab only — it
          does not stream or record audio.
        </p>
      </div>
      <ul className="space-y-1 text-left text-[10px] text-text-muted">
        <li>Tabs and scripting — detect supported players</li>
        <li>Host access — read now-playing metadata from those pages</li>
        <li>Storage — remember your last session strip locally</li>
      </ul>
      <div className="flex flex-wrap justify-center gap-2">
        {onOpenSpotify && (
          <button
            type="button"
            className="focus-ring rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-medium hover:bg-white/15"
            onClick={onOpenSpotify}
          >
            Open {PLATFORMS.spotify.label}
          </button>
        )}
        {onOpenYTMusic && (
          <button
            type="button"
            className="focus-ring rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-medium hover:bg-white/15"
            onClick={onOpenYTMusic}
          >
            Open {PLATFORMS.ytmusic.label}
          </button>
        )}
      </div>
    </section>
  );
}
