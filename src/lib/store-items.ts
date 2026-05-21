import type { LucideIcon } from "lucide-react";
import { Crown, Sparkles, Zap, Flame, Star, Heart, Plane, Car } from "lucide-react";

export type StoreItem = {
  id: string;
  name: string;
  cost: number;
  type: "frame" | "entry";
  icon: LucideIcon;
  gradient: string;     // tailwind from-* via-* to-*
  description: string;
  vipOnly?: boolean;
};

export const FRAMES: StoreItem[] = [
  { id: "frame_neon_star", name: "Neon Yıldız", cost: 800, type: "frame",
    icon: Star, gradient: "from-fuchsia-500 via-pink-500 to-violet-500",
    description: "Pembe-mor neon parıltı çerçevesi" },
  { id: "frame_gold_king", name: "Altın Kral Tacı", cost: 2500, type: "frame",
    icon: Crown, gradient: "from-amber-300 via-gold to-amber-600",
    description: "Kraliyet sınıfı altın taç çerçevesi" },
  { id: "frame_angel_wing", name: "Melek Kanadı", cost: 1500, type: "frame",
    icon: Sparkles, gradient: "from-sky-200 via-cyan-300 to-indigo-400",
    description: "Yumuşak parıltılı melek kanadı" },
  { id: "frame_flame", name: "Ateş Çemberi", cost: 1200, type: "frame",
    icon: Flame, gradient: "from-orange-500 via-rose-500 to-red-600",
    description: "Yanan alev efektli çerçeve" },
];

export const ENTRIES: StoreItem[] = [
  { id: "entry_sportscar", name: "Lüks Spor Araba", cost: 3000, type: "entry",
    icon: Car, gradient: "from-red-500 via-orange-500 to-yellow-400",
    description: "Odaya gaza basarak gir" },
  { id: "entry_helicopter", name: "Helikopter Süzülüşü", cost: 4500, type: "entry",
    icon: Plane, gradient: "from-sky-500 via-indigo-500 to-violet-500",
    description: "Gökten inişle giriş yap" },
  { id: "entry_heart_storm", name: "Kalp Yağmuru", cost: 1800, type: "entry",
    icon: Heart, gradient: "from-pink-400 via-rose-500 to-fuchsia-500",
    description: "Odaya kalp fırtınasıyla gir" },
  { id: "entry_lightning", name: "Şimşek Girişi", cost: 2200, type: "entry",
    icon: Zap, gradient: "from-yellow-300 via-amber-400 to-orange-500",
    description: "Yıldırım hızıyla sahneye fırla" },
];

export const ALL_ITEMS: StoreItem[] = [...FRAMES, ...ENTRIES];

// VIP-exclusive frames — automatically unlocked for users with the VIP role.
// Not purchasable. Surfaced in profile inventory when has_role(user, 'vip') is true.
export const VIP_FRAMES: StoreItem[] = [
  { id: "frame_vip_diamond", name: "Elmas VIP", cost: 0, type: "frame",
    icon: Sparkles, gradient: "from-cyan-300 via-sky-400 to-indigo-500",
    description: "VIP'lere özel elmas çerçeve", vipOnly: true },
  { id: "frame_vip_phoenix", name: "Anka Tacı", cost: 0, type: "frame",
    icon: Flame, gradient: "from-amber-300 via-orange-500 to-rose-600",
    description: "VIP'lere özel ateş tacı", vipOnly: true },
  { id: "frame_vip_royal", name: "Kraliyet VIP", cost: 0, type: "frame",
    icon: Crown, gradient: "from-yellow-300 via-amber-500 to-fuchsia-600",
    description: "Saf VIP kraliyet çerçevesi", vipOnly: true },
];

export const ALL_ITEMS_WITH_VIP: StoreItem[] = [...ALL_ITEMS, ...VIP_FRAMES];

// Level math — derived from XP. Matches dice_play XP awards.
export function levelFromXp(xp: number): { level: number; current: number; next: number } {
  const lvl = Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1);
  const base = (lvl - 1) ** 2 * 50;
  const next = lvl ** 2 * 50;
  return { level: lvl, current: xp - base, next: next - base };
}

export const findItem = (id?: string | null) =>
  id ? (ALL_ITEMS_WITH_VIP.find(i => i.id === id) ?? null) : null;