import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Coins, Plus, Users, Mic, Crown, Search, Flame } from "lucide-react";
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
          <p className="text-xs text-muted-foreground">Hoşgeldin,</p>
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
