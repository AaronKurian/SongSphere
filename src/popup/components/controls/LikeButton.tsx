import { Heart } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "~/shared/utils";

interface LikeButtonProps {
  liked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
}

export function LikeButton({ liked, disabled, onToggle, className }: LikeButtonProps) {
  const [popping, setPopping] = useState(false);

  const handleClick = useCallback(() => {
    setPopping(true);
    onToggle();
  }, [onToggle]);

  return (
    <button
      type="button"
      aria-label={liked ? "Remove from liked" : "Add to liked"}
      disabled={disabled}
      onClick={handleClick}
      onAnimationEnd={() => setPopping(false)}
      className={cn(
        "focus-ring flex h-7 w-7 pt-4 shrink-0 items-center justify-center rounded-full border-none transition-colors hover:scale-110",
        liked
          ? "text-[var(--accent)]"
          : "text-[var(--text-muted)]",
        popping && "like-pop",
        disabled && "pointer-events-none opacity-35",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn("h-3.5 w-3.5", liked && "fill-current")}
        strokeWidth={2}
      />
    </button>
  );
}
