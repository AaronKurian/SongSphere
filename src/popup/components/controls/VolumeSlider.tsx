import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn, clamp } from "~/shared/utils";

interface VolumeSliderProps {
  value: number | undefined;
  disabled?: boolean;
  onChange: (value: number) => void;
  onCommit?: () => void;
  className?: string;
}

export function VolumeSlider({
  value,
  disabled,
  onChange,
  onCommit,
  className,
}: VolumeSliderProps) {
  const [local, setLocal] = useState<number>(value ?? 0.6);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current && value != null) setLocal(value);
  }, [value]);

  const pct = clamp(local, 0, 1);
  const Icon = pct === 0 ? VolumeX : pct < 0.5 ? Volume1 : Volume2;

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onCommit?.();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon aria-hidden className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={2} />
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pct * 100)}
        disabled={disabled}
        aria-label="Volume"
        className="sphere-range focus-ring flex-1"
        style={{
          background: `linear-gradient(to right, var(--platform-accent, #fff) 0%, var(--platform-accent, #fff) ${pct * 100}%, rgba(255,255,255,0.08) ${pct * 100}%, rgba(255,255,255,0.08) 100%)`,
        }}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onBlur={endDrag}
        onChange={(e) => {
          const next = clamp(Number(e.target.value) / 100, 0, 1);
          setLocal(next);
          onChange(next);
        }}
      />
      <span className="w-7 text-right text-[10px] tabular-nums text-text-muted">
        {Math.round(pct * 100)}
      </span>
    </div>
  );
}
