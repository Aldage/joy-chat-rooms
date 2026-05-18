import { Link, useLocation } from "@tanstack/react-router";
import { Home, Compass, Wallet, User } from "lucide-react";

const items = [
  { to: "/home", label: "Ana", icon: Home },
  { to: "/discover", label: "Keşfet", icon: Compass },
  { to: "/wallet", label: "Cüzdan", icon: Wallet },
  { to: "/profile", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
      <div className="mx-3 mb-3 rounded-3xl bg-card/90 backdrop-blur-xl border border-border shadow-soft px-2 py-2 flex">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to;
          return (
            <Link key={to} to={to} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition">
              <div className={`size-10 flex items-center justify-center rounded-2xl transition ${active ? "bg-gradient-primary shadow-glow" : ""}`}>
                <Icon className={`size-5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-[10px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
