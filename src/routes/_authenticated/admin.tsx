import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Trash2, UserX, Users, DoorOpen, Loader2, Crown, UserMinus, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { deleteUserAccount } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

type Room = { id: string; title: string; tag: string | null; popularity: number; owner_id: string; created_at: string };
type Seat = { id: string; room_id: string; seat_index: number; user_id: string | null };
type Profile = { id: string; display_name: string; avatar_url: string | null };
type RoleRow = { user_id: string; role: string };

function AdminPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [vips, setVips] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [vipIds, setVipIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const deleteUserFn = useServerFn(deleteUserAccount);

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
    await loadVips();
    await loadAllUsers();
    setLoading(false);
  };

  const loadVips = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "vip");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    setVipIds(new Set(ids));
    if (!ids.length) { setVips([]); return; }
    const { data: p } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
    setVips((p ?? []) as Profile[]);
  };

  const loadAllUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .order("display_name", { ascending: true })
      .limit(200);
    setAllUsers((data ?? []) as Profile[]);
  };

  const kickFromAllRooms = async (uid: string, name: string) => {
    if (!confirm(`${name} tüm odalardaki koltuklardan atılsın mı?`)) return;
    setBusy(uid);
    const { error } = await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("user_id", uid);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${name} tüm koltuklardan atıldı`);
    setSeats((prev) => prev.filter((s) => s.user_id !== uid));
  };

  const toggleVip = async (uid: string, name: string) => {
    const isVip = vipIds.has(uid);
    if (isVip) await revokeVip(uid, name);
    else await grantVip(uid, name);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || search.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles")
        .select("id, display_name, avatar_url")
        .ilike("display_name", `%${search.trim()}%`)
        .limit(10);
      setSearchResults((data ?? []) as Profile[]);
    }, 250);
    return () => clearTimeout(t);
  }, [search, isAdmin]);

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

  const grantVip = async (uid: string, name: string) => {
    setBusy(uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "vip" as any });
    setBusy(null);
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success(`👑 ${name} artık VIP`);
    loadVips();
  };

  const revokeVip = async (uid: string, name: string) => {
    if (!confirm(`${name} kullanıcısının VIP statüsü kaldırılsın mı?`)) return;
    setBusy(uid);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "vip" as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${name} VIP'den çıkarıldı`);
    setVips((prev) => prev.filter((v) => v.id !== uid));
  };

  const deleteUser = async (uid: string, name: string) => {
    if (!confirm(`⚠️ ${name} hesabı KALICI olarak silinecek. Emin misin?`)) return;
    setBusy(uid);
    try {
      await deleteUserFn({ data: { userId: uid } });
      toast.success(`${name} silindi`);
      setVips((prev) => prev.filter((v) => v.id !== uid));
      setSearchResults((prev) => prev.filter((v) => v.id !== uid));
    } catch (e: any) {
      toast.error(e?.message ?? "Silinemedi");
    } finally {
      setBusy(null);
    }
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

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Crown className="size-4 text-amber-400" /> VIP Yönetimi ({vips.length})
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kullanıcı ara (isim)..."
            className="pl-9"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">Arama sonuçları</p>
            {searchResults.map((u) => {
              const isVip = vips.some((v) => v.id === u.id);
              return (
                <div key={u.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary/50">
                  {u.avatar_url && <img src={u.avatar_url} alt="" className="size-7 rounded-full" />}
                  <span className="flex-1 truncate text-sm">{u.display_name}</span>
                  {isVip ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500/20 text-amber-400">VIP</span>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => grantVip(u.id, u.display_name)}>
                      <Crown className="size-3.5" /> VIP Yap
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" disabled={busy === u.id || u.id === user?.id} onClick={() => deleteUser(u.id, u.display_name)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {vips.length === 0 && <p className="text-sm text-muted-foreground">Henüz VIP kullanıcı yok. Yukarıdan ara ve VIP yap.</p>}
        {vips.map((v) => (
          <div key={v.id} className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-card p-3 flex items-center gap-3">
            {v.avatar_url && <img src={v.avatar_url} alt="" className="size-10 rounded-full ring-2 ring-amber-400/50" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{v.display_name}</span>
                <Crown className="size-3.5 text-amber-400" />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">#{v.id.slice(0, 8)}</p>
            </div>
            <Button size="sm" variant="outline" disabled={busy === v.id} onClick={() => revokeVip(v.id, v.display_name)}>
              <UserMinus className="size-3.5" /> VIP Kaldır
            </Button>
            <Button size="sm" variant="destructive" disabled={busy === v.id || v.id === user?.id} onClick={() => deleteUser(v.id, v.display_name)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Users className="size-4" /> Tüm Kullanıcılar ({allUsers.length})
        </h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {allUsers.map((u) => {
            const isVip = vipIds.has(u.id);
            return (
              <div key={u.id} className="flex items-center gap-2 p-3">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" className="size-8 rounded-full" />
                  : <div className="size-8 rounded-full bg-secondary" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{u.display_name}</span>
                    {isVip && <Crown className="size-3 text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">#{u.id.slice(0, 8)}</p>
                </div>
                <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => kickFromAllRooms(u.id, u.display_name)}>
                  <UserX className="size-3.5" /> At
                </Button>
                <Button
                  size="sm"
                  variant={isVip ? "secondary" : "outline"}
                  disabled={busy === u.id}
                  onClick={() => toggleVip(u.id, u.display_name)}
                  title={isVip ? "VIP Kaldır" : "VIP Yap"}
                >
                  <Crown className={`size-3.5 ${isVip ? "text-amber-400" : ""}`} />
                </Button>
                <Button size="sm" variant="destructive" disabled={busy === u.id || u.id === user?.id} onClick={() => deleteUser(u.id, u.display_name)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
