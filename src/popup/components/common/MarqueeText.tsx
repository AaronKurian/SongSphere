import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "~/shared/utils";

/** Scroll speed in px/s while text is moving (pause segments excluded). */
const MARQUEE_PX_PER_SEC = 42;
const MARQUEE_MOVE_FRACTION = 0.64;
const MARQUEE_MIN_MS = 4_000;
const MARQUEE_MAX_MS = 18_000;

interface MarqueeTextProps {
  text: string;
  className?: string;
  resetKey?: string | number;
}

function marqueeDurationMs(overflowPx: number): number {
  const moveMs = (overflowPx / MARQUEE_PX_PER_SEC) * 1000;
  const total = moveMs / MARQUEE_MOVE_FRACTION;
  return Math.round(Math.min(MARQUEE_MAX_MS, Math.max(MARQUEE_MIN_MS, total)));
}

export function MarqueeText({ text, className, resetKey }: MarqueeTextProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Animation | null>(null);
  const [overflowPx, setOverflowPx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const gap = inner.scrollWidth - outer.clientWidth;
    setOverflowPx(gap > 2 ? gap : 0);
  }, [text]);

  useLayoutEffect(() => {
    measure();
    const raf = requestAnimationFrame(measure);
    const outer = outerRef.current;
    let ro: ResizeObserver | undefined;
    if (outer && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(outer);
    }
    void document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [measure, resetKey]);

  const display = text?.trim() || "-";
  const marquee = overflowPx > 0 && !reducedMotion;

  useEffect(() => {
    const inner = innerRef.current;
    animRef.current?.cancel();
    animRef.current = null;

    if (!inner) return;

    if (!marquee) {
      inner.style.transform = "";
      return;
    }

    const duration = marqueeDurationMs(overflowPx);
    const anim = inner.animate(
      [
        { transform: "translateX(0)", offset: 0 },
        { transform: "translateX(0)", offset: 0.18 },
        { transform: `translateX(-${overflowPx}px)`, offset: 0.82 },
        { transform: `translateX(-${overflowPx}px)`, offset: 1 },
      ],
      { duration, iterations: Infinity, easing: "linear" },
    );
    animRef.current = anim;
    return () => {
      anim.cancel();
      if (animRef.current === anim) animRef.current = null;
    };
  }, [display, resetKey, marquee, overflowPx]);

  return (
    <div ref={outerRef} className="min-w-0 w-full overflow-hidden leading-none">
      <span
        ref={innerRef}
        className={cn(
          "inline-block max-w-none whitespace-nowrap",
          !marquee && overflowPx > 0 && "block w-full truncate",
          className,
        )}
        title={display}
      >
        {display}
      </span>
    </div>
  );
}
