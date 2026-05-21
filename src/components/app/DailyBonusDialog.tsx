import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { Coins, Sparkles } from "lucide-react";

export function DailyBonusDialog() {
  const { pendingDailyBonus, acknowledgeDailyBonus } = useAuth();
  const open = pendingDailyBonus > 0;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) acknowledgeDailyBonus(); }}>
      <DialogContent className="max-w-xs border-none p-0 overflow-hidden bg-transparent shadow-none">
        <DialogTitle className="sr-only">Günlük Giriş Bonusu</DialogTitle>
        <div className="relative rounded-3xl bg-gradient-to-br from-[oklch(0.32_0.16_290)] via-[oklch(0.4_0.2_320)] to-[oklch(0.45_0.22_30)] p-6 text-center shadow-[0_25px_80px_-15px_rgba(255,180,80,0.55)] border border-amber-200/30">
          <div className="absolute -top-6 -right-6 size-32 rounded-full bg-amber-300/30 blur-3xl animate-pulse" />
          <div className="absolute -bottom-8 -left-6 size-32 rounded-full bg-fuchsia-400/30 blur-3xl animate-pulse" />
          <div className="relative">
            <div className="mx-auto size-20 rounded-full bg-gradient-to-tr from-amber-300 via-gold to-amber-500 flex items-center justify-center shadow-[0_0_40px_rgba(255,200,80,0.7)] mb-3">
              <span className="text-4xl">🎁</span>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.25em] font-display font-extrabold text-amber-200">
              <Sparkles className="size-3" /> Günlük Bonus
            </p>
            <h2 className="mt-2 text-2xl font-display font-extrabold text-white drop-shadow">
              Hoş geldin! 🎉
            </h2>
            <p className="text-sm text-white/80 mt-1">
              Bugün de bizi seçtiğin için teşekkürler.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-2 border border-white/20">
              <Coins className="size-5 text-gold" />
              <span className="text-2xl font-display font-extrabold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                +{pendingDailyBonus}
              </span>
              <span className="text-sm font-bold text-white/90">coin</span>
            </div>
            <button
              onClick={acknowledgeDailyBonus}
              className="mt-5 w-full rounded-2xl bg-white text-[oklch(0.3_0.18_290)] font-display font-extrabold py-3 text-sm shadow-lg hover:bg-amber-50 transition active:scale-[0.98]"
            >
              Hemen Topla 🪙
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}