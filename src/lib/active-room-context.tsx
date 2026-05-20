import { createContext, useContext, useState, type ReactNode } from "react";

export type ActiveRoom = {
  id: string;
  title: string;
  ownerName?: string;
  tag?: string | null;
};

type Ctx = {
  room: ActiveRoom | null;
  setRoom: (r: ActiveRoom | null) => void;
  clear: () => void;
};

const ActiveRoomCtx = createContext<Ctx | undefined>(undefined);

export function ActiveRoomProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<ActiveRoom | null>(null);
  return (
    <ActiveRoomCtx.Provider value={{ room, setRoom, clear: () => setRoom(null) }}>
      {children}
    </ActiveRoomCtx.Provider>
  );
}

export function useActiveRoom() {
  const ctx = useContext(ActiveRoomCtx);
  if (!ctx) throw new Error("useActiveRoom must be inside ActiveRoomProvider");
  return ctx;
}