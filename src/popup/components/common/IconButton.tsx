import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "~/shared/utils";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "ghost" | "filled" | "primary";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  active?: boolean;
  icon: ReactNode;
  label: string;
}

const SIZE: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

const VARIANT: Record<IconButtonVariant, string> = {
  ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5",
  filled: "bg-white/5 text-text-primary hover:bg-white/10 border border-white/5",
  primary: "bg-white text-surface hover:bg-white/90 shadow-glow",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = "md", variant = "ghost", active, icon, label, className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all duration-150",
        "focus-ring active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        SIZE[size],
        VARIANT[variant],
        active && "text-brand-soft bg-brand/10",
        className,
      )}
      {...rest}
    >
      <span className="pointer-events-none flex items-center justify-center">{icon}</span>
    </button>
  );
});
