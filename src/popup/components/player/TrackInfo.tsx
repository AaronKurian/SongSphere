import { cn } from "~/shared/utils";

interface TrackInfoProps {
  title: string;
  artist: string;
  className?: string;
}

export function TrackInfo({ title, artist, className }: TrackInfoProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <h2 className="truncate text-base font-semibold text-text-primary" title={title}>
        {title || "Nothing playing"}
      </h2>
      <p className="truncate text-sm text-text-secondary" title={artist}>
        {artist || "—"}
      </p>
    </div>
  );
}
