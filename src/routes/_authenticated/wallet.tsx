import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, TrendingUp, Sparkles, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/wallet")({ component: WalletPage });

const PACKS = [
  { coins: 100, price: "0.99 €" },
  { coins: 500, price: "4.99 €", bonus: "Popüler" },
  { coins: 1000, price: "9.99 €" },
  { coins: 2500, price: "24.99 €", bonus: "+10%" },
  { coins: 5000, price: "49.99 €", bonus: "+20%" },
];

function WalletPage() {
  const { profile, user, refreshProfile } = useAuth();
  const [buying, setBuying] = useState<number | null>(null);
  const buy = async (amount: number, price: string) => {
    if (!user || buying !== null) return;
    setBuying(amount);
    try {
      await supabase
        .from("profiles")
        .update({ coin_balance: (profile?.coin_balance ?? 0) + amount })
        .eq("id", user.id);
      await refreshProfile();
      toast.success("Satın alım başarılı! Hesabınıza Coin yüklendi.", {
        description: `+${amount.toLocaleString()} Coin • ${price}`,
        icon: <Check className="size-4 text-gold" />,
      });
    } finally {
      setTimeout(() => setBuying(null), 400);
    }
  };
  return (
    <div className="bg-gradient-hero min-h-screen px-5 pt-12 pb-28">
      <h1 className="text-2xl font-display font-bold mb-6">Mağaza</h1>

      <div className="relative bg-gradient-primary rounded-3xl p-6 shadow-glow mb-8 overflow-hidden">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-gold/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -left-8 size-32 rounded-full bg-primary-foreground/10 blur-3xl" />
        <p className="text-sm text-primary-foreground/80 relative">Mevcut bakiyen</p>
        <div className="flex items-center gap-3 mt-2 relative">
          <div className="relative">
            <div className="absolute inset-0 bg-gold/50 blur-xl rounded-full animate-pulse" />
            <Coins className="size-12 text-gold relative drop-shadow-[0_0_12px_rgba(255,200,60,0.8)]" />
          </div>
          <span
            key={profile?.coin_balance ?? 0}
            className="text-5xl font-display font-bold text-primary-foreground tracking-tight animate-scale-in"
          >
            {(profile?.coin_balance ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-primary-foreground/80 relative">
          <TrendingUp className="size-3.5" /> Toplam kazanç: {(profile?.coins_earned ?? 0).toLocaleString()}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-gold" />
        <h2 className="text-sm font-display font-semibold">Coin paketleri</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PACKS.map((p) => (
          <button
            key={p.coins}
            onClick={() => buy(p.coins, p.price)}
            disabled={buying !== null}
            className="group bg-gradient-card border border-border rounded-3xl p-4 text-left hover:shadow-glow hover:border-gold/40 transition-all relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {p.bonus && (
              <span className="absolute top-2 right-2 bg-gradient-to-r from-gold to-gold/80 text-background text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                {p.bonus}
              </span>
            )}
            <div className="relative">
              <div className="absolute inset-0 bg-gold/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition" />
              <Coins className="size-8 text-gold mb-2 relative drop-shadow-[0_0_8px_rgba(255,200,60,0.6)]" />
            </div>
            <p className="text-xl font-display font-bold">{p.coins.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Coin</p>
            <div className="mt-3 bg-gradient-primary text-primary-foreground text-xs font-bold py-2 rounded-xl text-center">
              {buying === p.coins ? "Yükleniyor…" : p.price}
            </div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-6">
        Demo ödeme — gerçek satın alma için ödeme sağlayıcısı entegre edilebilir.
      </p>
    </div>
  );
}
