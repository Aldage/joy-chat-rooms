import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/discover")({ component: Discover });

function Discover() {
  const [top, setTop] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("id,display_name,avatar_url,coins_earned").order("coins_earned", { ascending: false }).limit(50).then(({ data }) => setTop(data ?? []));
  }, []);
  return (
    <div className="bg-gradient-hero min-h-screen px-5 pt-12">
      <h1 className="text-2xl font-display font-bold mb-1">Keşfet</h1>
      <p className="text-sm text-muted-foreground mb-6">Haftanın en çok kazananları</p>
      <div className="space-y-2">
        {top.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3">
            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${i<3?"bg-gradient-primary text-primary-foreground shadow-glow":"bg-secondary text-muted-foreground"}`}>{i+1}</div>
            <div className="size-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">{u.display_name?.[0]?.toUpperCase()}</div>
            <p className="flex-1 font-semibold text-sm truncate">{u.display_name}</p>
            <div className="flex items-center gap-1 text-gold text-sm font-semibold">
              <Coins className="size-3.5" /> {u.coins_earned}
            </div>
          </div>
        ))}
        {top.length===0 && <div className="text-center text-muted-foreground py-12 text-sm flex flex-col items-center gap-2"><TrendingUp className="size-8 opacity-50" />Henüz veri yok</div>}
      </div>
    </div>
  );
}
