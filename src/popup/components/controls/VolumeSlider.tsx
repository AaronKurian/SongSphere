import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn, clamp } from "~/shared/utils";

interface VolumeSliderProps {
  value: number | undefined;
  visible?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
  onCommit?: () => void;
  className?: string;
}

export function VolumeSlider({
  value,
  visible = true,
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
  const VolumeIcon = pct === 0 ? VolumeX : pct < 0.5 ? Volume1 : Volume2;

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onCommit?.();
  };

  return (
    <div
      className={cn(
        "mt-[9px] flex w-[120px] max-w-[120px] items-center gap-[2px] px-[3px] motion-safe:transition-opacity motion-safe:duration-300",
        !visible && "pointer-events-none opacity-0",
        className,
      )}
    >
      <VolumeIcon
        aria-hidden
        className="h-3 w-3 shrink-0"
        strokeWidth={2}
        style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pct * 100)}
        disabled={disabled || !visible}
        aria-label="Volume"
        className="sphere-range focus-ring min-w-0 flex-1"
        style={{
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct * 100}%, rgba(255,255,255,0.08) ${pct * 100}%, rgba(255,255,255,0.08) 100%)`,
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
      <span className="w-5 text-right text-[10px] tabular-nums text-text-muted">
        {Math.round(pct * 100)}
      </span>
    </div>
  );
}
