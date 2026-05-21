import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  coin_balance: number;
  coins_earned: number;
  is_guest: boolean;
  xp?: number;
  active_minutes?: number;
  last_daily_bonus_at?: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isVip: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  pendingDailyBonus: number;
  acknowledgeDailyBonus: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingDailyBonus, setPendingDailyBonus] = useState(0);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data as Profile | null);
  };

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const roles = (data ?? []).map((r: any) => r.role);
    const admin = roles.includes("admin");
    const vip = roles.includes("vip") || admin;
    setIsAdmin(admin);
    setIsVip(vip);
  };

  const claimDailyBonus = async () => {
    try {
      const { data, error } = await supabase.rpc("claim_daily_bonus" as any);
      if (error) return;
      const amount = Number(data ?? 0);
      if (amount > 0) {
        setPendingDailyBonus(amount);
      }
    } catch {}
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          loadProfile(s.user.id);
          loadRoles(s.user.id);
          if (_e === "SIGNED_IN") claimDailyBonus().then(() => loadProfile(s.user.id));
        }, 0);
      } else {
        setProfile(null);
        setIsVip(false);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
        loadRoles(s.user.id);
        claimDailyBonus().then(() => { if (s?.user) loadProfile(s.user.id); });
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // realtime profile updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profile:${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, (payload) => {
        setProfile(payload.new as Profile);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <Ctx.Provider value={{
      user, session, profile, isVip, isAdmin, loading,
      signOut: async () => { await supabase.auth.signOut(); },
      refreshProfile: async () => { if (user) await loadProfile(user.id); },
      pendingDailyBonus,
      acknowledgeDailyBonus: () => setPendingDailyBonus(0),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
