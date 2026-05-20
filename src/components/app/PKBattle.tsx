import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Swords, Crown } from "lucide-react";

export type PKBattleHandle = { addContribution: (team: "blue" | "red", amount: number) => void };

const TOTAL_SECONDS = 5 * 60;

export const PKBattle = forwardRef<PKBattleHandle, {}>(function PKBattle(_props, ref) {
  const [blue, setBlue] = useState(0);
  const [red, setRed] = useState(0);
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [ended, setEnded] = useState(false);

  useImperativeHandle(ref, () => ({
    addContribution(team, amount) {
      if (ended) return;
      if (team === "blue") setBlue(b => b + amount);
      else setRed(r => r + amount);
    },
  }), [ended]);

  useEffect(() => {
    if (ended) return;
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          setEnded(true);
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ended]);

  // Restart 8s after end
  useEffect(() => {
    if (!ended) return;
    const t = setTimeout(() => {
      setBlue(0); setRed(0); setSeconds(TOTAL_SECONDS); setEnded(false);
    }, 8000);
    return () => clearTimeout(t);
  }, [ended]);

  const total = blue + red;
  const bluePct = total === 0 ? 50 : Math.round((blue / total) * 100);
  const redPct = 100 - bluePct;
  const winner: "blue" | "red" | "tie" | null = ended
    ? blue === red ? "tie" : blue > red ? "blue" : "red"
    : null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mx-4 mt-2 mb-1 relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-r from-sky-950/60 via-card/80 to-rose-950/60 p-3 shadow-glow">
      {/* shimmer */}
      <div className="absolute inset-0 pointer-events-none gift-banner-shine opacity-40" />
      <div className="relative flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Swords className="size-3.5 text-gold" />
          <span className="text-[10px] font-display font-extrabold tracking-[0.18em] bg-gradient-to-r from-sky-300 via-gold to-rose-300 bg-clip-text text-transparent">
            PK SAVAŞI · CANLI
          </span>
        </div>
        <span className={`text-[11px] font-mono font-bold tabular-nums px-2 py-0.5 rounded-full border ${
          seconds < 30 ? "text-destructive border-destructive animate-pulse" : "text-gold border-accent/40"
        }`}>⏱ {mm}:{ss}</span>
      </div>

      {/* Versus bar */}
      <div className="relative h-7 rounded-full overflow-hidden bg-secondary border border-border flex">
        <div
          className="h-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-500 flex items-center justify-start pl-2"
          style={{ width: `${bluePct}%` }}
        >
          {bluePct >= 15 && <span className="text-[10px] font-bold text-white drop-shadow">MAVİ {blue}</span>}
        </div>
        <div
          className="h-full bg-gradient-to-l from-rose-500 to-red-700 transition-all duration-500 flex items-center justify-end pr-2"
          style={{ width: `${redPct}%` }}
        >
          {redPct >= 15 && <span className="text-[10px] font-bold text-white drop-shadow">{red} KIRMIZI</span>}
        </div>
        {/* center diamond */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-4 rotate-45 bg-gold shadow-glow border border-background" />
      </div>

      <div className="flex justify-between mt-1.5 text-[10px] font-semibold">
        <span className="text-sky-300">{bluePct}%</span>
        <span className="text-muted-foreground">Çift koltuk = Mavi · Tek koltuk = Kırmızı</span>
        <span className="text-rose-300">{redPct}%</span>
      </div>

      {winner && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in">
          <div className={`flex items-center gap-2 px-5 py-2 rounded-full shadow-glow animate-scale-in ${
            winner === "blue" ? "bg-gradient-to-r from-sky-500 to-blue-700" :
            winner === "red" ? "bg-gradient-to-r from-rose-500 to-red-700" :
            "bg-gradient-to-r from-gray-500 to-gray-700"
          }`}>
            <Crown className="size-4 text-gold drop-shadow" />
            <span className="text-sm font-display font-extrabold text-white glow-text">
              {winner === "tie" ? "BERABERE!" : winner === "blue" ? "MAVİ TAKIM KAZANDI! 👑" : "KIRMIZI TAKIM KAZANDI! 👑"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});