import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins, TrendingUp, Crown, Medal, Users, Mic, Radio, Music, Gamepad2, MessageCircle, Lock, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/discover")({ component: Discover });

type Tab = "live" | "board";
type RoomRow = {
  id: string; title: string; tag: string | null; cover_url: string | null;
  seat_count: number; owner_id: string; has_password?: boolean | null; popularity?: number;
  owner?: { display_name: string; avatar_url: string | null };
  count?: number;
};

const CATEGORIES: { key: string; label: string; icon: any; color: string }[] = [
  { key: "Tümü",    label: "Tümü",       icon: Radio,         color: "from-primary to-primary-glow" },
  { key: "Popüler", label: "🔥 Popüler", icon: Flame,         color: "from-orange-500 to-rose-500" },
  { key: "Müzik",   label: "🎵 Müzik",   icon: Music,         color: "from-pink-500 to-fuchsia-500" },
  { key: "Sohbet",  label: "💬 Sohbet",  icon: MessageCircle, color: "from-sky-500 to-indigo-500" },
  { key: "Oyun",    label: "🎮 Oyun",    icon: Gamepad2,      color: "from-emerald-500 to-teal-500" },
];

function Discover() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("live");
  const [cat, setCat] = useState("Tümü");
  const [top, setTop] = useState<any[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);

  const loadBoard = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,coins_earned")
      .order("coins_earned", { ascending: false })
      .limit(50);
    setTop(data ?? []);
  };

  const loadRooms = async () => {
    const { data: rs } = await supabase
      .from("rooms")
      .select("id,title,tag,cover_url,seat_count,owner_id,has_password,popularity")
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
    loadBoard(); loadRooms();
    const ch = supabase.channel("discover")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => loadRooms())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_seats" }, () => loadRooms())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => loadBoard())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered =
    cat === "Tümü"    ? rooms
  : cat === "Popüler" ? [...rooms].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  : rooms.filter(r => r.tag === cat);

  const maxPop = Math.max(100, ...rooms.map(r => r.popularity ?? 0));

  return (
    <div className="bg-gradient-hero min-h-screen pb-28">
      <header className="px-5 pt-12 pb-3">
        <h1 className="text-2xl font-display font-bold mb-1">Keşfet</h1>
        <p className="text-sm text-muted-foreground">Sosyal sesin merkezi</p>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-5">
        <div className="bg-card border border-border rounded-full p-1 flex relative">
          <button
            onClick={() => setTab("live")}
            className={`flex-1 py-2.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${tab==="live"?"bg-gradient-primary text-primary-foreground shadow-glow":"text-muted-foreground"}`}
          >
            <Radio className="size-3.5" /> Canlı Odalar
          </button>
          <button
            onClick={() => setTab("board")}
            className={`flex-1 py-2.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${tab==="board"?"bg-gradient-primary text-primary-foreground shadow-glow":"text-muted-foreground"}`}
          >
            <Crown className="size-3.5" /> Liderlik Tablosu
          </button>
        </div>
      </div>

      {tab === "live" ? (
        <>
          {/* Categories */}
          <div className="px-5 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  onClick={() => setCat(c.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition border ${cat===c.key?"bg-gradient-primary text-primary-foreground shadow-glow border-transparent":"bg-card text-muted-foreground border-border"}`}
                >
                  <Icon className="size-3.5" /> {c.label}
                </button>
              );
            })}
          </div>

          <div className="px-5 grid grid-cols-2 gap-3">
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-16 text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Radio className="size-8 opacity-50" />
                Bu kategoride canlı oda yok.
              </div>
            )}
            {filtered.map(r => {
              const meta = CATEGORIES.find(c => c.key === r.tag) ?? CATEGORIES[0];
              const Icon = meta.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => nav({ to: "/room/$roomId", params: { roomId: r.id } })}
                  className="group text-left bg-gradient-card border border-border rounded-3xl p-3 shadow-soft hover:shadow-glow transition relative overflow-hidden active:scale-[0.98]"
                >
                  <div className={`aspect-square rounded-2xl bg-gradient-to-br ${meta.color} mb-2 relative overflow-hidden flex items-center justify-center`}>
                    {r.cover_url
                      ? <img src={r.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
                      : <Icon className="size-12 text-white/70" />}
                    <span className="absolute top-2 left-2 flex items-center gap-1 bg-live text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <span className="size-1.5 rounded-full bg-white animate-pulse" /> LIVE
                    </span>
                    {r.password && (
                      <span className="absolute top-2 right-2 size-6 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                        <Lock className="size-3 text-gold" />
                      </span>
                    )}
                    <span className="absolute top-2 right-8 flex items-center gap-1 bg-black/55 backdrop-blur text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Flame className="size-2.5" /> {((r.popularity ?? 0) > 999 ? ((r.popularity ?? 0)/1000).toFixed(1)+"K" : (r.popularity ?? 0))}
                    </span>
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/45 backdrop-blur text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      <Users className="size-2.5" /> {r.count}
                    </span>
                    <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
                      <span className="bg-white/15 backdrop-blur text-white text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                        {r.tag ?? "Sohbet"}
                      </span>
                    </div>
                  </div>
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="size-5 rounded-full bg-gradient-primary p-[1px] shrink-0">
                      <div className="size-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                        {r.owner?.avatar_url
                          ? <img src={r.owner.avatar_url} alt="" className="size-full object-cover" />
                          : <span className="text-[9px] font-bold">{r.owner?.display_name?.[0]?.toUpperCase() ?? "?"}</span>}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate flex-1">{r.owner?.display_name ?? "—"}</p>
                  </div>
                  {/* Trend Enerji Bar */}
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-secondary/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold via-orange-400 to-pink-500 shadow-[0_0_8px_rgba(255,180,80,0.7)] transition-all"
                        style={{ width: `${Math.min(100, Math.round(((r.popularity ?? 0) / maxPop) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Flame className="size-2 text-orange-400" /> Trend Enerji {(r.popularity ?? 0).toLocaleString()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <Leaderboard top={top} />
      )}
    </div>
  );
}

function Leaderboard({ top }: { top: any[] }) {
  if (top.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 text-sm flex flex-col items-center gap-2">
        <TrendingUp className="size-8 opacity-50" /> Henüz veri yok
      </div>
    );
  }
  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const order = [1, 0, 2]; // 2nd, 1st, 3rd visual order
  const podiumHeights = ["h-24", "h-32", "h-20"];
  const podiumColors = ["from-zinc-300 to-zinc-500", "from-gold to-amber-500", "from-amber-700 to-amber-900"];
  const medalColors = ["text-zinc-300", "text-gold", "text-amber-700"];

  return (
    <div className="px-5">
      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-8">
        {order.map((rank) => {
          const u = podium[rank];
          if (!u) return <div key={rank} className="flex-1" />;
          return (
            <div key={u.id} className="flex-1 flex flex-col items-center">
              <div className="relative mb-2">
                {rank === 0 && (
                  <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 size-6 text-gold drop-shadow-[0_0_8px_rgba(255,200,60,0.8)] animate-pulse" />
                )}
                <div className={`size-14 rounded-full bg-gradient-to-br ${podiumColors[rank]} p-0.5 shadow-glow`}>
                  <div className="size-full rounded-full bg-card flex items-center justify-center text-base font-display font-bold">
                    {u.display_name?.[0]?.toUpperCase()}
                  </div>
                </div>
                <div className={`absolute -bottom-1 -right-1 size-5 rounded-full bg-card border border-border flex items-center justify-center`}>
                  <Medal className={`size-3 ${medalColors[rank]}`} />
                </div>
              </div>
              <p className="text-xs font-bold truncate max-w-full">{u.display_name}</p>
              <div className="flex items-center gap-1 text-[11px] text-gold font-semibold">
                <Coins className="size-3" /> {u.coins_earned?.toLocaleString()}
              </div>
              <div className={`mt-2 w-full ${podiumHeights[rank]} bg-gradient-to-t ${podiumColors[rank]} rounded-t-xl flex items-start justify-center pt-1.5`}>
                <span className="text-sm font-display font-bold text-background">{rank + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of list */}
      <div className="space-y-2">
        {rest.map((u, i) => {
          const rank = i + 4;
          return (
            <div key={u.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:shadow-glow transition">
              <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                {rank}
              </div>
              <div className="size-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                {u.display_name?.[0]?.toUpperCase()}
              </div>
              <p className="flex-1 font-semibold text-sm truncate">{u.display_name}</p>
              <div className="flex items-center gap-1 text-gold text-sm font-semibold">
                <Coins className="size-3.5" /> {u.coins_earned?.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
