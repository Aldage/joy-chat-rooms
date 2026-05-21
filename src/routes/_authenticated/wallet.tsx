import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, TrendingUp, Sparkles, Check, Store, ShoppingBag, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { FRAMES, ENTRIES, type StoreItem } from "@/lib/store-items";

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
  const [tab, setTab] = useState<"coins" | "store">("coins");
  const [storeTab, setStoreTab] = useState<"frame" | "entry">("frame");
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const loadOwned = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_items").select("item_id").eq("user_id", user.id);
    setOwned(new Set((data ?? []).map(d => d.item_id)));
  };

  useEffect(() => { loadOwned(); }, [user?.id]);

  const buy = async (amount: number, price: string) => {
    if (!user || buying !== null) return;
    setBuying(amount);
    try {
      const { error } = await supabase.rpc("topup_coins" as any, { _amount: amount });
      if (error) { toast.error(error.message); return; }
      await refreshProfile();
      toast.success("Satın alım başarılı! Hesabınıza Coin yüklendi.", {
        description: `+${amount.toLocaleString()} Coin • ${price}`,
        icon: <Check className="size-4 text-gold" />,
      });
    } finally {
      setTimeout(() => setBuying(null), 400);
    }
  };

  const purchaseItem = async (item: StoreItem) => {
    if (!user || purchasingId) return;
    if (owned.has(item.id)) { toast.message("Bu eşya zaten envanterinde."); return; }
    if ((profile?.coin_balance ?? 0) < item.cost) {
      toast.error("Yetersiz bakiye — önce coin yükle!");
      return;
    }
    setPurchasingId(item.id);
    const { error } = await supabase.rpc("purchase_store_item" as any, {
      _item_id: item.id, _item_type: item.type, _cost: item.cost,
    });
    setPurchasingId(null);
    if (error) { toast.error(error.message); return; }
    setOwned(prev => new Set(prev).add(item.id));
    await refreshProfile();
    toast.success(`✨ "${item.name}" envanterine eklendi!`);
  };

  return (
    <div className="bg-gradient-hero min-h-screen px-5 pt-12 pb-32">
      <h1 className="text-2xl font-display font-bold mb-4">Cüzdan & Mağaza</h1>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-full p-1 flex mb-6">
        <button
          onClick={() => setTab("coins")}
          className={`flex-1 py-2.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${tab==="coins"?"bg-gradient-primary text-primary-foreground shadow-glow":"text-muted-foreground"}`}
        >
          <Coins className="size-3.5" /> Coin Paketleri
        </button>
        <button
          onClick={() => setTab("store")}
          className={`flex-1 py-2.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${tab==="store"?"bg-gradient-primary text-primary-foreground shadow-glow":"text-muted-foreground"}`}
        >
          <Store className="size-3.5" /> VIP Mağaza
        </button>
      </div>

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

      {tab === "coins" ? (
        <>
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
        </>
      ) : (
        <>
          <div className="bg-card border border-border rounded-full p-1 flex mb-4 text-xs">
            <button onClick={() => setStoreTab("frame")} className={`flex-1 py-2 rounded-full font-semibold transition ${storeTab==="frame"?"bg-gradient-primary text-primary-foreground shadow-glow":"text-muted-foreground"}`}>
              Profil Çerçeveleri
            </button>
            <button onClick={() => setStoreTab("entry")} className={`flex-1 py-2 rounded-full font-semibold transition ${storeTab==="entry"?"bg-gradient-primary text-primary-foreground shadow-glow":"text-muted-foreground"}`}>
              Giriş Efektleri
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(storeTab === "frame" ? FRAMES : ENTRIES).map(item => {
              const Icon = item.icon;
              const isOwned = owned.has(item.id);
              const cantAfford = (profile?.coin_balance ?? 0) < item.cost;
              return (
                <div key={item.id} className="bg-gradient-card border border-border rounded-3xl p-3 shadow-soft relative overflow-hidden">
                  <div className={`aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center relative overflow-hidden mb-2`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <Icon className="size-12 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] relative" />
                    {isOwned && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check className="size-2.5" /> SAHİP
                      </span>
                    )}
                  </div>
                  <p className="font-display font-bold text-sm truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                  <button
                    onClick={() => purchaseItem(item)}
                    disabled={isOwned || cantAfford || purchasingId === item.id}
                    className={`mt-2 w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
                      isOwned ? "bg-secondary text-muted-foreground" :
                      cantAfford ? "bg-secondary text-muted-foreground" :
                      "bg-gradient-primary text-primary-foreground shadow-glow active:scale-[0.97]"
                    } disabled:cursor-not-allowed`}
                  >
                    {isOwned ? <><ShoppingBag className="size-3" /> Envanterde</>
                      : cantAfford ? <><Lock className="size-3" /> {item.cost.toLocaleString()}</>
                      : <><Coins className="size-3 text-gold" /> {purchasingId===item.id?"…":item.cost.toLocaleString()}</>}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-6">
            Sahip olduğun eşyaları <span className="text-gold font-semibold">Profil</span> sayfasından aktifleştirebilirsin.
          </p>
        </>
      )}
    </div>
  );
}
