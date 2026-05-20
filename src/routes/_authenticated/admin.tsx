import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Trash2, UserX, Users, DoorOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

type Room = { id: string; title: string; tag: string | null; popularity: number; owner_id: string; created_at: string };
type Seat = { id: string; room_id: string; seat_index: number; user_id: string | null };
type Profile = { id: string; display_name: string; avatar_url: string | null };

function AdminPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from("rooms").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("room_seats").select("*").not("user_id", "is", null),
    ]);
    setRooms((r ?? []) as Room[]);
    setSeats((s ?? []) as Seat[]);
    const ids = new Set<string>();
    (r ?? []).forEach((x: any) => ids.add(x.owner_id));
    (s ?? []).forEach((x: any) => x.user_id && ids.add(x.user_id));
    if (ids.size) {
      const { data: p } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", Array.from(ids));
      const map: Record<string, Profile> = {};
      (p ?? []).forEach((x: any) => { map[x.id] = x; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const deleteRoom = async (id: string) => {
    if (!confirm("Bu odayı silmek istediğine emin misin?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Oda silindi");
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  const kickUser = async (seatId: string, displayName: string) => {
    if (!confirm(`${displayName} kullanıcısı koltuktan atılsın mı?`)) return;
    const { error } = await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("id", seatId);
    if (error) return toast.error(error.message);
    toast.success("Kullanıcı atıldı");
    setSeats((prev) => prev.filter((s) => s.id !== seatId));
  };

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="size-16 rounded-2xl bg-destructive/20 flex items-center justify-center">
          <Shield className="size-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Erişim Reddedildi</h1>
        <p className="text-muted-foreground">Bu sayfa yalnızca yöneticiler içindir.</p>
        <Button onClick={() => nav({ to: "/home" })}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-12 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center">
          <Shield className="size-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Yönetim Paneli</h1>
          <p className="text-xs text-muted-foreground">Koizora Admin</p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Yenile"}
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <DoorOpen className="size-4" /> Aktif Odalar ({rooms.length})
        </h2>
        {rooms.length === 0 && <p className="text-sm text-muted-foreground">Aktif oda yok.</p>}
        {rooms.map((r) => {
          const roomSeats = seats.filter((s) => s.room_id === r.id);
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Sahip: {profiles[r.owner_id]?.display_name ?? "—"} · {r.tag ?? "Sohbet"} · ⭐ {r.popularity}
                  </div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => deleteRoom(r.id)}>
                  <Trash2 className="size-4" /> Sil
                </Button>
              </div>
              {roomSeats.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3" /> {roomSeats.length} kullanıcı koltukta
                  </div>
                  {roomSeats.map((s) => {
                    const p = s.user_id ? profiles[s.user_id] : null;
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        {p?.avatar_url && <img src={p.avatar_url} alt="" className="size-6 rounded-full" />}
                        <span className="flex-1 truncate">{p?.display_name ?? s.user_id} · #Koltuk {s.seat_index + 1}</span>
                        <Button size="sm" variant="outline" onClick={() => kickUser(s.id, p?.display_name ?? "Kullanıcı")}>
                          <UserX className="size-3.5" /> At
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
