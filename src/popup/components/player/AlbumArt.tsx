import { useEffect, useState } from "react";
import { cn } from "~/shared/utils";
import type { Platform } from "~/shared/types/player";

interface AlbumArtProps {
  src?: string;
  alt: string;
  isPlaying?: boolean;
  platform?: Platform | null;
  className?: string;
}

const EQ_BAR_CLASS = ["eq-bar-0", "eq-bar-1", "eq-bar-2", "eq-bar-3", "eq-bar-4"] as const;

export function AlbumArt({ src, alt, isPlaying, platform, className }: AlbumArtProps) {
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

  const placeholder =
    platform === "youtube" ? "🎬" : platform === "ytmusic" ? "🎵" : "🎸";

  return (
    <div
      className={cn(
        "relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-[15px] border border-[var(--border)]",
        className,
      )}
      style={{ backgroundColor: "var(--art-bg)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--accent) 38%, transparent) 0%, transparent 68%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 0, transparent 50%)",
          backgroundSize: "8px 8px",
        }}
        aria-hidden
      />

      {shown ? (
        <img
          src={shown}
          alt={alt}
          draggable={false}
          className={cn(
            "relative z-[2] h-full w-full object-cover motion-safe:transition-opacity motion-safe:duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <div className="relative z-[2] flex h-full w-full items-center justify-center text-[44px] opacity-45">
          <span aria-hidden>{placeholder}</span>
        </div>
      )}

      {isPlaying && (
        <div
          className="pointer-events-none absolute inset-0 z-[3] rounded-[15px] border-[1.5px] motion-safe:transition-[border-color] motion-safe:duration-400"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 33%, transparent)" }}
          aria-hidden
        />
      )}

      {isPlaying && (
        <div
          className="absolute bottom-[9px] left-[9px] z-[4] flex items-end gap-[3px]"
          aria-hidden
        >
          {EQ_BAR_CLASS.map((barClass, i) => (
            <span
              key={i}
              className={cn(
                "inline-block w-[2.5px] shrink-0 rounded-sm bg-[var(--accent)] opacity-95",
                barClass,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
