import { useEffect, useMemo } from "react";

export type MegaGift = { id: string; emoji: string; name: string; from: string; to: string; cost: number };

export function MegaGiftFX({ event, onDone }: { event: MegaGift | null; onDone: () => void }) {
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [event, onDone]);

  const pieces = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 1.6 + Math.random() * 1.2,
      hue: Math.floor(Math.random() * 360),
      size: 6 + Math.random() * 8,
      rot: Math.random() * 360,
      key: i,
    }));
  }, [event?.id]);

  if (!event) return null;
  const isPhoenix = event.cost >= 5000;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {/* radial flash */}
      <div className={`absolute inset-0 ${isPhoenix ? "bg-[radial-gradient(circle_at_center,rgba(255,180,80,0.45),transparent_60%)]" : "bg-[radial-gradient(circle_at_center,rgba(180,120,255,0.4),transparent_60%)]"} animate-fade-in`} />

      {/* fireworks rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className={`mega-ring ${isPhoenix ? "mega-ring-gold" : "mega-ring-violet"}`} />
        <div className={`mega-ring mega-ring-d ${isPhoenix ? "mega-ring-gold" : "mega-ring-violet"}`} />
      </div>

      {/* huge emoji */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 mega-emoji">
        <span className="text-[140px] drop-shadow-[0_0_40px_rgba(255,210,140,0.9)] block">{event.emoji}</span>
      </div>

      {/* confetti */}
      <div className="absolute inset-0">
        {pieces.map(p => (
          <span
            key={p.key}
            className="absolute top-[-10%] block rounded-sm confetti-piece"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              background: `hsl(${p.hue} 90% 60%)`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              transform: `rotate(${p.rot}deg)`,
              boxShadow: `0 0 8px hsl(${p.hue} 90% 70% / 0.7)`,
            }}
          />
        ))}
      </div>

      {/* caption */}
      <div className="absolute left-1/2 bottom-28 -translate-x-1/2 px-6 py-3 rounded-full bg-gradient-to-r from-primary via-accent to-primary shadow-glow animate-scale-in">
        <p className="text-sm font-display font-extrabold text-primary-foreground glow-text whitespace-nowrap">
          ✨ {event.from} → {event.to}: {event.name.toUpperCase()} {isPhoenix ? "🔥🔥" : "🎉"}
        </p>
      </div>
    </div>
  );
}