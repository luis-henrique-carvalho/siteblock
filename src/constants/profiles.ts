import {
  Target,
  BookOpen,
  Moon,
  Shield,
  Briefcase,
  Gamepad2,
  Coffee,
  Zap,
} from "lucide-react";

export const AVAILABLE_ICONS = [
  { id: "target", label: "Foco", Icon: Target },
  { id: "book", label: "Estudo", Icon: BookOpen },
  { id: "moon", label: "Sono", Icon: Moon },
  { id: "shield", label: "Escudo", Icon: Shield },
  { id: "briefcase", label: "Trabalho", Icon: Briefcase },
  { id: "gamepad", label: "Jogos", Icon: Gamepad2 },
  { id: "coffee", label: "Pausa", Icon: Coffee },
  { id: "zap", label: "Energia", Icon: Zap },
];

export const AVAILABLE_COLORS = [
  { id: "blue", label: "Azul", class: "bg-blue-500 hover:bg-blue-600 border-blue-400" },
  { id: "emerald", label: "Verde", class: "bg-emerald-500 hover:bg-emerald-600 border-emerald-400" },
  { id: "indigo", label: "Índigo", class: "bg-indigo-500 hover:bg-indigo-600 border-indigo-400" },
  { id: "purple", label: "Roxo", class: "bg-purple-500 hover:bg-purple-600 border-purple-400" },
  { id: "amber", label: "Âmbar", class: "bg-amber-500 hover:bg-amber-600 border-amber-400" },
  { id: "rose", label: "Rosa", class: "bg-rose-500 hover:bg-rose-600 border-rose-400" },
];

export function getProfileIconComponent(iconName: string) {
  const match = AVAILABLE_ICONS.find((i) => i.id === iconName);
  return match ? match.Icon : Shield;
}

export function getProfileColorClasses(colorName: string) {
  switch (colorName) {
    case "emerald":
      return {
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        tabActive: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
        indicator: "bg-emerald-500",
        ring: "ring-emerald-500/50",
      };
    case "indigo":
      return {
        badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        tabActive: "border-indigo-500 bg-indigo-500/10 text-indigo-400",
        indicator: "bg-indigo-500",
        ring: "ring-indigo-500/50",
      };
    case "purple":
      return {
        badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        tabActive: "border-purple-500 bg-purple-500/10 text-purple-400",
        indicator: "bg-purple-500",
        ring: "ring-purple-500/50",
      };
    case "amber":
      return {
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        tabActive: "border-amber-500 bg-amber-500/10 text-amber-400",
        indicator: "bg-amber-500",
        ring: "ring-amber-500/50",
      };
    case "rose":
      return {
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        tabActive: "border-rose-500 bg-rose-500/10 text-rose-400",
        indicator: "bg-rose-500",
        ring: "ring-rose-500/50",
      };
    case "blue":
    default:
      return {
        badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        tabActive: "border-blue-500 bg-blue-500/10 text-blue-400",
        indicator: "bg-blue-500",
        ring: "ring-blue-500/50",
      };
  }
}
