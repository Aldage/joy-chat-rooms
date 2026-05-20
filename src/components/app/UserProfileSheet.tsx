import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, UserPlus, VolumeX, LogOut as KickIcon, Ban, Crown, Sparkles } from "lucide-react";

export type ProfileTarget = {
  userId: string;
  seatId?: string;
  seatIndex?: number;
  isMuted?: boolean;
};

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  coins_earned: number;
  created_at: string;
};

function levelFromCoins(c: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, c)) / 3) + 1);
}

export function UserProfileSheet({
  target,
  viewerId,
  isOwner,
  onClose,
  onMute,
  onKickSeat,
  onBan,
  onMakeMod,
}: {
  target: ProfileTarget | null;
  viewerId?: string | null;
  isOwner: boolean;
  onClose: () => void;
  onMute: (t: ProfileTarget) => void;
  onKickSeat: (t: ProfileTarget) => void;
  onBan: (t: ProfileTarget) => void;
  onMakeMod: (t: ProfileTarget) => void;
}) {
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!target) { setP(null); return; }
    let cancelled = false;
    setLoading(true);
    supabase.from("profiles")
      .select("id,display_name,avatar_url,bio,coins_earned,created_at")
      .eq("id", target.userId).maybeSingle()
      .then(({ data }) => {
        if (!cancelled) { setP(data as Profile | null); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [target?.userId]);

  if (!target) return null;
  const isSelf = viewerId === target.userId;
  const level = p ? levelFromCoins(p.coins_earned) : 1;
  const shortId = target.userId.slice(0, 8).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-accent/40 rounded-t-3xl pb-8 shadow-glow profile-sheet-in relative overflow-hidden"
      >
        {/* Neon gradient header */}
        <div className="relative bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 px-5 pt-6 pb-5">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 size-8 rounded-full bg-background/60 backdrop-blur border border-border flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="size-20 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center overflow-hidden ring-2 ring-accent/50">
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt={p.display_name} className="size-full object-cover" />
                ) : (
                  <span className="text-3xl font-display font-extrabold text-primary-foreground">
                    {(p?.display_name ?? "?")[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-gold text-background text-[10px] font-display font-extrabold rounded-full px-1.5 py-0.5 shadow-glow flex items-center gap-0.5">
                <Sparkles className="size-2.5" /> Lv {level}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-extrabold text-lg truncate glow-text">
                {loading ? "..." : (p?.display_name ?? "Kullanıcı")}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">ID · {shortId}</p>
              {p?.bio && <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{p.bio}</p>}
              <div className="flex gap-2 mt-2 text-[10px] font-semibold">
                <span className="bg-background/60 backdrop-blur border border-border rounded-full px-2 py-0.5">
                  💎 {p?.coins_earned ?? 0}
                </span>
                {typeof target.seatIndex === "number" && (
                  <span className="bg-background/60 backdrop-blur border border-accent/40 rounded-full px-2 py-0.5 text-gold">
                    Koltuk #{target.seatIndex + 1}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isSelf && (
            <button
              onClick={() => setFollowing(f => !f)}
              className={`mt-4 w-full py-2.5 rounded-2xl text-sm font-display font-bold flex items-center justify-center gap-2 transition ${
                following
                  ? "bg-secondary text-foreground border border-border"
                  : "bg-gradient-primary text-primary-foreground shadow-glow"
              }`}
            >
              <UserPlus className="size-4" />
              {following ? "Takip Ediliyor ✓" : "Takip Et"}
            </button>
          )}
        </div>

        {/* Owner moderation panel */}
        {isOwner && !isSelf && (
          <div className="px-5 pt-4">
            <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
              <Crown className="size-3 text-gold" /> Oda Düzeni
            </p>
            <div className="grid grid-cols-2 gap-2">
              {target.seatId && (
                <button
                  onClick={() => onMute(target)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border hover:bg-secondary/70 transition text-left"
                >
                  <VolumeX className="size-4 text-foreground" />
                  <span className="text-xs font-semibold">{target.isMuted ? "Susturmayı Kaldır" : "Sustur"}</span>
                </button>
              )}
              {target.seatId && (
                <button
                  onClick={() => onKickSeat(target)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/40 hover:bg-destructive/20 transition text-destructive text-left"
                >
                  <KickIcon className="size-4" />
                  <span className="text-xs font-semibold">Koltuktan İndir</span>
                </button>
              )}
              <button
                onClick={() => onBan(target)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/15 border border-destructive/50 hover:bg-destructive/25 transition text-destructive text-left"
              >
                <Ban className="size-4" />
                <span className="text-xs font-semibold">Odadan Yasakla</span>
              </button>
              <button
                onClick={() => onMakeMod(target)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gold/15 border border-gold/50 hover:bg-gold/25 transition text-gold text-left"
              >
                <Crown className="size-4" />
                <span className="text-xs font-semibold">Moderatör Yap</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}