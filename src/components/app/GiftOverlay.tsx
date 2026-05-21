import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

export type PremiumGiftKind = "puss" | "dancer" | "bear" | "plane" | "rocket";

export type GiftEvent = {
  id: string;
  kind: PremiumGiftKind;
  from: string;
  to: string;
  giftName: string;
  emoji: string;
};

/**
 * Media registry — swap these URLs for your own ultra-premium transparent
 * WebM / GIF assets later. Supported: .webm/.mp4 → <video>, others → <img>.
 */
export const GIFT_MEDIA: Record<PremiumGiftKind, string> = {
  puss:   "https://media.tenor.com/CIYnRq0iD2QAAAAi/cat-cute.gif",
  dancer: "https://media.tenor.com/zVgMTBxXAvIAAAAi/dance-belly-dance.gif",
  bear:   "https://media.tenor.com/jr3vQ2hd83gAAAAi/hugs-bear-hug.gif",
  plane:  "https://media.tenor.com/wM5jU_5gI50AAAAi/paper-airplane.gif",
  rocket: "", // custom CSS animation, no media URL
};

const DURATION = 3400;
const ROCKET_DURATION = 4200;
const isVideo = (url: string) => /\.(webm|mp4|mov)(\?|$)/i.test(url);

/**
 * Full-screen premium gift overlay.
 * - z-index 9999, pointer-events none (clicks pass through).
 * - FIFO queue — only one animation plays at a time.
 * - Renders an <img>/<video> media container; replace URLs in GIFT_MEDIA for production.
 */
export function GiftOverlay({ events, onConsumed }: {
  events: GiftEvent[];
  onConsumed: (id: string) => void;
}) {
  const [active, setActive] = useState<GiftEvent | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pull next event from the queue whenever stage is free
  useEffect(() => {
    if (active || events.length === 0) return;
    const next = events[0];
    setActive(next);
    const dur = next.kind === "rocket" ? ROCKET_DURATION : DURATION;
    const t = setTimeout(() => {
      onConsumed(next.id);
      setActive(null);
    }, dur);
    return () => clearTimeout(t);
  }, [active, events, onConsumed]);

  // Autoplay safety: some browsers need explicit play()
  useEffect(() => {
    if (!active) return;
    const v = videoRef.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
  }, [active]);

  if (!active) return null;

  const url = GIFT_MEDIA[active.kind];
  const isRocket = active.kind === "rocket";

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {/* Top luxury banner */}
      <div className="absolute left-1/2 -translate-x-1/2 top-4 px-3 w-full max-w-md gift-banner-in">
        <div className="relative flex items-center gap-3 rounded-2xl px-3 py-2 shadow-[0_10px_40px_-8px_rgba(120,80,255,0.65)]
                        bg-gradient-to-r from-[oklch(0.35_0.18_260)] via-[oklch(0.45_0.22_290)] to-[oklch(0.4_0.2_330)]
                        border border-[oklch(0.78_0.18_300/0.45)] overflow-hidden">
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

      {/* Full-screen media stage */}
      <div className="absolute inset-0 flex items-center justify-center gift-stage-in">
        <div className="relative w-full h-full flex items-center justify-center">
          {isRocket ? (
            <RocketLaunch />
          ) : isVideo(url) ? (
            <video
              ref={videoRef}
              key={active.id}
              src={url}
              autoPlay
              muted
              playsInline
              className="max-w-[92vw] max-h-[70vh] object-contain drop-shadow-[0_20px_60px_rgba(180,80,255,0.55)]"
            />
          ) : (
            <img
              key={active.id}
              src={url}
              alt={active.giftName}
              className="max-w-[92vw] max-h-[70vh] object-contain drop-shadow-[0_20px_60px_rgba(180,80,255,0.55)]"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Premium CSS rocket launch: countdown flash, exhaust trail, stars, sonic boom. */
function RocketLaunch() {
  const stars = Array.from({ length: 40 }).map((_, i) => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 1.5,
    size: 2 + Math.random() * 3,
    key: i,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Night-sky gradient flash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,oklch(0.35_0.22_290/0.55),transparent_70%)] animate-fade-in" />
      {/* Twinkling stars */}
      {stars.map(s => (
        <span
          key={s.key}
          className="absolute rounded-full bg-white rocket-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {/* Shockwave ring */}
      <div className="absolute left-1/2 bottom-[8%] -translate-x-1/2 rocket-shockwave" />
      {/* Rocket + flame trail */}
      <div className="absolute left-1/2 -translate-x-1/2 rocket-fly">
        <div className="relative flex flex-col items-center">
          <span className="text-[120px] leading-none drop-shadow-[0_0_30px_rgba(255,180,80,0.9)] rocket-tilt">🚀</span>
          <div className="rocket-flame" />
        </div>
      </div>
      {/* Sonic boom caption */}
      <div className="absolute left-1/2 top-[14%] -translate-x-1/2 rocket-boom">
        <span className="text-2xl md:text-3xl font-display font-extrabold bg-gradient-to-r from-amber-300 via-pink-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,180,80,0.6)]">
          🚀 LIFTOFF! 🚀
        </span>
      </div>
    </div>
  );
}
