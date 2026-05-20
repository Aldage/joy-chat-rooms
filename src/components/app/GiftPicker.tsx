import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Coins, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Gift = { id: string; name: string; emoji: string; cost: number };

export function GiftPicker({ open, onOpenChange, roomId, targetUserId }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  roomId: string; targetUserId: string | null;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selected, setSelected] = useState<Gift | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("gifts").select("*").order("cost").then(({ data }) => setGifts((data as Gift[]) ?? []));
  }, []);

  const send = async () => {
    if (!user || !selected) return;
    const receiver = targetUserId ?? user.id;
    if ((profile?.coin_balance ?? 0) < selected.cost) {
      toast.error("Yetersiz Bakiye! Lütfen Cüzdandan Coin Yükleyin", {
        icon: <AlertTriangle className="size-4 text-destructive" />,
        duration: 4000,
      });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("gift_transactions").insert({
      room_id: roomId, sender_id: user.id, receiver_id: receiver,
      gift_id: selected.id, amount: 1, total_cost: selected.cost,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    // XP kazanımı: her 10 coin = +1 XP (yalnızca gönderici)
    const xpGain = Math.max(1, Math.floor(selected.cost / 10));
    const currentXp = (profile as any)?.xp ?? 0;
    await supabase.from("profiles").update({ xp: currentXp + xpGain }).eq("id", user.id);
    await refreshProfile();
    toast.success(`${selected.emoji} ${selected.name} gönderildi!`);
    setSelected(null); onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-card border-border rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center justify-between">
            <span>Hediye Gönder</span>
            <span className="flex items-center gap-1 text-gold text-sm"><Coins className="size-4" />{profile?.coin_balance ?? 0}</span>
          </SheetTitle>
        </SheetHeader>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          {targetUserId ? "Seçili koltuğa gönderiliyor" : "Alıcı seçilmedi — kendine gönderilecek"}
        </p>
        <>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {gifts.map(g => (
                <button key={g.id} onClick={()=>setSelected(g)} className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition ${selected?.id===g.id?"bg-gradient-primary border-transparent shadow-glow":"bg-secondary border-border"}`}>
                  <span className="text-4xl">{g.emoji}</span>
                  <span className={`text-xs font-semibold ${selected?.id===g.id?"text-primary-foreground":""}`}>{g.name}</span>
                  <span className={`text-[10px] flex items-center gap-0.5 ${selected?.id===g.id?"text-primary-foreground":"text-gold"}`}>
                    <Coins className="size-2.5" />{g.cost}
                  </span>
                </button>
              ))}
            </div>
            <button disabled={!selected || sending} onClick={send} className="mt-5 w-full bg-gradient-primary text-primary-foreground py-3.5 rounded-2xl text-sm font-semibold shadow-glow disabled:opacity-50">
              {sending ? "..." : selected ? `${selected.cost} Coin ile Gönder` : "Hediye seç"}
            </button>
        </>
      </SheetContent>
    </Sheet>
  );
}
