import { useEffect, useRef, useState } from "react";

// "Ayıcık Kucağı" — Giant fluffy brown teddy hugged from behind by a sweet
// girl. Sparkly hearts float around. Innocent kitten-like eyes.
export function BearHug({ from }: { from: string }) {
  const [phase, setPhase] = useState<"in" | "show" | "out">("in");
  const heartsRef = useRef<{ id: number; x: number; y: number; d: number; s: number }[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 350);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (heartsRef.current.length === 0) {
    heartsRef.current = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: (Math.random() - 0.5) * 320,
      d: Math.random() * 0.8,
      s: 0.6 + Math.random() * 1.1,
    }));
  }

  return (
    <div className={`puss-wrap ${phase === "out" ? "puss-out" : ""}`}>
      {/* Floating hearts */}
      <div className="absolute inset-0 pointer-events-none">
        {heartsRef.current.map(h => (
          <span
            key={h.id}
            className="absolute block heart-float text-pink-400"
            style={{
              left: `calc(50% + ${h.x}px)`,
              top: `calc(50% + ${h.y}px)`,
              animationDelay: `${h.d}s`,
              transform: `scale(${h.s})`,
              fontSize: 22,
              filter: "drop-shadow(0 0 8px rgba(255,120,180,0.8))",
            }}
          >💖</span>
        ))}
      </div>

      <svg viewBox="0 0 280 280" width="280" height="280" className="drop-shadow-[0_18px_40px_rgba(255,140,200,0.55)]">
        <defs>
          <radialGradient id="bh-fur" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#c98a52" />
            <stop offset="60%" stopColor="#8b5a2b" />
            <stop offset="100%" stopColor="#4d2e12" />
          </radialGradient>
          <radialGradient id="bh-tummy" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#f5d7a9" />
            <stop offset="100%" stopColor="#c79a6a" />
          </radialGradient>
          <radialGradient id="bh-skin" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#fff0db" />
            <stop offset="100%" stopColor="#e0b48a" />
          </radialGradient>
        </defs>

        {/* Girl behind — hair fanning out */}
        <path d="M30 130 Q40 80 90 70 L190 70 Q240 80 250 130 L240 220 Q200 240 140 240 Q80 240 40 220 Z"
              fill="#7a3f1a" opacity="0.92" />
        <path d="M50 140 Q60 100 110 92 L170 92 Q220 100 230 140" fill="#5a2a10" opacity="0.6" />

        {/* Girl's arms hugging from behind */}
        <path d="M40 170 Q60 200 110 210 L130 200 Q90 188 70 160 Z" fill="url(#bh-skin)" stroke="#7a4a18" strokeWidth="1.2" />
        <path d="M240 170 Q220 200 170 210 L150 200 Q190 188 210 160 Z" fill="url(#bh-skin)" stroke="#7a4a18" strokeWidth="1.2" />

        {/* Bear ears */}
        <circle cx="80" cy="95" r="22" fill="url(#bh-fur)" stroke="#3a210a" strokeWidth="1.5" />
        <circle cx="200" cy="95" r="22" fill="url(#bh-fur)" stroke="#3a210a" strokeWidth="1.5" />
        <circle cx="80" cy="95" r="11" fill="#f0c08a" />
        <circle cx="200" cy="95" r="11" fill="#f0c08a" />

        {/* Bear body (fluffy) */}
        <ellipse cx="140" cy="200" rx="78" ry="60" fill="url(#bh-fur)" stroke="#3a210a" strokeWidth="2" />
        <ellipse cx="140" cy="210" rx="48" ry="40" fill="url(#bh-tummy)" />

        {/* Bear head */}
        <ellipse cx="140" cy="130" rx="68" ry="58" fill="url(#bh-fur)" stroke="#3a210a" strokeWidth="2" />
        {/* Snout */}
        <ellipse cx="140" cy="152" rx="32" ry="22" fill="url(#bh-tummy)" stroke="#5a3818" strokeWidth="1.2" />
        {/* Nose */}
        <path d="M132 142 Q140 136 148 142 Q146 150 140 152 Q134 150 132 142 Z" fill="#2a1408" />
        <line x1="140" y1="152" x2="140" y2="162" stroke="#2a1408" strokeWidth="1.5" />
        <path d="M132 162 Q140 168 148 162" stroke="#2a1408" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Sweet innocent eyes */}
        <g className="puss-eyes">
          <ellipse cx="112" cy="122" rx="11" ry="13" fill="#fff" />
          <ellipse cx="168" cy="122" rx="11" ry="13" fill="#fff" />
          <ellipse cx="112" cy="124" rx="8" ry="10" fill="#3a210a" />
          <ellipse cx="168" cy="124" rx="8" ry="10" fill="#3a210a" />
          <circle cx="109" cy="120" r="2.4" fill="#fff" />
          <circle cx="165" cy="120" r="2.4" fill="#fff" />
          <circle cx="115" cy="127" r="1.3" fill="#fff" opacity="0.8" />
          <circle cx="171" cy="127" r="1.3" fill="#fff" opacity="0.8" />
        </g>
        {/* Blush */}
        <ellipse cx="98" cy="148" rx="9" ry="5" fill="#ff8aa8" opacity="0.55" />
        <ellipse cx="182" cy="148" rx="9" ry="5" fill="#ff8aa8" opacity="0.55" />

        {/* Bow on head */}
        <path d="M170 78 L188 64 L188 86 Z" fill="#ff5a8a" />
        <path d="M170 78 L152 64 L152 86 Z" fill="#ff5a8a" />
        <circle cx="170" cy="78" r="6" fill="#c2326a" />

        {/* Bear paws on tummy */}
        <ellipse cx="98" cy="220" rx="20" ry="16" fill="url(#bh-fur)" stroke="#3a210a" strokeWidth="1.4" />
        <ellipse cx="182" cy="220" rx="20" ry="16" fill="url(#bh-fur)" stroke="#3a210a" strokeWidth="1.4" />
        <ellipse cx="98" cy="224" rx="10" ry="7" fill="#f5b89a" />
        <ellipse cx="182" cy="224" rx="10" ry="7" fill="#f5b89a" />

        {/* Girl head peeks over bear */}
        <g className="bh-girl">
          <ellipse cx="140" cy="78" rx="22" ry="24" fill="url(#bh-skin)" stroke="#7a4a18" strokeWidth="1.2" />
          {/* Fringe */}
          <path d="M120 70 Q140 56 160 70 Q156 64 140 60 Q124 64 120 70 Z" fill="#7a3f1a" />
          {/* Sweet eyes */}
          <ellipse cx="132" cy="80" rx="2.6" ry="3.2" fill="#1a0a04" />
          <ellipse cx="148" cy="80" rx="2.6" ry="3.2" fill="#1a0a04" />
          <path d="M133 86 Q140 90 147 86" stroke="#a01b3a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      </svg>

      <p className="-mt-3 text-center text-sm font-display font-bold text-primary-foreground bg-gradient-primary px-4 py-1.5 rounded-full shadow-glow">
        {from} → Ayıcık Kucağı 🧸
      </p>
    </div>
  );
}
