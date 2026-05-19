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

export function SeatGrid({ seats, ownerId, currentUserId, onSeatClick, onLeaveSeat, onSelectTarget, onModerate, onToggleLock, targetUserId }: {
  seats: SeatLite[];
  ownerId: string;
  currentUserId?: string | null;
  onSeatClick: (s: SeatLite) => void;
  onLeaveSeat?: (s: SeatLite) => void;
  onSelectTarget?: (userId: string) => void;
  onModerate?: (s: SeatLite) => void;
  onToggleLock?: (s: SeatLite) => void;
  targetUserId?: string | null;
}) {
  const viewerIsOwner = !!currentUserId && currentUserId === ownerId;
  return (
    <div className="grid grid-cols-4 gap-3 px-4">
      {seats.map((s) => {
        const occupied = !!s.user_id;
        const isOwner = s.user_id === ownerId;
        const isTarget = targetUserId === s.user_id;
        const isSelf = currentUserId && s.user_id === currentUserId;
        return (
          <button
            key={s.id}
            onClick={() => {
              if (isSelf && onLeaveSeat) onLeaveSeat(s);
              else if (viewerIsOwner && occupied && !isOwner && onModerate) onModerate(s);
              else if (viewerIsOwner && !occupied && onToggleLock) onToggleLock(s);
              else if (occupied && onSelectTarget && s.user_id) onSelectTarget(s.user_id);
              else onSeatClick(s);
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={`relative size-16 rounded-full flex items-center justify-center transition ${
              occupied
                ? `bg-gradient-primary shadow-glow ${s.speaking && !s.is_muted ? "speaking" : ""} ${isTarget ? "ring-4 ring-accent" : ""} ${isSelf ? "ring-2 ring-gold" : ""}`
                : `bg-card border-2 border-dashed ${s.is_locked ? "border-destructive/60" : "border-border"}`
            }`}>
              {occupied ? (
                <span className="text-xl font-display font-bold text-primary-foreground">
                  {s.user?.display_name?.[0]?.toUpperCase() ?? "?"}
                </span>
              ) : s.is_locked ? (
                <Lock className="size-5 text-destructive" />
              ) : (
                <Plus className="size-5 text-muted-foreground" />
              )}
              {isOwner && (
                <div className="absolute -top-1 -right-1 size-6 rounded-full bg-gold flex items-center justify-center shadow-glow">
                  <Crown className="size-3 text-background" />
                </div>
              )}
              {occupied && s.is_locked && (
                <div className="absolute -top-1 -left-1 size-5 rounded-full bg-destructive flex items-center justify-center">
                  <Lock className="size-2.5 text-destructive-foreground" />
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
