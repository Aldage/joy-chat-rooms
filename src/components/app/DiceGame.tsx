import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Coins, Dices } from "lucide-react";
import { toast } from "sonner";

const BETS = [10, 50, 100] as const;
const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function DiceGame({ open, onOpenChange, roomId }: {
  open: boolean; onOpenChange: (v: boolean) => void; roomId: string;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const [bet, setBet] = useState<number>(10);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState<number | null>(null);

  const roll = async () => {
    if (!user || rolling) return;
    if ((profile?.coin_balance ?? 0) < bet) {
      toast.error("Yetersiz bakiye — bahsi düşür veya cüzdan yükle");
      return;
    }
    setRolling(true);
    // animation roll
    let ticks = 0;
    const id = setInterval(() => {
      setFace(Math.floor(Math.random() * 6));
      ticks += 1;
      if (ticks >= 12) clearInterval(id);
    }, 80);

    await new Promise(r => setTimeout(r, 1100));
    const result = Math.floor(Math.random() * 6) + 1; // 1..6
    setFace(result - 1);
    const isEven = result % 2 === 0;
    const delta = isEven ? bet : -bet; // even: win bet, odd: lose bet
    const newBal = (profile?.coin_balance ?? 0) + delta;

    const { error } = await supabase
      .from("profiles")
      .update({ coin_balance: newBal })
      .eq("id", user.id);
    if (error) { toast.error(error.message); setRolling(false); return; }
    await refreshProfile();

    const text = isEven
      ? `🎲 ${profile?.display_name ?? "Birisi"} zar attı: ${FACES[result - 1]} (${result}) — kasayı katladı, +${bet} coin! 🎉`
      : `🎲 ${profile?.display_name ?? "Birisi"} zar attı: ${FACES[result - 1]} (${result}) — kasa kazandı, -${bet} coin 💸`;

    await supabase.from("room_messages").insert({
      room_id: roomId, user_id: user.id, content: text, message_type: "dice",
    });

    // audit log (best-effort)
    await supabase.from("dice_games" as any).insert({
      user_id: user.id,
      room_id: roomId,
      bet_amount: bet,
      dice_result: result,
      is_win: isEven,
      reward_amount: isEven ? bet : 0,
    });
    await supabase.from("coin_transactions" as any).insert({
      user_id: user.id,
      amount: delta,
      type: isEven ? "dice_win" : "dice_bet",
      description: `Dice ${result} (bet ${bet})`,
    });

    setRolling(false);
    toast[isEven ? "success" : "message"](isEven ? `Kazandın! +${bet}` : `Kaybettin -${bet}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-card border-border rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center justify-between">
            <span className="flex items-center gap-2"><Dices className="size-4 text-accent" /> Şans Zarı</span>
            <span className="flex items-center gap-1 text-gold text-sm"><Coins className="size-4" />{profile?.coin_balance ?? 0}</span>
          </SheetTitle>
        </SheetHeader>

        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Çift gelirse <b className="text-gold">kazanırsın</b>, tek gelirse <b className="text-destructive">kasaya gider</b>.
        </p>

        {/* Dice */}
        <div className="flex items-center justify-center mt-6 mb-2">
          <div className={`size-28 rounded-3xl bg-gradient-to-br from-primary via-accent to-primary-glow shadow-glow flex items-center justify-center ${rolling ? "animate-spin" : "animate-scale-in"}`}>
            <span className="text-7xl drop-shadow leading-none">{face === null ? "🎲" : FACES[face]}</span>
          </div>
        </div>

        {/* Bets */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {BETS.map(b => (
            <button
              key={b}
              onClick={() => setBet(b)}
              disabled={rolling}
              className={`py-3 rounded-2xl text-sm font-semibold border transition flex items-center justify-center gap-1 ${
                bet === b
                  ? "bg-gradient-primary border-transparent text-primary-foreground shadow-glow"
                  : "bg-secondary border-border"
              }`}
            >
              <Coins className="size-3.5" /> {b}
            </button>
          ))}
        </div>

        <button
          onClick={roll}
          disabled={rolling}
          className="mt-5 w-full bg-gradient-primary text-primary-foreground py-3.5 rounded-2xl text-sm font-bold shadow-glow disabled:opacity-50"
        >
          {rolling ? "Zar dönüyor..." : `Zarı At (${bet} coin)`}
        </button>
      </SheetContent>
    </Sheet>
  );
}