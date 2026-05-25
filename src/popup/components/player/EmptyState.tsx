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
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center",
        className,
      )}
      aria-labelledby="empty-state-heading"
    >
      <span className="text-[48px] leading-none text-[#222230]" aria-hidden>
        🎵
      </span>
      <div className="space-y-1">
        <h2
          id="empty-state-heading"
          className="text-sm font-semibold text-[var(--text-primary)]"
        >
          No media playing
        </h2>
        <p className="text-[11px] text-[#222230]">Open a supported tab to get started.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {onOpenSpotify && (
          <button
            type="button"
            className="focus-ring rounded-full border border-[color:color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_8%,transparent)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-primary)] hover:brightness-110"
            onClick={onOpenSpotify}
          >
            Open {PLATFORMS.spotify.label}
          </button>
        )}
        {onOpenYTMusic && (
          <button
            type="button"
            className="focus-ring rounded-full border border-[color:color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_8%,transparent)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-primary)] hover:brightness-110"
            onClick={onOpenYTMusic}
          >
            Open {PLATFORMS.ytmusic.label}
          </button>
        )}
      </div>
    </section>
  );
}
