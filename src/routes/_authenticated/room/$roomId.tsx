import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SeatGrid, type SeatLite } from "@/components/app/SeatGrid";
import { GiftPicker } from "@/components/app/GiftPicker";
import { ArrowLeft, Gift as GiftIcon, Mic, MicOff, Send, Users, Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/room/$roomId")({ component: RoomPage });

type Msg = { id: string; user_id: string; content: string; message_type: string; created_at: string; user?: { display_name: string } };
type GiftFx = { id: string; emoji: string; from: string; to: string; giftName: string };

function RoomPage() {
  const { roomId } = Route.useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [seats, setSeats] = useState<SeatLite[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string; avatar_url: string | null }>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [openGift, setOpenGift] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [fx, setFx] = useState<GiftFx[]>([]);
  const [micOn, setMicOn] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const localStream = useRef<MediaStream | null>(null);

  const loadAll = async () => {
    const { data: r } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    if (!r) { toast.error("Oda bulunamadı"); nav({ to: "/home" }); return; }
    setRoom(r);
    const { data: s } = await supabase.from("room_seats").select("*").eq("room_id", roomId).order("seat_index");
    const userIds = [...new Set([r.owner_id, ...(s ?? []).map(x => x.user_id).filter(Boolean) as string[]])];
    const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", userIds);
    const map: typeof profiles = {};
    profs?.forEach(p => { map[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
    setProfiles(map);
    setSeats((s ?? []).map(seat => ({ ...seat, user: seat.user_id ? map[seat.user_id] : null })));
    const { data: m } = await supabase.from("room_messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).limit(100);
    setMessages((m ?? []) as Msg[]);
  };

  useEffect(() => { loadAll(); }, [roomId]);

  // realtime
  useEffect(() => {
    const ch = supabase.channel(`room:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_seats", filter: `room_id=eq.${roomId}` }, () => loadAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, async (p) => {
        const msg = p.new as Msg;
        if (!profiles[msg.user_id]) {
          const { data } = await supabase.from("profiles").select("id,display_name,avatar_url").eq("id", msg.user_id).single();
          if (data) setProfiles(prev => ({ ...prev, [data.id]: { display_name: data.display_name, avatar_url: data.avatar_url } }));
        }
        setMessages(prev => [...prev, msg]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions", filter: `room_id=eq.${roomId}` }, async (p) => {
        const tx = p.new as any;
        const { data: g } = await supabase.from("gifts").select("emoji,name").eq("id", tx.gift_id).single();
        const fromName = profiles[tx.sender_id]?.display_name ?? "Birisi";
        const toName = tx.sender_id === tx.receiver_id
          ? "kendine"
          : (profiles[tx.receiver_id]?.display_name ?? "yayıncı");
        const id = crypto.randomUUID();
        setFx(prev => [...prev, { id, emoji: g?.emoji ?? "🎁", from: fromName, to: toName, giftName: g?.name ?? "Hediye" }]);
        setTimeout(() => setFx(prev => prev.filter(f => f.id !== id)), 2400);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId, profiles]);

  // auto-scroll chat
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  // mock mic (WebRTC getUserMedia, ses dışarı verilmiyor — LiveKit ileride bağlanacak)
  const toggleMic = async () => {
    if (micOn) {
      localStream.current?.getTracks().forEach(t => t.stop());
      localStream.current = null; setMicOn(false);
      const seat = seats.find(s => s.user_id === user?.id);
      if (seat) await supabase.from("room_seats").update({ is_muted: true }).eq("id", seat.id);
      return;
    }
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicOn(true);
      const seat = seats.find(s => s.user_id === user?.id);
      if (seat) await supabase.from("room_seats").update({ is_muted: false }).eq("id", seat.id);
      toast.success("Mikrofon açık (LiveKit yakında)");
    } catch { toast.error("Mikrofon izni reddedildi"); }
  };

  const takeSeat = async (s: SeatLite) => {
    if (!user) return;
    if (s.user_id) return; // occupied
    if (s.is_locked) { toast.error("Bu koltuk kilitli"); return; }
    // remove from any current seat
    const current = seats.find(x => x.user_id === user.id);
    if (current) await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("id", current.id);
    await supabase.from("room_seats").update({ user_id: user.id, is_muted: true }).eq("id", s.id);
  };

  const sendMsg = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput("");
    await supabase.from("room_messages").insert({ room_id: roomId, user_id: user.id, content });
  };

  const leave = async () => {
    if (user) {
      const seat = seats.find(s => s.user_id === user.id);
      if (seat) await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("id", seat.id);
    }
    localStream.current?.getTracks().forEach(t => t.stop());
    nav({ to: "/home" });
  };

  // leave on unmount
  useEffect(() => () => { localStream.current?.getTracks().forEach(t => t.stop()); }, []);

  const mySeat = seats.find(s => s.user_id === user?.id);

  return (
    <div className="bg-gradient-hero min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={leave} className="size-10 rounded-full bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold truncate">{room?.title ?? "..."}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span className="bg-live text-white px-1.5 py-0.5 rounded text-[9px] font-bold">LIVE</span>
            <Users className="size-3" /> {seats.filter(s => s.user_id).length}/{seats.length}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-full px-3 py-1.5">
          <Coins className="size-3.5 text-gold" />
          <span className="text-xs font-semibold">{profile?.coin_balance ?? 0}</span>
        </div>
      </header>

      {/* Seats */}
      <div className="py-4">
        <SeatGrid
          seats={seats}
          ownerId={room?.owner_id ?? ""}
          onSeatClick={takeSeat}
          onSelectTarget={(uid) => { setTarget(uid); setOpenGift(true); }}
          targetUserId={target}
        />
      </div>

      {/* Chat */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar">
        {messages.map(m => (
          <div key={m.id} className="flex items-start gap-2">
            <div className="size-7 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
              {profiles[m.user_id]?.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">{profiles[m.user_id]?.display_name ?? "..."}</p>
              <p className="text-sm bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-1.5 inline-block max-w-full break-words">{m.content}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">İlk mesajı sen yaz 💬</p>}
      </div>

      {/* Gift FX overlay */}
      <div className="pointer-events-none fixed inset-0 flex items-end justify-center pb-40 z-30">
        {fx.map((f, i) => (
          <div key={f.id} className="absolute gift-float" style={{ left: `${20 + (i * 15) % 60}%` }}>
            <div className="bg-gradient-primary shadow-glow rounded-2xl px-4 py-2.5 flex items-center gap-2 animate-scale-in">
              <span className="text-3xl">{f.emoji}</span>
              <p className="text-xs text-primary-foreground font-semibold whitespace-nowrap">
                {f.from}, {f.giftName} gönderdi! {f.emoji}
                {f.to === "kendine" && <span className="opacity-80"> (kendine)</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer controls */}
      <footer className="px-3 pb-4 pt-2 bg-background/80 backdrop-blur border-t border-border flex items-center gap-2">
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&sendMsg()}
          placeholder="Mesaj yaz..."
          className="flex-1 bg-card border border-border rounded-full px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        <button onClick={sendMsg} className="size-11 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center">
          <Send className="size-4 text-primary-foreground" />
        </button>
        {mySeat && (
          <button onClick={toggleMic} className={`size-11 rounded-full flex items-center justify-center border ${micOn?"bg-gradient-primary shadow-glow border-transparent":"bg-card border-border"}`}>
            {micOn ? <Mic className="size-4 text-primary-foreground" /> : <MicOff className="size-4 text-muted-foreground" />}
          </button>
        )}
        <button onClick={()=>{ setTarget(null); setOpenGift(true); }} className="size-11 rounded-full bg-accent shadow-glow flex items-center justify-center">
          <GiftIcon className="size-4 text-accent-foreground" />
        </button>
      </footer>

      <GiftPicker open={openGift} onOpenChange={setOpenGift} roomId={roomId} targetUserId={target} />
    </div>
  );
}
