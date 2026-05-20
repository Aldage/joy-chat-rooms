import { useEffect, useRef, useState } from "react";

// "Çöl Dansçısı" — Innocent-eyed oriental dancer with blue top, red pants.
// Sways gracefully while keeping wide kitten-like sweet eyes.
export function DesertDancer({ from }: { from: string }) {
  const [phase, setPhase] = useState<"in" | "show" | "out">("in");
  const sparkRef = useRef<{ id: number; x: number; y: number; d: number; s: number }[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 350);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (sparkRef.current.length === 0) {
    sparkRef.current = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 320,
      y: 50 + (Math.random() - 0.5) * 320,
      d: Math.random() * 0.6,
      s: 0.6 + Math.random() * 1.1,
    }));
  }

  return (
    <div className={`puss-wrap ${phase === "out" ? "puss-out" : ""}`}>
      <div className="absolute inset-0 pointer-events-none">
        {sparkRef.current.map(s => (
          <span
            key={s.id}
            className={`absolute block puss-spark ${phase === "out" ? "puss-spark-burst" : ""}`}
            style={{
              left: `calc(50% + ${s.x}px)`,
              top: `calc(50% + ${s.y}px)`,
              animationDelay: `${s.d}s`,
              transform: `scale(${s.s})`,
            }}
          />
        ))}
      </div>

      <svg viewBox="0 0 240 320" width="240" height="320" className="drop-shadow-[0_18px_40px_rgba(180,80,255,0.5)]">
        <defs>
          <radialGradient id="dd-skin" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ffe2c2" />
            <stop offset="100%" stopColor="#d49968" />
          </radialGradient>
          <linearGradient id="dd-top" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6cc9ff" />
            <stop offset="100%" stopColor="#1d5fb8" />
          </linearGradient>
          <linearGradient id="dd-pants" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff5a5a" />
            <stop offset="100%" stopColor="#a01b1b" />
          </linearGradient>
          <radialGradient id="dd-eye" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#c9ffe0" />
            <stop offset="60%" stopColor="#2aa07a" />
            <stop offset="100%" stopColor="#0f3a2a" />
          </radialGradient>
        </defs>

        {/* Body sways */}
        <g className="dd-body" style={{ transformOrigin: "120px 200px" }}>
          {/* Pants */}
          <path d="M82 200 Q120 220 158 200 L170 300 Q145 312 120 308 Q95 312 70 300 Z" fill="url(#dd-pants)" stroke="#5c0e0e" strokeWidth="1.5" />
          <path d="M120 220 L122 308" stroke="#5c0e0e" strokeWidth="1.5" opacity="0.6" />
          {/* Belt with coins */}
          <rect x="80" y="195" width="80" height="10" rx="3" fill="#f0c241" stroke="#7a5210" strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5].map(i => (
            <circle key={i} cx={86 + i * 12} cy={210} r="3" fill="#ffd95c" stroke="#7a5210" strokeWidth="0.6" />
          ))}

          {/* Torso (blue top) */}
          <path d="M92 130 Q120 122 148 130 L158 200 Q120 212 82 200 Z" fill="url(#dd-top)" stroke="#0d3a78" strokeWidth="1.5" />
          {/* Top trim */}
          <path d="M92 130 Q120 122 148 130" stroke="#ffd95c" strokeWidth="2" fill="none" />

          {/* Arms — left raised, right gentle */}
          <g className="dd-arm-left" style={{ transformOrigin: "92px 138px" }}>
            <path d="M92 138 Q60 110 50 60 Q56 56 64 60 Q78 110 100 140 Z" fill="url(#dd-skin)" stroke="#7a4a18" strokeWidth="1" />
            {/* veils */}
            <path d="M50 60 Q30 80 28 130 Q42 120 56 80 Z" fill="#6cc9ff" opacity="0.55" />
          </g>
          <g className="dd-arm-right" style={{ transformOrigin: "148px 138px" }}>
            <path d="M148 138 Q180 120 200 90 Q204 96 200 102 Q176 130 152 142 Z" fill="url(#dd-skin)" stroke="#7a4a18" strokeWidth="1" />
            <path d="M200 90 Q220 110 218 150 Q204 138 196 110 Z" fill="#6cc9ff" opacity="0.55" />
          </g>

          {/* Head */}
          <ellipse cx="120" cy="90" rx="34" ry="38" fill="url(#dd-skin)" stroke="#7a4a18" strokeWidth="1.5" />
          {/* Hair */}
          <path d="M86 78 Q88 50 120 46 Q156 50 156 80 Q150 64 120 60 Q92 64 86 78 Z" fill="#2d1408" />
          <path d="M86 80 Q70 130 86 150 L92 130 Q88 110 92 90 Z" fill="#2d1408" />
          <path d="M156 80 Q172 130 156 150 L150 130 Q154 110 150 90 Z" fill="#2d1408" />
          {/* Veil/headpiece */}
          <path d="M88 70 Q120 56 154 70 L150 76 Q120 66 90 76 Z" fill="#ffd95c" stroke="#7a5210" strokeWidth="0.8" />
          <circle cx="120" cy="68" r="3" fill="#ff5a5a" stroke="#7a5210" strokeWidth="0.6" />

          {/* Big innocent eyes */}
          <g className="puss-eyes">
            <ellipse cx="106" cy="92" rx="8" ry="10" fill="#fff" />
            <ellipse cx="134" cy="92" rx="8" ry="10" fill="#fff" />
            <ellipse cx="106" cy="94" rx="6" ry="8" fill="url(#dd-eye)" />
            <ellipse cx="134" cy="94" rx="6" ry="8" fill="url(#dd-eye)" />
            <circle cx="106" cy="95" r="2.5" fill="#0a0a0a" />
            <circle cx="134" cy="95" r="2.5" fill="#0a0a0a" />
            <circle cx="103" cy="89" r="1.6" fill="#fff" />
            <circle cx="131" cy="89" r="1.6" fill="#fff" />
          </g>
          {/* Lashes */}
          <path d="M98 86 Q104 82 114 84" stroke="#1a0a04" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M126 84 Q136 82 142 86" stroke="#1a0a04" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          {/* Nose */}
          <path d="M118 100 Q120 106 122 100" stroke="#7a4a18" strokeWidth="1" fill="none" />
          {/* Sweet smile */}
          <path d="M112 110 Q120 116 128 110" stroke="#a01b3a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M115 112 Q120 114 125 112" fill="#ff7a8a" />
        </g>
      </svg>

      <p className="-mt-2 text-center text-sm font-display font-bold text-primary-foreground bg-gradient-primary px-4 py-1.5 rounded-full shadow-glow">
        {from} → Çöl Dansçısı 💃
      </p>
    </div>
  );
}
