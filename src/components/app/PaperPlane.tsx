import { useEffect, useRef, useState } from "react";

// "Kağıt Uçak Yolculuğu" — Princess-like girl with long blonde hair and a
// yellow dress riding a pink paper plane that loops across the screen.
export function PaperPlane({ from }: { from: string }) {
  const [phase, setPhase] = useState<"in" | "show" | "out">("in");
  const sparkRef = useRef<{ id: number; x: number; y: number; d: number; s: number }[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 350);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (sparkRef.current.length === 0) {
    sparkRef.current = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 360,
      y: (Math.random() - 0.5) * 320,
      d: Math.random() * 0.8,
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

      {/* Plane loops around */}
      <div className="plane-loop">
        <svg viewBox="0 0 280 240" width="280" height="240" className="drop-shadow-[0_18px_40px_rgba(255,170,220,0.55)]">
          <defs>
            <linearGradient id="pp-plane" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffd0e4" />
              <stop offset="100%" stopColor="#ff79b8" />
            </linearGradient>
            <linearGradient id="pp-dress" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fff3a0" />
              <stop offset="100%" stopColor="#f0b820" />
            </linearGradient>
            <linearGradient id="pp-hair" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffe488" />
              <stop offset="100%" stopColor="#d49a1e" />
            </linearGradient>
            <radialGradient id="pp-skin" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#fff0db" />
              <stop offset="100%" stopColor="#e0b48a" />
            </radialGradient>
          </defs>

          {/* Paper plane body */}
          <path d="M20 160 L260 80 L150 130 L260 80 L180 200 L150 130 L20 160 Z"
                fill="url(#pp-plane)" stroke="#a13a72" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M150 130 L20 160 L180 200 Z" fill="#ffadd1" opacity="0.85" stroke="#a13a72" strokeWidth="1.4" />

          {/* Girl sitting */}
          <g transform="translate(140,80)">
            {/* Dress */}
            <path d="M-22 40 Q0 30 22 40 L34 80 Q0 92 -34 80 Z" fill="url(#pp-dress)" stroke="#7a5210" strokeWidth="1.2" />
            <path d="M-22 40 Q0 30 22 40" stroke="#fff" strokeWidth="1.4" fill="none" opacity="0.7" />
            {/* Legs */}
            <path d="M-12 80 Q-14 100 -8 110 L4 108 Q2 96 0 80 Z" fill="url(#pp-skin)" stroke="#7a4a18" strokeWidth="0.9" />
            <path d="M2 80 Q4 100 10 110 L20 108 Q16 96 14 80 Z" fill="url(#pp-skin)" stroke="#7a4a18" strokeWidth="0.9" />
            {/* Shoes */}
            <ellipse cx="-3" cy="111" rx="7" ry="3.4" fill="#ff5a8a" stroke="#7a1e44" strokeWidth="0.8" />
            <ellipse cx="14" cy="110" rx="7" ry="3.4" fill="#ff5a8a" stroke="#7a1e44" strokeWidth="0.8" />

            {/* Torso visible top */}
            <path d="M-18 18 Q0 14 18 18 L22 42 Q0 46 -22 42 Z" fill="url(#pp-dress)" stroke="#7a5210" strokeWidth="1" />

            {/* Waving arm */}
            <g className="pp-arm" style={{ transformOrigin: "16px 22px" }}>
              <path d="M14 18 Q30 0 40 -18 Q44 -14 42 -8 Q34 12 22 26 Z" fill="url(#pp-skin)" stroke="#7a4a18" strokeWidth="0.9" />
              <circle cx="42" cy="-16" r="5" fill="url(#pp-skin)" stroke="#7a4a18" strokeWidth="0.9" />
            </g>
            {/* Resting arm */}
            <path d="M-16 20 Q-30 32 -32 50 Q-26 52 -22 46 Q-14 36 -10 28 Z" fill="url(#pp-skin)" stroke="#7a4a18" strokeWidth="0.9" />

            {/* Long blonde hair behind */}
            <path d="M-30 -2 Q-44 40 -30 80 Q-18 60 -22 30 Z" fill="url(#pp-hair)" />
            <path d="M30 -2 Q44 40 30 80 Q18 60 22 30 Z" fill="url(#pp-hair)" />

            {/* Head */}
            <ellipse cx="0" cy="-4" rx="22" ry="24" fill="url(#pp-skin)" stroke="#7a4a18" strokeWidth="1.2" />
            {/* Hair top + bangs */}
            <path d="M-24 -10 Q-26 -28 0 -30 Q26 -28 24 -10 Q18 -22 0 -24 Q-18 -22 -24 -10 Z" fill="url(#pp-hair)" />
            <path d="M-20 -8 Q-10 -2 0 -6 Q10 -2 20 -8" stroke="#b07a14" strokeWidth="1" fill="none" />
            {/* Crown */}
            <path d="M-10 -26 L-6 -34 L-2 -28 L2 -36 L6 -28 L10 -34 L12 -26 Z" fill="#ffd95c" stroke="#7a5210" strokeWidth="0.8" />
            <circle cx="0" cy="-30" r="1.6" fill="#ff5a8a" />

            {/* Innocent eyes */}
            <g className="puss-eyes">
              <ellipse cx="-8" cy="-2" rx="4.4" ry="5.4" fill="#fff" />
              <ellipse cx="8" cy="-2" rx="4.4" ry="5.4" fill="#fff" />
              <ellipse cx="-8" cy="-1" rx="3" ry="4" fill="#3a7ad4" />
              <ellipse cx="8" cy="-1" rx="3" ry="4" fill="#3a7ad4" />
              <circle cx="-8" cy="0" r="1.5" fill="#0a0a0a" />
              <circle cx="8" cy="0" r="1.5" fill="#0a0a0a" />
              <circle cx="-9.5" cy="-3" r="1" fill="#fff" />
              <circle cx="6.5" cy="-3" r="1" fill="#fff" />
            </g>
            {/* Lashes */}
            <path d="M-12 -6 Q-8 -8 -4 -6" stroke="#1a0a04" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M4 -6 Q8 -8 12 -6" stroke="#1a0a04" strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Smile + blush */}
            <path d="M-4 8 Q0 12 4 8" stroke="#a01b3a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <ellipse cx="-12" cy="6" rx="4" ry="2.4" fill="#ff8aa8" opacity="0.6" />
            <ellipse cx="12" cy="6" rx="4" ry="2.4" fill="#ff8aa8" opacity="0.6" />
          </g>
        </svg>
      </div>

      <p className="-mt-2 text-center text-sm font-display font-bold text-primary-foreground bg-gradient-primary px-4 py-1.5 rounded-full shadow-glow">
        {from} → Kağıt Uçak Yolculuğu ✈️
      </p>
    </div>
  );
}
