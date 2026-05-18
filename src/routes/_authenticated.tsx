import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/app/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.href } as any });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const loc = useLocation();
  const hideNav = loc.pathname.startsWith("/room/");
  return (
    <div className="min-h-screen bg-background relative max-w-md mx-auto overflow-hidden">
      <div className="pb-24">
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
