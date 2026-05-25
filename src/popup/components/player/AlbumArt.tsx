import { Music2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "~/shared/utils";

interface AlbumArtProps {
  src?: string;
  alt: string;
  isPlaying?: boolean;
  className?: string;
}

export function AlbumArt({ src, alt, isPlaying, className }: AlbumArtProps) {
  const [shown, setShown] = useState(src);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) {
      setShown(undefined);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    const img = new Image();
    img.onload = () => {
      setShown(src);
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-2xl",
        "bg-surface-muted border border-white/5 motion-safe:shadow-glow",
        className,
      )}
    >
      {shown ? (
        <img
          src={shown}
          alt={alt}
          draggable={false}
          className={cn(
            "h-full w-full object-cover motion-safe:transition-all motion-safe:duration-500",
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
            isPlaying ? "motion-safe:scale-100" : "motion-safe:scale-[0.98]",
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-text-muted">
          <Music2 className="h-12 w-12" aria-hidden />
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/40 via-transparent to-transparent"
      />
    </div>
  );
}
