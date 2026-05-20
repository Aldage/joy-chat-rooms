import { Link, useLocation } from "@tanstack/react-router";
import { Radio, X, ChevronUp } from "lucide-react";
import { useActiveRoom } from "@/lib/active-room-context";

export function MiniPlayer() {
  const { room, clear } = useActiveRoom();
  const loc = useLocation();
  if (!room) return null;
  if (loc.pathname.startsWith("/room/")) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md px-3 z-40 pointer-events-none">
      <div className="pointer-events-auto rounded-2xl bg-gradient-to-r from-primary/90 via-accent/85 to-primary/90 backdrop-blur-xl border border-accent/60 shadow-glow flex items-center gap-3 px-3 py-2 animate-fade-in">
        <div className="relative size-10 rounded-xl bg-card/30 flex items-center justify-center">
          <Radio className="size-5 text-primary-foreground" />
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-live border-2 border-card animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70 font-bold">Canlı odan açık</p>
          <p className="text-sm font-display font-bold text-primary-foreground truncate">{room.title}</p>
        </div>
        <Link
          to="/room/$roomId"
          params={{ roomId: room.id }}
          className="size-9 rounded-xl bg-background/20 hover:bg-background/30 flex items-center justify-center transition"
          title="Odaya geri dön"
        >
          <ChevronUp className="size-4 text-primary-foreground" />
        </Link>
        <button
          onClick={clear}
          className="size-9 rounded-xl bg-background/20 hover:bg-destructive/40 flex items-center justify-center transition"
          title="Odadan ayrıl"
        >
          <X className="size-4 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}