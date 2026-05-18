import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Edit3, Coins, Trophy, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ display_name: name, bio }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    setEditing(false);
    toast.success("Güncellendi");
  };

  return (
    <div className="bg-gradient-hero min-h-screen px-5 pt-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Profil</h1>
        <button onClick={async () => { await signOut(); nav({ to: "/login" }); }} className="size-10 rounded-full bg-card border border-border flex items-center justify-center">
          <LogOut className="size-4 text-muted-foreground" />
        </button>
      </div>

      <div className="bg-gradient-card border border-border rounded-3xl p-6 shadow-soft text-center">
        <div className="size-24 rounded-full bg-gradient-primary mx-auto flex items-center justify-center text-3xl font-display font-bold text-primary-foreground shadow-glow">
          {profile?.display_name?.[0]?.toUpperCase()}
        </div>
        {editing ? (
          <input value={name} onChange={e=>setName(e.target.value)} className="mt-4 text-center bg-secondary border border-border rounded-xl px-3 py-2 text-sm font-semibold w-full" />
        ) : (
          <h2 className="mt-4 text-xl font-display font-bold">{profile?.display_name}</h2>
        )}
        <p className="text-xs text-muted-foreground mt-1">ID: {user?.id.slice(0,8)}</p>
        {editing ? (
          <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Bio..." maxLength={140} className="mt-3 w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none" rows={2} />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{profile?.bio || "Henüz bio yok"}</p>
        )}
        <button onClick={editing ? save : () => setEditing(true)} className="mt-4 inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-4 py-2 text-xs font-semibold">
          {editing ? <><Save className="size-3.5" /> Kaydet</> : <><Edit3 className="size-3.5" /> Düzenle</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <Coins className="size-5 text-gold mb-1" />
          <p className="text-xl font-display font-bold">{profile?.coin_balance ?? 0}</p>
          <p className="text-xs text-muted-foreground">Bakiye</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <Trophy className="size-5 text-accent mb-1" />
          <p className="text-xl font-display font-bold">{profile?.coins_earned ?? 0}</p>
          <p className="text-xs text-muted-foreground">Toplam Kazanç</p>
        </div>
      </div>
    </div>
  );
}
