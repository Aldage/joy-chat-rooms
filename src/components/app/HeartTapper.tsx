import { useCallback, useEffect, useRef } from "react";

const EMOJIS = ["❤️", "💖", "🌹", "💕", "💗", "💘"];

export function HeartTapper({ onTap }: { onTap: () => void }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const spawn = useCallback(() => {
    onTap();
    const layer = layerRef.current;
    if (!layer) return;
    const node = document.createElement("span");
    node.textContent = EMOJIS[(Math.random() * EMOJIS.length) | 0];
    const drift = (Math.random() * 120 - 60).toFixed(0); // -60..60 px
    const rot = (Math.random() * 60 - 30).toFixed(0);
    const size = 18 + Math.random() * 18;
    const dur = 1400 + Math.random() * 700;
    node.style.cssText = `
      position:absolute; left:50%; bottom:0;
      transform: translateX(-50%);
      font-size:${size}px; line-height:1;
      pointer-events:none; will-change: transform, opacity;
      filter: drop-shadow(0 4px 10px rgba(255,80,140,0.55));
      --dx:${drift}px; --rot:${rot}deg;
      animation: heart-rise ${dur}ms cubic-bezier(.2,.7,.3,1) forwards;
    `;
    node.addEventListener("animationend", () => node.remove(), { once: true });
    layer.appendChild(node);
  }, [onTap]);

  // Hold to spam (touch + mouse)
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    let timer: number | null = null;
    const start = (e: Event) => {
      e.preventDefault();
      spawn();
      timer = window.setInterval(spawn, 80);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    btn.addEventListener("pointerdown", start);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      stop();
      btn.removeEventListener("pointerdown", start);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [spawn]);

  return (
    <div className="relative">
      {/* Particle layer floats above the button, ignores clicks */}
      <div
        ref={layerRef}
        className="pointer-events-none absolute left-1/2 bottom-12 -translate-x-1/2"
        style={{ width: 1, height: 1, zIndex: 40 }}
        aria-hidden
      />
      <button
        ref={btnRef}
        type="button"
        aria-label="Kalp gönder"
        className="size-11 rounded-full border border-accent/40 bg-accent/20 backdrop-blur-md
                   flex items-center justify-center text-xl shadow-glow active:scale-90 transition"
      >
        <span className="drop-shadow">❤️</span>
      </button>
    </div>
  );
}