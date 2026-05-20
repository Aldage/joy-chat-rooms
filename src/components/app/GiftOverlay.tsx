import { useEffect, useState } from "react";
import { PussCat } from "./PussCat";
import { DesertDancer } from "./DesertDancer";
import { BearHug } from "./BearHug";
import { PaperPlane } from "./PaperPlane";
import { ArrowRight, Sparkles } from "lucide-react";

export type PremiumGiftKind = "puss" | "dancer" | "bear" | "plane";

export type GiftEvent = {
  id: string;
  kind: PremiumGiftKind;
  from: string;
  to: string;
  giftName: string;
  emoji: string;
};

const DURATION = 3400;

/**
 * Full-screen premium gift overlay.
 * - z-index 9999, pointer-events none (interaction passes through).
 * - Internal FIFO queue so gifts never overlap.
 * - Top luxury banner slides in, center stage hosts the SVG animation.
 */
export function GiftOverlay({ events, onConsumed }: {
  events: GiftEvent[];
  onConsumed: (id: string) => void;
}) {
  const [active, setActive] = useState<GiftEvent | null>(null);

  // Pull next event from the queue whenever stage is free
  useEffect(() => {
    if (active || events.length === 0) return;
    const next = events[0];
    setActive(next);
    const t = setTimeout(() => {
      onConsumed(next.id);
      setActive(null);
    }, DURATION);
    return () => clearTimeout(t);
  }, [active, events, onConsumed]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {/* Top luxury banner */}
      <div className="absolute left-1/2 -translate-x-1/2 top-4 px-3 w-full max-w-md gift-banner-in">
        <div className="relative flex items-center gap-3 rounded-2xl px-3 py-2 shadow-[0_10px_40px_-8px_rgba(120,80,255,0.65)]
                        bg-gradient-to-r from-[oklch(0.35_0.18_260)] via-[oklch(0.45_0.22_290)] to-[oklch(0.4_0.2_330)]
                        border border-[oklch(0.78_0.18_300/0.45)] overflow-hidden">
          {/* Shine sweep */}
          <span className="absolute inset-0 gift-banner-shine pointer-events-none" />
          <div className="size-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-xl shrink-0">
            {active.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-white/70 font-semibold flex items-center gap-1">
              <Sparkles className="size-3" /> Premium Hediye
            </p>
            <p className="text-[13px] font-display font-bold text-white truncate">
              <span className="text-amber-200">{active.from}</span>
              <span className="opacity-70"> → </span>
              <span className="text-pink-200">{active.to}</span>
              <span className="opacity-80"> · {active.giftName}</span>
            </p>
          </div>
          <button
            type="button"
            className="pointer-events-auto shrink-0 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide
                       bg-white/95 text-[oklch(0.3_0.18_290)] rounded-full px-3 py-1.5 hover:bg-white transition"
          >
            Git <ArrowRight className="size-3" />
          </button>
        </div>
      </div>

      {/* Center stage */}
      <div className="absolute inset-0 flex items-center justify-center gift-stage-in">
        {active.kind === "puss"   && <PussCat      from={active.from} />}
        {active.kind === "dancer" && <DesertDancer from={active.from} />}
        {active.kind === "bear"   && <BearHug      from={active.from} />}
        {active.kind === "plane"  && <PaperPlane   from={active.from} />}
      </div>
    </div>
  );
}
