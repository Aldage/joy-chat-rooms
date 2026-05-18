import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function CreateRoomDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Sohbet");
  const [seats, setSeats] = useState<6 | 8>(8);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !title.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("rooms").insert({
      title: title.trim(), tag, seat_count: seats, owner_id: user.id,
    }).select("id").single();
    setLoading(false);
    if (error || !data) { toast.error(error?.message ?? "Hata"); return; }
    onOpenChange(false); setTitle("");
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-3xl max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Oda Oluştur</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Oda başlığı..." maxLength={50} className="w-full bg-secondary border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Kategori</p>
            <div className="flex flex-wrap gap-2">
              {["Sohbet","Müzik","Oyun","Aşk","Yeni"].map(t => (
                <button key={t} onClick={()=>setTag(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tag===t?"bg-gradient-primary text-primary-foreground":"bg-secondary text-muted-foreground border border-border"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Koltuk sayısı</p>
            <div className="flex gap-2">
              {[6,8].map(n => (
                <button key={n} onClick={()=>setSeats(n as 6|8)} className={`flex-1 py-3 rounded-2xl text-sm font-semibold ${seats===n?"bg-gradient-primary text-primary-foreground shadow-glow":"bg-secondary text-muted-foreground border border-border"}`}>{n} koltuk</button>
              ))}
            </div>
          </div>
          <button onClick={submit} disabled={loading || !title.trim()} className="w-full bg-gradient-primary text-primary-foreground py-3.5 rounded-2xl text-sm font-semibold shadow-glow disabled:opacity-50">
            {loading ? "..." : "Odayı Aç"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
