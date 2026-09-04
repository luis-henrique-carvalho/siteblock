import { useState } from "react";
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
import type { Profile } from "@/types/siteblock";
import { useLanguage } from "@/i18n";
import { AVAILABLE_ICONS, AVAILABLE_COLORS } from "../constants/profiles";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
  onSave: (name: string, icon: string, color: string) => Promise<void> | void;
}

interface ProfileFormProps {
  profile?: Profile | null;
  onSave: (name: string, icon: string, color: string) => Promise<void> | void;
  onCancel: () => void;
}

function ProfileForm({ profile, onSave, onCancel }: ProfileFormProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(profile?.name ?? "");
  const [icon, setIcon] = useState(profile?.icon || "target");
  const [color, setColor] = useState(profile?.color || "blue");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(name.trim(), icon, color);
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(profile);

  return (
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
          onClick={onCancel}
          disabled={saving}
        >
          {t("profiles.cancel")}
        </Button>
        <Button type="submit" disabled={!name.trim() || saving}>
          {isEditing ? t("profiles.save") : t("profiles.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
}: ProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <ProfileForm
            key={profile?.id ?? "new"}
            profile={profile}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
