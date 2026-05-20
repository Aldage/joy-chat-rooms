import { useEffect, useRef, useState } from "react";

// "Masum Kedi" — Puss-in-Boots style with synced jaw (meow), big glossy eyes,
// raised paw, ambient sparkles. Pure SVG + CSS. ~3s show.
export function PussCat({ from }: { from: string }) {
  const [phase, setPhase] = useState<"in" | "show" | "out">("in");
  const sparkRef = useRef<{ id: number; x: number; y: number; d: number; s: number }[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 350);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Pre-build sparkle positions once
  if (sparkRef.current.length === 0) {
    sparkRef.current = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 280,
      y: 50 + (Math.random() - 0.5) * 280,
      d: Math.random() * 0.6,
      s: 0.6 + Math.random() * 0.9,
    }));
  }

  return (
    <div className={`puss-wrap ${phase === "out" ? "puss-out" : ""}`}>
      {/* sparkles ring */}
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

      <svg viewBox="0 0 240 240" width="260" height="260" className="puss-svg drop-shadow-[0_18px_40px_rgba(255,170,90,0.45)]">
        <defs>
          <radialGradient id="furBody" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#fde2b3" />
            <stop offset="60%" stopColor="#e8a85a" />
            <stop offset="100%" stopColor="#a3672a" />
          </radialGradient>
          <radialGradient id="eyeGreen" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#d3ff7a" />
            <stop offset="55%" stopColor="#5fbf2e" />
            <stop offset="100%" stopColor="#1f5e10" />
          </radialGradient>
          <radialGradient id="eyeYellow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fff6c2" />
            <stop offset="70%" stopColor="#f4c842" />
            <stop offset="100%" stopColor="#8a5a10" />
          </radialGradient>
          <radialGradient id="innerEar" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffb8c5" />
            <stop offset="100%" stopColor="#b86a78" />
          </radialGradient>
        </defs>

        {/* Ears */}
        <path d="M55 70 L70 25 L100 65 Z" fill="url(#furBody)" stroke="#7a4a18" strokeWidth="2" />
        <path d="M185 70 L170 25 L140 65 Z" fill="url(#furBody)" stroke="#7a4a18" strokeWidth="2" />
        <path d="M68 60 L75 38 L92 62 Z" fill="url(#innerEar)" />
        <path d="M172 60 L165 38 L148 62 Z" fill="url(#innerEar)" />

        {/* Head */}
        <ellipse cx="120" cy="115" rx="78" ry="72" fill="url(#furBody)" stroke="#7a4a18" strokeWidth="2.5" />

        {/* Cheek tufts */}
        <path d="M48 130 q12 14 30 16 q-22 6 -34 -2 Z" fill="#fde2b3" opacity="0.85" />
        <path d="M192 130 q-12 14 -30 16 q22 6 34 -2 Z" fill="#fde2b3" opacity="0.85" />

        {/* Forehead stripes */}
        <path d="M110 55 q-4 18 -10 28" stroke="#7a4a18" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M120 53 q0 18 -2 30" stroke="#7a4a18" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M130 55 q4 18 10 28" stroke="#7a4a18" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Eyes — huge glossy "innocent" eyes */}
        <g className="puss-eyes">
          <ellipse cx="92" cy="115" rx="22" ry="26" fill="#fff" />
          <ellipse cx="148" cy="115" rx="22" ry="26" fill="#fff" />
          {/* iris green-yellow */}
          <ellipse cx="93" cy="118" rx="18" ry="22" fill="url(#eyeGreen)" />
          <ellipse cx="147" cy="118" rx="18" ry="22" fill="url(#eyeGreen)" />
          {/* yellow inner ring */}
          <ellipse cx="93" cy="118" rx="11" ry="16" fill="url(#eyeYellow)" opacity="0.9" />
          <ellipse cx="147" cy="118" rx="11" ry="16" fill="url(#eyeYellow)" opacity="0.9" />
          {/* pupils — slit, dilated */}
          <ellipse cx="93" cy="119" rx="5" ry="14" fill="#0a0a0a" />
          <ellipse cx="147" cy="119" rx="5" ry="14" fill="#0a0a0a" />
          {/* big sweet highlights */}
          <ellipse cx="86" cy="108" rx="6" ry="7" fill="#fff" />
          <ellipse cx="140" cy="108" rx="6" ry="7" fill="#fff" />
          <circle cx="98" cy="124" r="2.5" fill="#fff" opacity="0.9" />
          <circle cx="152" cy="124" r="2.5" fill="#fff" opacity="0.9" />
        </g>

        {/* Nose */}
        <path d="M115 148 q5 -6 10 0 q-2 6 -5 7 q-3 -1 -5 -7 Z" fill="#c64a6a" stroke="#6b1f33" strokeWidth="1.2" />

        {/* Mouth + jaw (animated) */}
        <line x1="120" y1="155" x2="120" y2="162" stroke="#5a2d12" strokeWidth="1.5" />
        <g className="puss-jaw" style={{ transformOrigin: "120px 162px" }}>
          <path d="M100 162 q20 18 40 0 q-5 14 -20 16 q-15 -2 -20 -16 Z" fill="#2d1408" />
          <path d="M108 168 q12 9 24 0 q-5 8 -12 9 q-7 -1 -12 -9 Z" fill="#e85a7a" />
          {/* fangs */}
          <path d="M111 164 l2 6 l2 -6 Z" fill="#fff" />
          <path d="M127 164 l2 6 l2 -6 Z" fill="#fff" />
        </g>

        {/* Whiskers */}
        <g stroke="#fff8e5" strokeWidth="1.4" strokeLinecap="round" opacity="0.95">
          <line x1="55" y1="150" x2="95" y2="148" />
          <line x1="52" y1="160" x2="95" y2="156" />
          <line x1="185" y1="150" x2="145" y2="148" />
          <line x1="188" y1="160" x2="145" y2="156" />
        </g>

        {/* Raised paw (waving) */}
        <g className="puss-paw" style={{ transformOrigin: "200px 200px" }}>
          <ellipse cx="200" cy="190" rx="22" ry="18" fill="url(#furBody)" stroke="#7a4a18" strokeWidth="2" />
          <ellipse cx="192" cy="184" rx="4" ry="5" fill="#fde2b3" />
          <ellipse cx="200" cy="180" rx="4" ry="5" fill="#fde2b3" />
          <ellipse cx="208" cy="184" rx="4" ry="5" fill="#fde2b3" />
          <ellipse cx="200" cy="194" rx="9" ry="6" fill="#e6889c" />
        </g>
      </svg>

      <p className="mt-2 text-center text-sm font-display font-bold text-primary-foreground bg-gradient-primary px-4 py-1.5 rounded-full shadow-glow">
        {from} → Miyaaav! 🐾
      </p>
    </div>
  );
}
