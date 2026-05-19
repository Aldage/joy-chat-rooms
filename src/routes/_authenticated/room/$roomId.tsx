import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SeatGrid, type SeatLite } from "@/components/app/SeatGrid";
import { GiftPicker } from "@/components/app/GiftPicker";
import { ArrowLeft, Gift as GiftIcon, Mic, MicOff, Send, Users, Coins, LogOut, Hand, Lock, Unlock, UserX, VolumeX, Shield, X } from "lucide-react";
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
  const [speaking, setSpeaking] = useState(false);
  const [modSeat, setModSeat] = useState<SeatLite | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const rafId = useRef<number | null>(null);

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
      localStream.current = null;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      audioCtx.current?.close().catch(()=>{});
      audioCtx.current = null;
      setMicOn(false); setSpeaking(false);
      const seat = seats.find(s => s.user_id === user?.id);
      if (seat) await supabase.from("room_seats").update({ is_muted: true }).eq("id", seat.id);
      return;
    }
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicOn(true);
      const seat = seats.find(s => s.user_id === user?.id);
      if (seat) await supabase.from("room_seats").update({ is_muted: false }).eq("id", seat.id);
      // Konuşma tespiti (yerel analiz — ses dışarı gitmiyor)
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new Ctx();
      audioCtx.current = ctx;
      const src = ctx.createMediaStreamSource(localStream.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        setSpeaking(rms > 0.04);
        rafId.current = requestAnimationFrame(tick);
      };
      tick();
      toast.success("Mikrofon açık 🎤");
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
    toast.success(`#${s.seat_index + 1} koltuğuna oturdun`);
  };

  const leaveSeat = async (s?: SeatLite) => {
    if (!user) return;
    const seat = s ?? seats.find(x => x.user_id === user.id);
    if (!seat) return;
    // mic kapat
    if (micOn) {
      localStream.current?.getTracks().forEach(t => t.stop());
      localStream.current = null;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      audioCtx.current?.close().catch(()=>{});
      audioCtx.current = null;
      setMicOn(false); setSpeaking(false);
    }
    await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("id", seat.id);
    toast.message("Koltuktan kalktın");
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
  useEffect(() => () => {
    localStream.current?.getTracks().forEach(t => t.stop());
    if (rafId.current) cancelAnimationFrame(rafId.current);
    audioCtx.current?.close().catch(()=>{});
  }, []);

  const mySeat = seats.find(s => s.user_id === user?.id);
  const isRoomOwner = !!user && !!room && user.id === room.owner_id;

  const toggleLock = async (s: SeatLite) => {
    if (!isRoomOwner) return;
    await supabase.from("room_seats").update({ is_locked: !s.is_locked }).eq("id", s.id);
    toast.success(s.is_locked ? `#${s.seat_index + 1} koltuğu açıldı` : `#${s.seat_index + 1} koltuğu kilitlendi 🔒`);
  };

  const muteSeat = async (s: SeatLite) => {
    if (!isRoomOwner || !s.user_id) return;
    await supabase.from("room_seats").update({ is_muted: !s.is_muted }).eq("id", s.id);
    toast.message(s.is_muted ? "Mikrofon açıldı" : "Kullanıcı susturuldu 🔇");
    setModSeat(null);
  };

  const kickSeat = async (s: SeatLite) => {
    if (!isRoomOwner || !s.user_id) return;
    await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("id", s.id);
    toast.success(`${s.user?.display_name ?? "Kullanıcı"} odadan atıldı`);
    setModSeat(null);
  };

  const savePassword = async (val: string | null) => {
    if (!isRoomOwner) return;
    if (val && !/^\d{4}$/.test(val)) { toast.error("Şifre 4 haneli olmalı"); return; }
    const { error } = await supabase.from("rooms").update({ password: val }).eq("id", roomId);
    if (error) { toast.error("Şifre kaydedilemedi"); return; }
    setRoom((r: any) => ({ ...r, password: val }));
    setPwOpen(false); setPwInput("");
    toast.success(val ? "Oda şifrelendi 🔐" : "Şifre kaldırıldı");
  };

  // mySeat üzerinde konuşma göstergesini yerelde yansıt
  const seatsView = seats.map(s =>
    s.user_id && s.user_id === user?.id ? { ...s, speaking: speaking && micOn, is_muted: !micOn } : s
  );

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
            {room?.password && <span className="flex items-center gap-0.5 text-gold"><Lock className="size-3" /> Şifreli</span>}
          </p>
        </div>
        {isRoomOwner && (
          <button onClick={() => { setPwInput(room?.password ?? ""); setPwOpen(true); }} className="size-10 rounded-full bg-card border border-border flex items-center justify-center" title="Odayı şifrele">
            <Shield className={`size-4 ${room?.password ? "text-gold" : "text-foreground"}`} />
          </button>
        )}
        <div className="flex items-center gap-1 bg-card border border-border rounded-full px-3 py-1.5">
          <Coins className="size-3.5 text-gold" />
          <span className="text-xs font-semibold">{profile?.coin_balance ?? 0}</span>
        </div>
      </header>

      {/* Seats */}
      <div className="py-4">
        <SeatGrid
          seats={seatsView}
          ownerId={room?.owner_id ?? ""}
          currentUserId={user?.id}
          onSeatClick={takeSeat}
          onLeaveSeat={leaveSeat}
          onSelectTarget={(uid) => { setTarget(uid); setOpenGift(true); }}
          onToggleLock={toggleLock}
          onModerate={(s) => setModSeat(s)}
          targetUserId={target}
        />
        {mySeat && (
          <div className="flex justify-center mt-3">
            <button onClick={() => leaveSeat()} className="flex items-center gap-1.5 text-xs font-semibold bg-card border border-border rounded-full px-3 py-1.5 hover:bg-secondary">
              <LogOut className="size-3" /> Koltuktan Kalk
            </button>
          </div>
        )}
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
        {mySeat ? (
          <button onClick={toggleMic} className={`size-11 rounded-full flex items-center justify-center border ${micOn?"bg-gradient-primary shadow-glow border-transparent":"bg-card border-border"}`}>
            {micOn ? <Mic className="size-4 text-primary-foreground" /> : <MicOff className="size-4 text-muted-foreground" />}
          </button>
        ) : (
          <button
            onClick={() => {
              const empty = seats.find(s => !s.user_id && !s.is_locked);
              if (empty) takeSeat(empty);
              else toast.error("Boş koltuk yok");
            }}
            className="size-11 rounded-full bg-card border border-border flex items-center justify-center"
            title="Koltuğa otur"
          >
            <Hand className="size-4 text-foreground" />
          </button>
        )}
        <button onClick={()=>{ setTarget(null); setOpenGift(true); }} className="size-11 rounded-full bg-accent shadow-glow flex items-center justify-center">
          <GiftIcon className="size-4 text-accent-foreground" />
        </button>
      </footer>

      <GiftPicker open={openGift} onOpenChange={setOpenGift} roomId={roomId} targetUserId={target} />

      {/* Moderation popover */}
      {modSeat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm animate-fade-in" onClick={() => setModSeat(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-card border border-border rounded-t-3xl p-5 pb-8 shadow-glow animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold">
                {modSeat.user?.display_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold truncate">{modSeat.user?.display_name ?? "Kullanıcı"}</p>
                <p className="text-[11px] text-muted-foreground">Koltuk #{modSeat.seat_index + 1}</p>
              </div>
              <button onClick={() => setModSeat(null)} className="size-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              <button onClick={() => muteSeat(modSeat)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 transition">
                <VolumeX className="size-4 text-foreground" />
                <span className="text-sm font-semibold">{modSeat.is_muted ? "Susturmayı Kaldır" : "Mikrofonunu Sustur"}</span>
              </button>
              <button onClick={() => toggleLock(modSeat)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 transition">
                {modSeat.is_locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                <span className="text-sm font-semibold">{modSeat.is_locked ? "Koltuğu Aç" : "Koltuğu Kilitle"}</span>
              </button>
              <button onClick={() => kickSeat(modSeat)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-destructive/15 hover:bg-destructive/25 transition text-destructive">
                <UserX className="size-4" />
                <span className="text-sm font-semibold">Odadan At (Kick)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password dialog */}
      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in p-4" onClick={() => setPwOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-glow animate-scale-in">
            <div className="flex items-center gap-3 mb-1">
              <div className="size-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Shield className="size-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display font-bold">Odayı Şifrele</p>
                <p className="text-[11px] text-muted-foreground">4 haneli giriş şifresi belirle</p>
              </div>
            </div>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={4}
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="mt-5 w-full text-center text-3xl tracking-[0.6em] font-display font-bold bg-secondary border border-border rounded-2xl py-4 focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2 mt-5">
              {room?.password && (
                <button onClick={() => savePassword(null)} className="flex-1 py-3 rounded-2xl bg-secondary text-sm font-semibold hover:bg-secondary/80">
                  Şifreyi Kaldır
                </button>
              )}
              <button onClick={() => savePassword(pwInput)} disabled={pwInput.length !== 4} className="flex-1 py-3 rounded-2xl bg-gradient-primary text-primary-foreground text-sm font-bold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
