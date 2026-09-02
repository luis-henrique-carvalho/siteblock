import { useState } from "react";
import { Plus, MoreVertical, Edit2, Copy, Trash2, CheckCircle2, Clock, PowerOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/siteblock";
import { useLanguage } from "@/i18n";
import {
  ProfileDialog,
  getProfileIconComponent,
  getProfileColorClasses,
} from "./ProfileDialog";

interface ProfileTabsProps {
  profiles: Profile[];
  selectedProfileId: string;
  activeProfileIds: string[];
  masterEnabled: boolean;
  disabled?: boolean;
  onSelectProfile: (id: string) => void;
  onToggleProfile: (id: string) => void;
  onCreateProfile: (name: string, icon: string, color: string) => void;
  onUpdateProfile: (id: string, updates: Partial<Profile>) => void;
  onDeleteProfile: (id: string) => void;
  onDuplicateProfile: (id: string) => void;
}

export function ProfileTabs({
  profiles,
  selectedProfileId,
  activeProfileIds,
  masterEnabled,
  disabled = false,
  onSelectProfile,
  onToggleProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onDuplicateProfile,
}: ProfileTabsProps) {
  const { t } = useLanguage();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const activeCount = profiles.filter((p) => activeProfileIds.includes(p.id)).length;

  return (
    <div className="w-full space-y-3">
      {/* Top info and header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("profiles.eyebrow")}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium text-muted-foreground">
            {t("profiles.activeCount", {
              active: masterEnabled ? activeCount : 0,
              total: profiles.length,
            })}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setCreateDialogOpen(true)}
          className="h-8 gap-1.5 text-xs font-medium border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/5"
        >
          <Plus className="size-3.5" />
          {t("profiles.new")}
        </Button>
      </div>

      {/* Profile Pills / Tabs List */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          const isCurrentlyActive = masterEnabled && activeProfileIds.includes(profile.id);
          const IconComp = getProfileIconComponent(profile.icon);
          const colorStyles = getProfileColorClasses(profile.color);

          return (
            <div
              key={profile.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectProfile(profile.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectProfile(profile.id);
                }
              }}
              className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer select-none shrink-0 ${
                isSelected
                  ? `border-border bg-card shadow-sm ring-1 ${colorStyles.ring}`
                  : "border-border/50 bg-card/50 hover:bg-card hover:border-border/80 text-muted-foreground"
              }`}
            >
              {/* Profile Icon and active indicator */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`size-8 rounded-lg flex items-center justify-center border transition-colors ${
                    isSelected
                      ? colorStyles.tabActive
                      : "border-border/40 bg-muted/40 text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  <IconComp className="size-4" />
                </div>
                {isCurrentlyActive && (
                  <span
                    className={`absolute -top-1 -right-1 size-2.5 rounded-full ${colorStyles.indicator} ring-2 ring-background animate-pulse`}
                    title={t("profiles.activeNow")}
                  />
                )}
              </div>

              {/* Profile Name and status */}
              <div className="flex flex-col items-start pr-1">
                <span
                  className={`text-sm font-semibold tracking-tight transition-colors ${
                    isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {profile.name}
                </span>

                <div className="flex items-center gap-1.5 text-[11px]">
                  {isCurrentlyActive ? (
                    <span className="flex items-center gap-1 font-medium text-emerald-500 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      {t("profiles.activeNow")}
                    </span>
                  ) : profile.enabled ? (
                    <span className="flex items-center gap-1 text-muted-foreground/80">
                      <Clock className="size-3" />
                      {t("profiles.outsideSchedule")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground/60">
                      <PowerOff className="size-3" />
                      {t("profiles.disabled")}
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-border/40 my-auto" />

              {/* Per-profile Toggle Switch */}
              <div
                className="flex items-center pl-0.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={profile.enabled}
                  disabled={disabled}
                  onCheckedChange={() => onToggleProfile(profile.id)}
                  className="scale-80"
                  aria-label={`Alternar ${profile.name}`}
                />
              </div>

              {/* Context menu for Edit/Duplicate/Delete */}
              <div
                className="flex items-center"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      className="size-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label={`Opções do perfil ${profile.name}`}
                    >
                      <MoreVertical className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={() => setEditingProfile(profile)}
                      className="gap-2 text-xs"
                    >
                      <Edit2 className="size-3.5" />
                      {t("profiles.editTitle")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDuplicateProfile(profile.id)}
                      className="gap-2 text-xs"
                    >
                      <Copy className="size-3.5" />
                      {t("profiles.duplicate")}
                    </DropdownMenuItem>
                    {profiles.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteProfile(profile.id)}
                          className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                          {t("profiles.delete")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog for Create */}
      <ProfileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={async (name, icon, color) => {
          onCreateProfile(name, icon, color);
        }}
      />

      {/* Dialog for Edit */}
      {editingProfile && (
        <ProfileDialog
          open={Boolean(editingProfile)}
          profile={editingProfile}
          onOpenChange={(open) => {
            if (!open) setEditingProfile(null);
          }}
          onSave={async (name, icon, color) => {
            onUpdateProfile(editingProfile.id, { name, icon, color });
            setEditingProfile(null);
          }}
        />
      )}
    </div>
  );
}
