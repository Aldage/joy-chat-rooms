import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Coins, Plus, Users, Mic, Crown, Search, Flame, Sparkles, TrendingUp } from "lucide-react";
import { CreateRoomDialog } from "@/components/app/CreateRoomDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({ component: HomePage });

type RoomRow = {
  id: string; title: string; tag: string | null; cover_url: string | null;
  seat_count: number; owner_id: string; popularity?: number;
  owner?: { display_name: string; avatar_url: string | null };
  count?: number;
};

const TAGS = ["Tümü", "Sohbet", "Müzik", "Oyun", "Aşk", "Yeni"];

function HomePage() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [tag, setTag] = useState("Tümü");
  const [openCreate, setOpenCreate] = useState(false);
  const [topSpenders, setTopSpenders] = useState<{ id: string; display_name: string; coins_earned: number }[]>([]);
  const [vipIds, setVipIds] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data: rs } = await supabase
      .from("rooms")
      .select("id,title,tag,cover_url,seat_count,owner_id,popularity")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (!rs) return;
    const ownerIds = [...new Set(rs.map(r => r.owner_id))];
    const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", ownerIds);
    const roomIds = rs.map(r => r.id);
    const { data: seats } = await supabase.from("room_seats").select("room_id,user_id").in("room_id", roomIds);
    const counts: Record<string, number> = {};
    seats?.forEach(s => { if (s.user_id) counts[s.room_id] = (counts[s.room_id] ?? 0) + 1; });
    setRooms(rs.map(r => ({
      ...r,
      owner: profs?.find(p => p.id === r.owner_id) as any,
      count: counts[r.id] ?? 0,
    })));
  };

  useEffect(() => {
    load();
    supabase.from("profiles")
      .select("id,display_name,coins_earned")
      .order("coins_earned", { ascending: false })
      .limit(5)
      .then(async ({ data }) => {
        const list = (data ?? []) as any[];
        setTopSpenders(list);
        const ids = list.map(u => u.id);
        if (ids.length) {
          const { data: roles } = await supabase
            .from("user_roles").select("user_id,role").in("user_id", ids);
          const set = new Set<string>();
          (roles ?? []).forEach((r: any) => {
            if (r.role === "vip" || r.role === "admin") set.add(r.user_id);
          });
          setVipIds(set);
        }
      });
    const ch = supabase.channel("rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_seats" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = tag === "Tümü" ? rooms : rooms.filter(r => r.tag === tag);

  return (
    <div className="bg-gradient-hero min-h-screen">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] font-display font-extrabold koizora-shimmer">KOIZORA</p>
          <h1 className="text-xl font-display font-bold">{profile?.display_name ?? "..."}</h1>
        </div>
        <Link to="/wallet" className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-soft">
          <Coins className="size-4 text-gold" />
          <span className="text-sm font-semibold">{profile?.coin_balance ?? 0}</span>
        </Link>
      </header>

      {/* Search */}
      <div className="px-5 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input placeholder="Oda veya kullanıcı ara..." className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
        </div>
      </div>

      {/* Tags */}
      <div className="px-5 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {TAGS.map(t => (
          <button key={t} onClick={() => setTag(t)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${tag===t?"bg-gradient-primary text-primary-foreground shadow-glow":"bg-card text-muted-foreground border border-border"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Featured event banner */}
      <div className="px-5 mb-4">
        <div className="relative bg-gradient-to-r from-primary via-accent to-primary-glow rounded-3xl p-4 shadow-glow overflow-hidden">
          <div className="absolute -top-8 -right-8 size-32 rounded-full bg-gold/40 blur-3xl animate-pulse" />
          <div className="relative flex items-center gap-3">
            <Sparkles className="size-6 text-gold drop-shadow" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/80 font-bold">Bugünün Etkinliği</p>
              <p className="text-sm font-display font-bold text-primary-foreground truncate">Hediye gönderene 2x Coin geri! 🎁</p>
            </div>
            <span className="text-[10px] font-bold bg-background/30 backdrop-blur text-primary-foreground rounded-full px-2 py-0.5">CANLI</span>
          </div>
        </div>
      </div>

      {/* Top spenders strip */}
      {topSpenders.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-gold" />
              <p className="text-xs font-display font-bold">Günün VIP'leri</p>
            </div>
            <Link to="/discover" className="text-[10px] text-muted-foreground">Tümü</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {topSpenders.map((u, i) => (
              <div key={u.id} className="flex flex-col items-center min-w-[64px]">
                <div className="relative">
                  <div className={`size-14 rounded-full p-[2px] ${
                    vipIds.has(u.id)
                      ? "bg-gradient-to-tr from-amber-300 via-gold to-amber-500 shadow-[0_0_22px_-2px_rgba(245,180,60,0.85)] vip-pulse"
                      : i===0 ? "bg-gradient-to-tr from-gold to-amber-500 shadow-glow" : "bg-gradient-primary"
                  }`}>
                    <div className="size-full rounded-full bg-card flex items-center justify-center text-sm font-display font-bold">
                      {u.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  </div>
                  {vipIds.has(u.id) && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-gold shadow-[0_2px_8px_rgba(245,180,60,0.7)] border border-amber-200/60">
                      <Sparkles className="size-2 text-background" />
                      <span className="text-[8px] font-extrabold tracking-wider text-background">VIP</span>
                    </span>
                  )}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full text-[9px] font-bold px-1.5">#{i+1}</span>
                </div>
                <p className="text-[10px] font-semibold truncate max-w-[64px] mt-2">{u.display_name}</p>
                <p className="text-[9px] text-gold flex items-center gap-0.5"><Coins className="size-2.5" />{(u.coins_earned ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rooms grid */}
      <div className="px-5 grid grid-cols-2 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">
            Henüz aktif oda yok. İlk odayı sen aç! 🎉
          </div>
        )}
        {filtered.map(r => (
          <button key={r.id} onClick={() => nav({ to: "/room/$roomId", params: { roomId: r.id } })} className="group text-left bg-gradient-card border border-border rounded-3xl p-3 shadow-soft hover:shadow-glow transition relative overflow-hidden">
            <div className="aspect-square rounded-2xl bg-gradient-primary mb-2 relative overflow-hidden flex items-center justify-center">
              {r.cover_url ? <img src={r.cover_url} alt="" className="absolute inset-0 size-full object-cover" /> : <Mic className="size-10 text-primary-foreground/60" />}
              <span className="absolute top-2 left-2 flex items-center gap-1 bg-live text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="size-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </span>
              <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <Users className="size-2.5" /> {r.count}
              </span>
              <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/45 backdrop-blur text-gold text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Flame className="size-2.5" /> {(r.popularity ?? 0).toLocaleString()}
              </span>
            </div>
            <p className="font-semibold text-sm truncate">{r.title}</p>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <Crown className="size-3 text-gold" /> {r.owner?.display_name ?? "—"}
            </p>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => setOpenCreate(true)} className="fixed bottom-28 right-5 size-14 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center z-30 active:scale-95 transition">
        <Plus className="size-6 text-primary-foreground" />
      </button>

      <CreateRoomDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={(id) => { toast.success("Oda oluşturuldu"); nav({ to: "/room/$roomId", params: { roomId: id } }); }} />
    </div>
  );
}
