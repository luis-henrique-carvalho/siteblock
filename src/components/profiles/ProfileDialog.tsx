import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Profile } from "@/types/siteblock";
import { useLanguage } from "@/i18n";

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

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
  onSave: (name: string, icon: string, color: string) => Promise<void> | void;
}

export function ProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
}: ProfileDialogProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("target");
  const [color, setColor] = useState("blue");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setIcon(profile.icon || "target");
      setColor(profile.color || "blue");
    } else {
      setName("");
      setIcon("target");
      setColor("blue");
    }
  }, [profile, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(name.trim(), icon, color);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {isEditing ? t("profiles.editTitle") : t("profiles.createTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("hero.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t("profiles.nameLabel")}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profiles.namePlaceholder")}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("profiles.iconLabel")}</Label>
              <div className="grid grid-cols-4 gap-2">
                {AVAILABLE_ICONS.map((item) => {
                  const IconComp = item.Icon;
                  const isSelected = icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(item.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                          : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <IconComp className="size-5" />
                      <span className="text-[11px] font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("profiles.colorLabel")}</Label>
              <div className="flex items-center gap-2.5">
                {AVAILABLE_COLORS.map((item) => {
                  const isSelected = color === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setColor(item.id)}
                      title={item.label}
                      className={`size-7 rounded-full border transition-all ${item.class} ${
                        isSelected ? "scale-115 ring-2 ring-foreground/40 shadow-sm" : "opacity-80 hover:opacity-100"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("profiles.cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {isEditing ? t("profiles.save") : t("profiles.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
