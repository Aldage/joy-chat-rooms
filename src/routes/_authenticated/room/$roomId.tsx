import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SeatGrid, type SeatLite } from "@/components/app/SeatGrid";
import { GiftPicker } from "@/components/app/GiftPicker";
import { GiftOverlay, type GiftEvent, type PremiumGiftKind } from "@/components/app/GiftOverlay";
import { MegaGiftFX, type MegaGift } from "@/components/app/MegaGiftFX";
import { DiceGame } from "@/components/app/DiceGame";
import { HeartTapper } from "@/components/app/HeartTapper";
import { UserProfileSheet, type ProfileTarget } from "@/components/app/UserProfileSheet";
import { useActiveRoom } from "@/lib/active-room-context";
import { ArrowLeft, Flame, Gift as GiftIcon, Mic, MicOff, Send, Users, Coins, LogOut, Hand, Lock, Unlock, UserX, VolumeX, Shield, X, Sparkles, Music2, Crown, Dices } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/room/$roomId")({ component: RoomPage });

type Msg = { id: string; user_id: string; content: string; message_type: string; created_at: string; user?: { display_name: string } };
type GiftFx = { id: string; emoji: string; from: string; to: string; giftName: string };
type ChatFx = { id: string; text: string };
type ProfileLite = { display_name: string; avatar_url: string | null; active_frame?: string | null; xp?: number };

const SFX_LIST: { emoji: string; label: string }[] = [
  { emoji: "👏", label: "Alkış" },
  { emoji: "😂", label: "Kahkaha" },
  { emoji: "🔔", label: "Gong" },
  { emoji: "👎", label: "Yuhalama" },
];

const levelOf = (xp?: number | null) => Math.floor((xp ?? 0) / 100) + 1;

function RoomPage() {
  const { roomId } = Route.useParams();
  const { user, profile, refreshProfile } = useAuth();
  const { setRoom: setActiveRoom, clear: clearActiveRoom } = useActiveRoom();
  const nav = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [seats, setSeats] = useState<SeatLite[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [openGift, setOpenGift] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [fx, setFx] = useState<GiftFx[]>([]);
  const [chatFx, setChatFx] = useState<ChatFx[]>([]);
  const [giftQueue, setGiftQueue] = useState<GiftEvent[]>([]);
  // Energy / hearts
  const [energy, setEnergy] = useState(0);
  const heartsBucketRef = useRef(0);
  const popularityBucketRef = useRef(0);
  const popularityFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Chest
  const [chestProgress, setChestProgress] = useState(0);
  const [chestReady, setChestReady] = useState(false);
  const [chestRound, setChestRound] = useState(0);
  const [chestClosed, setChestClosed] = useState(false);
  const winnersRef = useRef<string[]>([]);
  const claimedRef = useRef(false);
  const chestChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [modSeat, setModSeat] = useState<SeatLite | null>(null);
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);
  const [bannedIds, setBannedIds] = useState<Set<string>>(new Set());
  const [modIds, setModIds] = useState<Set<string>>(new Set());
  const [pwOpen, setPwOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  // Soundboard
  const [sbOpen, setSbOpen] = useState(false);
  const [sfxActive, setSfxActive] = useState<{ emoji: string; label: string } | null>(null);
  const sfxChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Dice & mega FX
  const [diceOpen, setDiceOpen] = useState(false);
  const [megaGift, setMegaGift] = useState<MegaGift | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const rafId = useRef<number | null>(null);

  const loadAll = async () => {
    const { data: r } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    if (!r) { toast.error("Oda bulunamadı"); nav({ to: "/home" }); return; }
    setRoom(r);
    setEnergy((r as any).popularity ?? 0);
    const { data: s } = await supabase.from("room_seats").select("*").eq("room_id", roomId).order("seat_index");
    const userIds = [...new Set([r.owner_id, ...(s ?? []).map(x => x.user_id).filter(Boolean) as string[]])];
    const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url,active_frame,xp").in("id", userIds);
    const map: typeof profiles = {};
    profs?.forEach(p => { map[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url, active_frame: (p as any).active_frame, xp: (p as any).xp ?? 0 }; });
    setProfiles(map);
    setSeats((s ?? []).map(seat => ({ ...seat, user: seat.user_id ? map[seat.user_id] : null })));
    const { data: m } = await supabase.from("room_messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).limit(100);
    setMessages((m ?? []) as Msg[]);
    setActiveRoom({
      id: r.id, title: r.title, tag: r.tag,
      ownerName: profs?.find(p => p.id === r.owner_id)?.display_name,
    });
  };

  useEffect(() => { loadAll(); }, [roomId]);

  // realtime
  useEffect(() => {
    const ch = supabase.channel(`room:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_seats", filter: `room_id=eq.${roomId}` }, () => loadAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (p) => {
        const next = (p.new as any)?.popularity;
        if (typeof next === "number") setEnergy(next);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, async (p) => {
        const msg = p.new as Msg;
        if (!profiles[msg.user_id]) {
          const { data } = await supabase.from("profiles").select("id,display_name,avatar_url,active_frame,xp").eq("id", msg.user_id).single();
          if (data) setProfiles(prev => ({ ...prev, [data.id]: { display_name: data.display_name, avatar_url: data.avatar_url, active_frame: (data as any).active_frame, xp: (data as any).xp ?? 0 } }));
        }
        setMessages(prev => [...prev, msg]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions", filter: `room_id=eq.${roomId}` }, async (p) => {
        const tx = p.new as any;
        const { data: g } = await supabase.from("gifts").select("emoji,name").eq("id", tx.gift_id).single();
        if (tx.sender_id === user?.id || tx.receiver_id === user?.id) {
          refreshProfile();
        }
        const missingIds = [tx.sender_id, tx.receiver_id].filter((id) => id && !profiles[id]);
        let liveProfiles = profiles;
        if (missingIds.length > 0) {
          const { data } = await supabase.from("profiles").select("id,display_name,avatar_url,active_frame,xp").in("id", missingIds);
          const fetched: typeof profiles = {};
          data?.forEach(p => { fetched[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url, active_frame: (p as any).active_frame, xp: (p as any).xp ?? 0 }; });
          liveProfiles = { ...profiles, ...fetched };
          if (Object.keys(fetched).length > 0) setProfiles(prev => ({ ...prev, ...fetched }));
        }
        const fromName = liveProfiles[tx.sender_id]?.display_name ?? "Birisi";
        const toName = tx.sender_id === tx.receiver_id
          ? "kendine"
          : (liveProfiles[tx.receiver_id]?.display_name ?? "yayıncı");
        const id = crypto.randomUUID();
        const name = g?.name ?? "";
        const premiumKind: PremiumGiftKind | null =
          name === "Masum Kedi" || name === "Yavru Kedi" ? "puss" :
          name === "Çöl Dansçısı" ? "dancer" :
          name === "Ayıcık Kucağı" ? "bear" :
          name === "Kağıt Uçak Yolculuğu" ? "plane" : null;
        if (premiumKind) {
          setGiftQueue(prev => [...prev, {
            id, kind: premiumKind, from: fromName, to: toName,
            giftName: name, emoji: g?.emoji ?? "🎁",
          }]);
          const cid = crypto.randomUUID();
          const chatText = tx.sender_id === tx.receiver_id
            ? `Sistem: ${fromName}, kendine muhteşem bir ${name} armağan etti! ✨`
            : `Sistem: ${fromName}, ${toName} kullanıcısına muhteşem bir ${name} armağan etti! ✨`;
          setChatFx(prev => [...prev, { id: cid, text: chatText }]);
          setTimeout(() => setChatFx(prev => prev.filter(c => c.id !== cid)), 5000);
          // Inject a styled system message into the chat stream (local only)
          const sysId = `sys-${id}`;
          setMessages(prev => [...prev, {
            id: sysId, user_id: "__system__", content: chatText,
            message_type: "gift", created_at: new Date().toISOString(),
          } as Msg]);
          playMeow();
        } else {
          setFx(prev => [...prev, { id, emoji: g?.emoji ?? "🎁", from: fromName, to: toName, giftName: g?.name ?? "Hediye" }]);
          setTimeout(() => setFx(prev => prev.filter(f => f.id !== id)), 2400);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId, profiles, user?.id, refreshProfile]);

  // Meow synth
  const playMeow = () => {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      const t0 = ctx.currentTime;
      o.frequency.setValueAtTime(520, t0);
      o.frequency.exponentialRampToValueAtTime(820, t0 + 0.18);
      o.frequency.exponentialRampToValueAtTime(340, t0 + 0.55);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + 0.65);
      setTimeout(() => ctx.close().catch(()=>{}), 900);
    } catch {}
  };

  // Treasure chest: time + chat fills progress
  useEffect(() => {
    if (chestClosed) return;
    const t = setInterval(() => {
      setChestProgress(p => {
        if (p >= 100) return 100;
        const next = Math.min(100, p + 1.2);
        if (next >= 100) setChestReady(true);
        return next;
      });
    }, 400);
    return () => clearInterval(t);
  }, [chestClosed, chestRound]);

  // Each incoming message also bumps the chest
  useEffect(() => {
    if (chestClosed) return;
    if (messages.length === 0) return;
    setChestProgress(p => {
      const next = Math.min(100, p + 4);
      if (next >= 100) setChestReady(true);
      return next;
    });
  }, [messages.length]);

  // Chest broadcast channel for claims
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`chest:${roomId}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "claim" }, (payload) => {
        const round = payload.payload?.round;
        const uid = payload.payload?.user_id as string;
        const name = payload.payload?.name as string;
        if (round !== chestRound) return;
        if (winnersRef.current.includes(uid)) return;
        if (winnersRef.current.length >= 3) return;
        winnersRef.current = [...winnersRef.current, uid];
        // notify
        toast.success(`🎉 ${name} sandıktan ödül kaptı!`);
        if (uid === user.id) {
          // award +5 coins to self
          supabase.from("profiles")
            .update({ coin_balance: (profile?.coin_balance ?? 0) + 5 })
            .eq("id", user.id)
            .then(async () => {
              await refreshProfile();
              toast.success("🏆 Lounge Bonusu: +5 Coin ve 'Hızlı Parmak' rozeti senin!");
            });
        }
        if (winnersRef.current.length >= 3) {
          setChestClosed(true);
          setChestReady(false);
          setTimeout(() => {
            winnersRef.current = [];
            claimedRef.current = false;
            setChestProgress(0);
            setChestRound(r => r + 1);
            setChestClosed(false);
          }, 6000);
        }
      })
      .subscribe();
    chestChanRef.current = ch;
    return () => { supabase.removeChannel(ch); chestChanRef.current = null; };
  }, [roomId, user?.id, chestRound, profile?.coin_balance, refreshProfile]);

  const claimChest = () => {
    if (!user || !chestReady || claimedRef.current) return;
    claimedRef.current = true;
    chestChanRef.current?.send({
      type: "broadcast",
      event: "claim",
      payload: { round: chestRound, user_id: user.id, name: profile?.display_name ?? "Birisi" },
    });
  };

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
    // Her mesaj +1 XP
    const cur = (profile as any)?.xp ?? 0;
    supabase.from("profiles").update({ xp: cur + 1 }).eq("id", user.id).then(() => refreshProfile());
  };

  const leave = async () => {
    if (user) {
      const seat = seats.find(s => s.user_id === user.id);
      if (seat) await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("id", seat.id);
    }
    localStream.current?.getTracks().forEach(t => t.stop());
    clearActiveRoom();
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

  const onHeartTap = () => {
    setEnergy(e => e + 1);
    heartsBucketRef.current += 1;
    popularityBucketRef.current += 1;
    if (!popularityFlushTimer.current) {
      popularityFlushTimer.current = setTimeout(() => {
        const delta = Math.min(500, popularityBucketRef.current);
        popularityBucketRef.current = 0;
        popularityFlushTimer.current = null;
        if (delta > 0) {
          supabase.rpc("bump_room_popularity" as any, { _room_id: roomId, _delta: delta }).then(() => {});
        }
      }, 700);
    }
    if (heartsBucketRef.current >= 100) {
      heartsBucketRef.current = 0;
      if (!chestClosed) {
        setChestProgress(p => {
          const next = Math.min(100, p + 1);
          if (next >= 100) setChestReady(true);
          return next;
        });
      }
    }
  };

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

  // Profile sheet helpers
  const openProfileForSeat = (s: SeatLite) => {
    if (!s.user_id) return;
    setProfileTarget({ userId: s.user_id, seatId: s.id, seatIndex: s.seat_index, isMuted: s.is_muted });
  };
  const openProfileForUser = (uid: string) => {
    const seat = seats.find(x => x.user_id === uid);
    setProfileTarget(seat
      ? { userId: uid, seatId: seat.id, seatIndex: seat.seat_index, isMuted: seat.is_muted }
      : { userId: uid });
  };
  const profileMute = async (t: ProfileTarget) => {
    if (!isRoomOwner || !t.seatId) return;
    await supabase.from("room_seats").update({ is_muted: !t.isMuted }).eq("id", t.seatId);
    toast.message(t.isMuted ? "Mikrofon açıldı" : "Kullanıcı susturuldu 🔇");
    setProfileTarget(null);
  };
  const profileKick = async (t: ProfileTarget) => {
    if (!isRoomOwner || !t.seatId) return;
    await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("id", t.seatId);
    toast.success("Kullanıcı koltuktan indirildi");
    setProfileTarget(null);
  };
  const profileBan = async (t: ProfileTarget) => {
    if (!isRoomOwner) return;
    if (t.seatId) await supabase.from("room_seats").update({ user_id: null, is_muted: false }).eq("id", t.seatId);
    setBannedIds(prev => new Set(prev).add(t.userId));
    toast.success("Kullanıcı odadan yasaklandı 🔨");
    setProfileTarget(null);
  };
  const profileMakeMod = (t: ProfileTarget) => {
    if (!isRoomOwner) return;
    setModIds(prev => new Set(prev).add(t.userId));
    toast.success("Moderatör yetkisi verildi 👑");
    setProfileTarget(null);
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

  // Soundboard broadcast channel
  useEffect(() => {
    const ch = supabase.channel(`sfx:${roomId}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "play" }, (p) => {
        const emoji = p.payload?.emoji as string;
        const label = p.payload?.label as string;
        if (!emoji) return;
        setSfxActive({ emoji, label });
        setTimeout(() => setSfxActive(null), 1800);
      })
      .subscribe();
    sfxChanRef.current = ch;
    return () => { supabase.removeChannel(ch); sfxChanRef.current = null; };
  }, [roomId]);

  const isModerator = !!user && (isRoomOwner || modIds.has(user.id));

  const playSfx = (emoji: string, label: string) => {
    sfxChanRef.current?.send({ type: "broadcast", event: "play", payload: { emoji, label } });
    setSbOpen(false);
  };

  // mySeat üzerinde konuşma göstergesini ve sfx pulse'ını yansıt
  const seatsView = seats.map(s => {
    if (!s.user_id) return s;
    const isSelf = s.user_id === user?.id;
    const base = isSelf ? { ...s, speaking: speaking && micOn, is_muted: !micOn } : s;
    if (sfxActive) return { ...base, speaking: true, is_muted: false };
    return base;
  });

  return (
    <div className="bg-gradient-hero min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={leave} className="size-10 rounded-full bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-display font-bold truncate">{room?.title ?? "..."}</p>
            <span className="shrink-0 flex items-center gap-1 bg-card/80 backdrop-blur border border-accent/40 rounded-full px-2 py-0.5 shadow-glow">
              <Flame className="size-3 text-gold flame-pulse" />
              <span className="text-[11px] font-display font-bold text-gold tabular-nums">{energy}</span>
            </span>
          </div>
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
          <span key={profile?.coin_balance ?? 0} className="text-xs font-semibold tabular-nums animate-scale-in">
            {(profile?.coin_balance ?? 0).toLocaleString("tr-TR")}
          </span>
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
          onSelectTarget={(uid) => openProfileForUser(uid)}
          onToggleLock={toggleLock}
          onModerate={(s) => openProfileForSeat(s)}
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
        {messages.map(m => m.user_id === "__system__" ? (
          <div key={m.id} className="flex justify-center">
            <p className="text-[12px] font-display font-bold text-center text-gold glow-text
                          bg-gradient-to-r from-primary/20 via-accent/25 to-primary/20
                          border border-accent/40 rounded-full px-3 py-1 max-w-full break-words">
              {m.content}
            </p>
          </div>
        ) : (
          <div key={m.id} className="flex items-start gap-2">
            <button
              onClick={() => openProfileForUser(m.user_id)}
              className="size-7 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0 hover:ring-2 hover:ring-accent transition"
            >
              {profiles[m.user_id]?.display_name?.[0]?.toUpperCase() ?? "?"}
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => openProfileForUser(m.user_id)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
              >
                {(() => {
                  const lvl = levelOf(profiles[m.user_id]?.xp);
                  const vip = m.user_id === room?.owner_id || modIds.has(m.user_id);
                  return (
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                      vip
                        ? "bg-gradient-to-r from-gold to-amber-500 text-background shadow-[0_0_6px_rgba(255,200,60,0.6)]"
                        : lvl >= 10
                          ? "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white"
                          : lvl >= 5
                            ? "bg-gradient-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                    }`}>
                      {vip && <Crown className="size-2.5" />}
                      Lv.{lvl}{vip ? " VIP" : ""}
                    </span>
                  );
                })()}
                <span>{profiles[m.user_id]?.display_name ?? "..."}</span>
              </button>
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

      {/* Premium full-screen gift overlay (queued) */}
      <GiftOverlay
        events={giftQueue}
        onConsumed={(id) => setGiftQueue(prev => prev.filter(e => e.id !== id))}
      />

      {/* Glowing chat fx (kitten announcement) */}
      <div className="pointer-events-none fixed left-0 right-0 top-28 z-30 flex flex-col items-center gap-1 px-4">
        {chatFx.map(c => (
          <p key={c.id} className="glow-text text-sm font-display font-bold text-gold text-center animate-fade-in">
            {c.text}
          </p>
        ))}
      </div>

      {/* Treasure Chest */}
      <div className="fixed top-24 right-3 z-30 flex flex-col items-center gap-1 w-16">
        <button
          onClick={claimChest}
          disabled={!chestReady || claimedRef.current || chestClosed}
          className={`relative size-14 rounded-2xl flex items-center justify-center text-2xl shadow-glow transition
            ${chestReady ? "bg-gradient-to-br from-accent to-primary chest-ready" : "bg-card border border-border opacity-90"}`}
          title={chestReady ? "İlk tıklayan kapar!" : "Sandık doluyor..."}
        >
          <span>{chestClosed ? "✅" : chestReady ? "🎁" : "📦"}</span>
          {chestReady && <Sparkles className="absolute -top-1 -right-1 size-4 text-gold animate-pulse" />}
        </button>
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden border border-border">
          <div
            className={`h-full transition-all duration-300 ${chestReady ? "bg-gradient-to-r from-accent to-primary" : "bg-gradient-primary"}`}
            style={{ width: `${chestProgress}%` }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground font-semibold">
          {chestClosed ? "Bitti" : chestReady ? "KAP!" : `${Math.floor(chestProgress)}%`}
        </p>
      </div>

      {/* Chest ready banner */}
      {chestReady && !chestClosed && (
        <div className="pointer-events-none fixed top-44 left-1/2 -translate-x-1/2 z-30 animate-scale-in">
          <div className="bg-gradient-to-r from-accent via-primary to-accent px-5 py-2 rounded-full shadow-glow">
            <p className="text-sm font-display font-extrabold text-primary-foreground glow-text whitespace-nowrap">
              🎁 LOUNGE BONUSU: İLK TIKLAYAN KAPAR!
            </p>
          </div>
        </div>
      )}

      {/* Soundboard floating button + panel (owner/mod only) */}
      {isModerator && (
        <div className="fixed top-44 right-3 z-30 flex flex-col items-end gap-2">
          <button
            onClick={() => setSbOpen(o => !o)}
            className={`size-12 rounded-2xl flex items-center justify-center shadow-glow transition ${
              sbOpen ? "bg-gradient-primary" : "bg-card border border-border"
            }`}
            title="Ses Efektleri"
          >
            <Music2 className={`size-5 ${sbOpen ? "text-primary-foreground" : "text-foreground"}`} />
          </button>
          {sbOpen && (
            <div className="bg-card/95 backdrop-blur border border-accent/40 rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-glow animate-scale-in w-44">
              <p className="col-span-2 text-[10px] font-display font-bold text-center text-muted-foreground uppercase tracking-wider pt-1">Ses Efektleri 🎵</p>
              {SFX_LIST.map(s => (
                <button
                  key={s.label}
                  onClick={() => playSfx(s.emoji, s.label)}
                  className="bg-secondary hover:bg-gradient-primary hover:text-primary-foreground transition rounded-xl py-2 text-xs font-semibold flex flex-col items-center gap-0.5 active:scale-[0.97]"
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active SFX banner */}
      {sfxActive && (
        <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 animate-scale-in">
          <div className="bg-gradient-to-r from-primary via-accent to-primary px-8 py-4 rounded-full shadow-glow flex items-center gap-3">
            <span className="text-4xl animate-pulse">{sfxActive.emoji}</span>
            <p className="text-base font-display font-extrabold text-primary-foreground glow-text whitespace-nowrap">
              {sfxActive.label.toUpperCase()}!
            </p>
          </div>
        </div>
      )}

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
        <HeartTapper onTap={onHeartTap} />
      </footer>

      {/* Free-hearts hint (floats above the heart button, well clear of the footer) */}
      <span className="pointer-events-none fixed right-3 bottom-24 z-40 whitespace-nowrap
                       text-[10px] font-display font-bold px-2.5 py-1 rounded-full
                       bg-background/80 backdrop-blur border border-accent/60 text-gold glow-text shadow-glow animate-fade-in">
        Bedava Kalpler odayı trende taşır! 🔥
      </span>

      <UserProfileSheet
        target={profileTarget}
        viewerId={user?.id}
        isOwner={isRoomOwner}
        onClose={() => setProfileTarget(null)}
        onMute={profileMute}
        onKickSeat={profileKick}
        onBan={profileBan}
        onMakeMod={profileMakeMod}
      />

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
