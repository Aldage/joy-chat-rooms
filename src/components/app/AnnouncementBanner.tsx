import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X, AlertTriangle, PartyPopper } from "lucide-react";
import { toast } from "sonner";

type Announcement = {
  id: string;
  message: string;
  level: "info" | "warning" | "event";
  expires_at: string;
  is_active: boolean;
  created_at: string;
};

const DISMISS_KEY = "koizora.dismissedAnnouncements";

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function pushDismissed(id: string) {
  const s = getDismissed(); s.add(id);
  localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(s).slice(-50)));
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());

  useEffect(() => {
    let mounted = true;
    supabase
      .from("announcements")
      .select("id,message,level,expires_at,is_active,created_at")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (mounted) setItems((data ?? []) as Announcement[]); });

    const ch = supabase
      .channel("announcements")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          const a = payload.new as Announcement;
          if (!a.is_active) return;
          setItems((prev) => [a, ...prev.filter((x) => x.id !== a.id)]);
          toast(a.message, {
            icon: a.level === "warning"
              ? <AlertTriangle className="size-4 text-amber-400" />
              : a.level === "event"
                ? <PartyPopper className="size-4 text-pink-400" />
                : <Megaphone className="size-4 text-primary" />,
            duration: 6000,
          });
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "announcements" },
        (payload) => {
          const a = payload.new as Announcement;
          setItems((prev) => a.is_active
            ? prev.map((x) => x.id === a.id ? a : x)
            : prev.filter((x) => x.id !== a.id));
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "announcements" },
        (payload) => {
          const a = payload.old as { id: string };
          setItems((prev) => prev.filter((x) => x.id !== a.id));
        })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const visible = items.filter((a) =>
    !dismissed.has(a.id) && new Date(a.expires_at).getTime() > Date.now()
  );
  if (visible.length === 0) return null;

  const top = visible[0];
  const tone =
    top.level === "warning"
      ? "from-amber-500/30 via-orange-500/20 to-rose-500/20 border-amber-400/40"
      : top.level === "event"
        ? "from-pink-500/30 via-fuchsia-500/20 to-violet-500/20 border-pink-400/40"
        : "from-primary/30 via-accent/20 to-primary-glow/20 border-primary/40";
  const Icon = top.level === "warning" ? AlertTriangle : top.level === "event" ? PartyPopper : Megaphone;

  return (
    <div className="sticky top-0 z-40 px-3 pt-3">
      <div className={`relative rounded-2xl border bg-gradient-to-r ${tone} backdrop-blur-md px-3 py-2 flex items-center gap-2 shadow-soft animate-fade-in`}>
        <div className="size-7 rounded-lg bg-background/40 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-foreground" />
        </div>
        <p className="flex-1 text-xs font-semibold text-foreground leading-snug line-clamp-2">
          {top.message}
        </p>
        {visible.length > 1 && (
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">+{visible.length - 1}</span>
        )}
        <button
          aria-label="Kapat"
          onClick={() => { pushDismissed(top.id); setDismissed(new Set(getDismissed())); }}
          className="size-6 rounded-md hover:bg-background/40 flex items-center justify-center shrink-0"
        >
          <X className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}