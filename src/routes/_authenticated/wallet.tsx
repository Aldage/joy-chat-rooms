import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, Plus, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({ component: WalletPage });

const PACKS = [
  { coins: 500, price: "₺49" },
  { coins: 1500, price: "₺129", bonus: "+10%" },
  { coins: 5000, price: "₺399", bonus: "+20%" },
  { coins: 15000, price: "₺999", bonus: "+30%" },
];

function WalletPage() {
  const { profile, user, refreshProfile } = useAuth();
  const buy = async (amount: number) => {
    if (!user) return;
    await supabase.from("profiles").update({ coin_balance: (profile?.coin_balance ?? 0) + amount }).eq("id", user.id);
    await refreshProfile();
    toast.success(`${amount} Coin yüklendi! (demo)`);
  };
  return (
    <div className="bg-gradient-hero min-h-screen px-5 pt-12">
      <h1 className="text-2xl font-display font-bold mb-6">Cüzdan</h1>

      <div className="bg-gradient-primary rounded-3xl p-6 shadow-glow mb-6">
        <p className="text-sm text-primary-foreground/80">Mevcut bakiyen</p>
        <div className="flex items-center gap-2 mt-1">
          <Coins className="size-7 text-gold" />
          <span className="text-4xl font-display font-bold text-primary-foreground">{profile?.coin_balance ?? 0}</span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-primary-foreground/80">
          <TrendingUp className="size-3.5" /> Toplam kazanç: {profile?.coins_earned ?? 0}
        </div>
      </div>

      <h2 className="text-sm font-display font-semibold mb-3">Coin paketleri</h2>
      <div className="grid grid-cols-2 gap-3">
        {PACKS.map(p => (
          <button key={p.coins} onClick={() => buy(p.coins)} className="bg-gradient-card border border-border rounded-3xl p-4 text-left hover:shadow-glow transition relative">
            {p.bonus && <span className="absolute top-2 right-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{p.bonus}</span>}
            <Coins className="size-6 text-gold mb-2" />
            <p className="text-lg font-display font-bold">{p.coins.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Coin</p>
            <div className="mt-3 bg-gradient-primary text-primary-foreground text-xs font-bold py-2 rounded-xl text-center">{p.price}</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-6">Demo ödeme — gerçek satın alma için Stripe entegre edilebilir.</p>
    </div>
  );
}
