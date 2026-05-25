import { Heart } from "lucide-react";
import { IconButton } from "~/popup/components/common/IconButton";
import { cn } from "~/shared/utils";

interface LikeButtonProps {
  liked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
}

export function LikeButton({ liked, disabled, onToggle, className }: LikeButtonProps) {
  return (
    <IconButton
      label={liked ? "Remove from liked" : "Add to liked"}
      size="md"
      variant="filled"
      disabled={disabled}
      onClick={onToggle}
      active={liked}
      className={cn(liked && "text-rose-400 bg-rose-500/10 border-rose-500/20", className)}
      icon={<Heart className={cn("h-4 w-4", liked && "fill-current")} strokeWidth={2.25} />}
    />
  );
}
