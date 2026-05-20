import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/app/BottomNav";
import { MiniPlayer } from "@/components/app/MiniPlayer";
import { ActiveRoomProvider } from "@/lib/active-room-context";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="size-16 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center animate-pulse">
          <Sparkles className="size-8 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <ActiveRoomProvider>
      <div className="relative min-h-screen w-full bg-background mx-auto max-w-md">
        <div key={location.pathname} className="pb-28 animate-route-in">
          <Outlet />
        </div>
        <MiniPlayer />
        <BottomNav />
      </div>
    </ActiveRoomProvider>
  );
}
