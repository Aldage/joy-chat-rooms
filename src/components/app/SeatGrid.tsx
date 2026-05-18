import { Mic, MicOff, Lock, Plus, Crown } from "lucide-react";

export type SeatLite = {
  id: string;
  seat_index: number;
  user_id: string | null;
  is_muted: boolean;
  is_locked: boolean;
  user?: { display_name: string; avatar_url: string | null } | null;
  speaking?: boolean;
};

export function SeatGrid({ seats, ownerId, onSeatClick, onSelectTarget, targetUserId }: {
  seats: SeatLite[];
  ownerId: string;
  onSeatClick: (s: SeatLite) => void;
  onSelectTarget?: (userId: string) => void;
  targetUserId?: string | null;
}) {
  return (
    <div className="grid grid-cols-4 gap-3 px-4">
      {seats.map((s) => {
        const occupied = !!s.user_id;
        const isOwner = s.user_id === ownerId;
        const isTarget = targetUserId === s.user_id;
        return (
          <button
            key={s.id}
            onClick={() => {
              if (occupied && onSelectTarget && s.user_id) onSelectTarget(s.user_id);
              else onSeatClick(s);
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`relative size-16 rounded-full flex items-center justify-center transition ${
              occupied
                ? `bg-gradient-primary shadow-glow ${s.speaking && !s.is_muted ? "speaking" : ""} ${isTarget ? "ring-4 ring-accent" : ""}`
                : "bg-card border-2 border-dashed border-border"
            }`}>
              {occupied ? (
                <span className="text-xl font-display font-bold text-primary-foreground">
                  {s.user?.display_name?.[0]?.toUpperCase() ?? "?"}
                </span>
              ) : s.is_locked ? (
                <Lock className="size-5 text-muted-foreground" />
              ) : (
                <Plus className="size-5 text-muted-foreground" />
              )}
              {isOwner && (
                <div className="absolute -top-1 -right-1 size-6 rounded-full bg-gold flex items-center justify-center shadow-glow">
                  <Crown className="size-3 text-background" />
                </div>
              )}
              {occupied && (
                <div className={`absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center ${s.is_muted ? "bg-destructive" : "bg-card border border-border"}`}>
                  {s.is_muted ? <MicOff className="size-2.5 text-destructive-foreground" /> : <Mic className="size-2.5 text-foreground" />}
                </div>
              )}
            </div>
            <p className="text-[10px] font-semibold text-center max-w-[64px] truncate">
              {s.user?.display_name ?? `#${s.seat_index + 1}`}
            </p>
          </button>
        );
      })}
    </div>
  );
}
