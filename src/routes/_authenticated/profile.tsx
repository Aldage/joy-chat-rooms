import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Edit3, Coins, Trophy, Sparkles, Swords, Crown, Zap, Flame, Star, Lock, ShoppingBag, Check } from "lucide-react";
import { useEffect } from "react";
import { ALL_ITEMS, findItem, type StoreItem } from "@/lib/store-items";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

const AVATAR_PRESETS = [
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Aria",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Nova",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Kai",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Luna",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Zane",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Mira",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Rex",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Iris",
];

type Badge = { key: string; name: string; icon: typeof Crown; color: string; threshold: number };
const BADGES: Badge[] = [
  { key: "war", name: "Savaş Kralı", icon: Swords, color: "from-rose-500 to-orange-500", threshold: 0 },
  { key: "beauty", name: "Güzellik İkonu", icon: Crown, color: "from-fuchsia-500 to-pink-500", threshold: 500 },
  { key: "fast", name: "Hızlı Parmak", icon: Zap, color: "from-amber-400 to-yellow-500", threshold: 2000 },
  { key: "legend", name: "Efsane", icon: Flame, color: "from-violet-500 to-indigo-500", threshold: 5000 },
];

function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState<StoreItem[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_items").select("item_id").eq("user_id", user.id).then(({ data }) => {
      const items = (data ?? []).map(d => findItem(d.item_id)).filter(Boolean) as StoreItem[];
      setInventory(items);
    });
  }, [user?.id]);

  const activeFrame = findItem((profile as any)?.active_frame);
  const activeEntry = findItem((profile as any)?.active_entry_effect);

  const activate = async (item: StoreItem) => {
    if (!user) return;
    const col = item.type === "frame" ? "active_frame" : "active_entry_effect";
    const current = item.type === "frame" ? (profile as any)?.active_frame : (profile as any)?.active_entry_effect;
    const next = current === item.id ? null : item.id;
    const { error } = await supabase.from("profiles").update({ [col]: next } as any).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success(next ? `✨ "${item.name}" aktif!` : "Devre dışı bırakıldı");
  };

  const openEdit = () => {
    setName(profile?.display_name ?? "");
    setBio(profile?.bio ?? "");
    setAvatar(profile?.avatar_url ?? null);
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || "Guest", bio, avatar_url: avatar })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    setOpen(false);
    toast.success("Profil güncellendi ✨");
  };

  const earned = profile?.coins_earned ?? 0;

  return (
    <div className="bg-gradient-hero min-h-screen px-5 pt-12 pb-28">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-bold">Profil</h1>
        <button
          onClick={async () => { await signOut(); nav({ to: "/login" }); }}
          className="size-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          aria-label="Çıkış yap"
        >
          <LogOut className="size-4 text-muted-foreground" />
        </button>
      </div>

      {/* Top profile card */}
      <div className="relative bg-gradient-card border border-border rounded-3xl p-6 shadow-soft text-center overflow-hidden">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-gradient-primary opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 size-40 rounded-full bg-accent/30 blur-3xl pointer-events-none" />

        <div className="relative mx-auto w-fit">
          <div className={`absolute inset-0 rounded-full blur-md opacity-80 animate-pulse bg-gradient-to-tr ${activeFrame ? activeFrame.gradient : "from-primary via-accent to-primary-glow"}`} />
          <div className={`relative size-28 rounded-full p-[3px] shadow-glow bg-gradient-to-tr ${activeFrame ? activeFrame.gradient : "from-primary via-accent to-primary-glow"}`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="size-full rounded-full object-cover bg-card" />
            ) : (
              <div className="size-full rounded-full bg-card flex items-center justify-center text-4xl font-display font-bold text-foreground">
                {profile?.display_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-gradient-primary border-2 border-background flex items-center justify-center shadow-glow">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-display font-bold">{profile?.display_name}</h2>
        <p className="text-xs text-muted-foreground mt-1 font-mono">ID: #{user?.id.slice(0, 8).toUpperCase()}</p>

        <div className="mt-4 bg-secondary/60 border border-border rounded-2xl px-4 py-3 text-left">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Biyografi</p>
          <p className="text-sm text-foreground/90 italic">
            {profile?.bio || "Henüz bir biyografi eklenmedi. Kendinden bahsetmek için profili düzenle ✨"}
          </p>
        </div>

        <button
          onClick={openEdit}
          className="mt-5 inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold shadow-glow hover:opacity-90 active:scale-[0.98] transition"
        >
          <Edit3 className="size-4" /> Profili Düzenle
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="relative bg-gradient-card border border-border rounded-2xl p-4 overflow-hidden">
          <div className="absolute -top-6 -right-6 size-20 rounded-full bg-[var(--gold)]/30 blur-2xl" />
          <div className="relative">
            <Coins className="size-5 text-gold mb-2" />
            <p className="text-2xl font-display font-bold text-gold drop-shadow-[0_0_10px_oklch(0.82_0.16_85/0.5)]">
              {profile?.coin_balance ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Cüzdan Bakiyesi</p>
          </div>
        </div>
        <div className="relative bg-gradient-card border border-border rounded-2xl p-4 overflow-hidden">
          <div className="absolute -top-6 -right-6 size-20 rounded-full bg-accent/40 blur-2xl" />
          <div className="relative">
            <Trophy className="size-5 text-accent mb-2" />
            <p className="text-2xl font-display font-bold">{BADGES.filter(b => earned >= b.threshold).length}/{BADGES.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rozet & Madalya</p>
          </div>
        </div>
      </div>

      {/* Badge showcase */}
      <div className="mt-5 bg-gradient-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="size-4 text-gold" />
            <h3 className="font-display font-bold">Rozet Vitrini</h3>
          </div>
          <span className="text-xs text-muted-foreground">{earned} kazanılan coin</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map((b) => {
            const unlocked = earned >= b.threshold;
            const Icon = b.icon;
            return (
              <div key={b.key} className="flex flex-col items-center text-center">
                <div className={`relative size-16 rounded-2xl flex items-center justify-center ${unlocked ? `bg-gradient-to-br ${b.color} shadow-[0_0_24px_-4px] shadow-current` : "bg-secondary/40 border border-border"}`}>
                  <Icon className={`size-7 ${unlocked ? "text-white drop-shadow" : "text-muted-foreground/40"}`} />
                  {!unlocked && (
                    <div className="absolute inset-0 rounded-2xl bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                      <Lock className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className={`mt-2 text-[10px] font-semibold leading-tight ${unlocked ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {b.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory */}
      <div className="mt-5 bg-gradient-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-accent" />
            <h3 className="font-display font-bold">Envanterim</h3>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {activeFrame ? `Çerçeve: ${activeFrame.name}` : "Çerçeve: yok"}{" · "}
            {activeEntry ? `Giriş: ${activeEntry.name}` : "Giriş: yok"}
          </span>
        </div>
        {inventory.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Henüz eşya yok. <span className="text-gold font-semibold">Cüzdan → VIP Mağaza</span>'dan satın al.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {inventory.map(item => {
              const Icon = item.icon;
              const isActive =
                item.type === "frame"
                  ? (profile as any)?.active_frame === item.id
                  : (profile as any)?.active_entry_effect === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => activate(item)}
                  className={`relative rounded-2xl p-2 border transition text-left ${
                    isActive
                      ? "border-gold bg-gold/10 shadow-glow"
                      : "border-border bg-card hover:border-accent/60"
                  }`}
                >
                  <div className={`aspect-square rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-1.5`}>
                    <Icon className="size-7 text-white drop-shadow" />
                  </div>
                  <p className="text-[10px] font-bold truncate">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {item.type === "frame" ? "Çerçeve" : "Giriş Efekti"}
                  </p>
                  {isActive && (
                    <span className="absolute -top-1 -right-1 size-5 rounded-full bg-gold flex items-center justify-center shadow-glow">
                      <Check className="size-3 text-background" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-gradient-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Profili Düzenle</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Avatar Seç</p>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_PRESETS.map((url) => {
                  const active = avatar === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`relative aspect-square rounded-full p-[2px] transition ${active ? "bg-gradient-to-tr from-primary via-accent to-primary-glow shadow-glow scale-105" : "bg-border hover:bg-muted"}`}
                    >
                      <img src={url} alt="" className="size-full rounded-full bg-card object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Kullanıcı Adı</p>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Biyografi</p>
              <Textarea value={bio ?? ""} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={140} placeholder="Kendinden bahset..." />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{(bio ?? "").length}/140</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
