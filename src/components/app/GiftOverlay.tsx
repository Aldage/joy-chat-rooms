import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import Lottie from "lottie-react";

export type PremiumGiftKind =
  | "puss" | "dancer" | "bear" | "plane"
  | "rocket" | "rose" | "diamond";

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
  rocket: "", // Lottie
  rose:   "", // Lottie
  diamond:"", // Lottie
};

/** Bundled Lottie JSON files served from /public/lottie/. */
const LOTTIE_URLS: Partial<Record<PremiumGiftKind, string>> = {
  rocket:  "/lottie/rocket.json",
  rose:    "/lottie/rose.json",
  diamond: "/lottie/diamond.json",
};

const DURATION = 3400;
const ROCKET_DURATION = 4600;
const LOTTIE_DURATION = 3800;
const isVideo = (url: string) => /\.(webm|mp4|mov)(\?|$)/i.test(url);
const isLottie = (kind: PremiumGiftKind) => kind in LOTTIE_URLS;

/** Module-level cache so repeat plays don't refetch the JSON. */
const lottieCache = new Map<string, unknown>();
async function loadLottie(url: string): Promise<unknown | null> {
  if (lottieCache.has(url)) return lottieCache.get(url)!;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    lottieCache.set(url, json);
    return json;
  } catch {
    return null;
  }
}

/** Synthesized "blast-off" sound — whoosh ramp + low boom + crackle. */
function playBlastOff() {
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    // Whoosh: rising sawtooth filtered, 1.4s
    const whoosh = ctx.createOscillator();
    whoosh.type = "sawtooth";
    whoosh.frequency.setValueAtTime(80, now);
    whoosh.frequency.exponentialRampToValueAtTime(900, now + 1.4);
    const wFilter = ctx.createBiquadFilter();
    wFilter.type = "lowpass";
    wFilter.frequency.setValueAtTime(400, now);
    wFilter.frequency.exponentialRampToValueAtTime(4000, now + 1.4);
    const wGain = ctx.createGain();
    wGain.gain.setValueAtTime(0.0001, now);
    wGain.gain.exponentialRampToValueAtTime(0.45, now + 0.4);
    wGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    whoosh.connect(wFilter); wFilter.connect(wGain); wGain.connect(master);
    whoosh.start(now); whoosh.stop(now + 1.7);

    // Boom: sub-bass thump at takeoff
    const boom = ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(120, now + 0.05);
    boom.frequency.exponentialRampToValueAtTime(35, now + 0.9);
    const bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.0001, now + 0.05);
    bGain.gain.exponentialRampToValueAtTime(0.9, now + 0.12);
    bGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    boom.connect(bGain); bGain.connect(master);
    boom.start(now + 0.05); boom.stop(now + 1.3);

    // Crackle: white-noise burst for after-burn
    const noiseDur = 1.8;
    const buf = ctx.createBuffer(1, ctx.sampleRate * noiseDur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 1800;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, now);
    nGain.gain.exponentialRampToValueAtTime(0.35, now + 0.2);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseDur);
    noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(master);
    noise.start(now); noise.stop(now + noiseDur);

    setTimeout(() => ctx.close().catch(() => {}), 2200);
  } catch {
    /* audio not allowed — silently ignore */
  }
}

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
    if (next.kind === "rocket") playBlastOff();
    const dur =
      next.kind === "rocket" ? ROCKET_DURATION :
      isLottie(next.kind)    ? LOTTIE_DURATION :
      DURATION;
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
  const lottie = isLottie(active.kind);

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
          {lottie ? (
            <LottieStage kind={active.kind} />
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

/** Full-screen Lottie stage with dramatic backdrop. */
function LottieStage({ kind }: { kind: PremiumGiftKind }) {
  const url = LOTTIE_URLS[kind]!;
  const [data, setData] = useState<unknown | null>(() => lottieCache.get(url) ?? null);
  useEffect(() => {
    let cancelled = false;
    if (!data) loadLottie(url).then(j => { if (!cancelled) setData(j); });
    return () => { cancelled = true; };
  }, [url, data]);

  const isRocket = kind === "rocket";
  const tintClass =
    kind === "rose"   ? "bg-[radial-gradient(ellipse_at_center,oklch(0.5_0.22_10/0.45),transparent_70%)]" :
    kind === "diamond"? "bg-[radial-gradient(ellipse_at_center,oklch(0.65_0.18_220/0.5),transparent_70%)]" :
                        "bg-[radial-gradient(ellipse_at_bottom,oklch(0.35_0.22_290/0.6),transparent_70%)]";
  const caption =
    isRocket          ? "🚀 LIFTOFF! 🚀" :
    kind === "rose"   ? "🌹 Gül armağan edildi 🌹" :
                        "💎 Elmas armağan edildi 💎";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 ${tintClass} animate-fade-in`} />
      <div className="absolute inset-0 flex items-center justify-center">
        {data ? (
          <Lottie
            animationData={data as object}
            loop={false}
            autoplay
            rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
            style={{
              width:  "min(100vw, 100vh)",
              height: "min(100vw, 100vh)",
              filter: isRocket
                ? "drop-shadow(0 0 40px rgba(255,180,80,0.7))"
                : "drop-shadow(0 10px 40px rgba(180,80,255,0.55))",
            }}
          />
        ) : (
          <div className="text-6xl animate-pulse">{isRocket ? "🚀" : kind === "rose" ? "🌹" : "💎"}</div>
        )}
      </div>
      <div className="absolute left-1/2 top-[14%] -translate-x-1/2 rocket-boom whitespace-nowrap">
        <span className="text-2xl md:text-3xl font-display font-extrabold bg-gradient-to-r from-amber-300 via-pink-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,180,80,0.6)]">
          {caption}
        </span>
      </div>
    </div>
  );
}

/** (Deprecated) old CSS rocket — kept for reference, unused now. */
function _RocketLaunchLegacy() {
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
