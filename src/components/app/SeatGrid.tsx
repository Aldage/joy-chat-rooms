import { Mic, MicOff, Lock, Plus, Crown } from "lucide-react";
import { findItem } from "@/lib/store-items";

export type SeatLite = {
  id: string;
  seat_index: number;
  user_id: string | null;
  is_muted: boolean;
  is_locked: boolean;
  user?: { display_name: string; avatar_url: string | null; active_frame?: string | null } | null;
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
  const vipSeats = seats.slice(0, 2);
  const guestSeats = seats.slice(2);

  const renderSeat = (s: SeatLite, big = false) => {
        const occupied = !!s.user_id;
        const isOwner = s.user_id === ownerId;
        const isTarget = targetUserId === s.user_id;
        const isSelf = currentUserId && s.user_id === currentUserId;
        const frame = findItem(s.user?.active_frame);
        const size = big ? "size-20" : "size-16";
        const letter = big ? "text-2xl" : "text-xl";
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
            <div className={`relative ${size} rounded-full flex items-center justify-center transition ${
              occupied
                ? `${frame ? `p-[3px] bg-gradient-to-tr ${frame.gradient} shadow-[0_0_18px_-2px] shadow-current` : "bg-gradient-primary shadow-glow"} ${s.speaking && !s.is_muted ? "speaking sound-waves" : ""} ${isTarget ? "ring-4 ring-accent" : ""} ${isSelf ? "ring-2 ring-gold" : ""} ${big && !frame ? "ring-2 ring-gold/60" : ""}`
                : `bg-card border-2 border-dashed ${s.is_locked ? "border-destructive/60" : "border-border"} ${big ? "ring-1 ring-gold/40" : ""}`
            }`}>
              {occupied ? (
                <div className={`size-full rounded-full flex items-center justify-center ${frame ? "bg-gradient-primary" : ""}`}>
                  <span className={`${letter} font-display font-bold text-primary-foreground`}>
                    {s.user?.display_name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
              ) : s.is_locked ? (
                <Lock className={big ? "size-6 text-destructive" : "size-5 text-destructive"} />
              ) : (
                <Plus className={big ? "size-6 text-muted-foreground" : "size-5 text-muted-foreground"} />
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
            <p className={`text-[10px] font-semibold text-center truncate ${big ? "max-w-[80px]" : "max-w-[64px]"}`}>
              {s.user?.display_name ?? `#${s.seat_index + 1}`}
            </p>
          </button>
        );
  };

  return (
    <div className="px-4 space-y-4">
      {vipSeats.length > 0 && (
        <div className="flex items-start justify-center gap-8">
          {vipSeats.map(s => renderSeat(s, true))}
        </div>
      )}
      {guestSeats.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {guestSeats.map(s => renderSeat(s, false))}
        </div>
      )}
    </div>
  );
}
