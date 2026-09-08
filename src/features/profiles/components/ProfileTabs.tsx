import { useState, useEffect, useRef } from "react";
import {
  Plus,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  PowerOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { ProfileDialog } from "./ProfileDialog";
import { getProfileIconComponent } from "../constants/profiles";
import { cn } from "@/lib/utils";
import { useSiteBlockStore, useUIStore } from "@/stores";

interface ProfileTabsProps {
  profiles?: Profile[];
  selectedProfileId?: string;
  activeProfileIds?: string[];
  masterEnabled?: boolean;
  disabled?: boolean;
  onSelectProfile?: (id: string) => void;
  onToggleProfile?: (id: string) => void;
  onCreateProfile?: (name: string, icon: string, color: string) => void;
  onUpdateProfile?: (id: string, updates: Partial<Profile>) => void;
  onDeleteProfile?: (id: string) => void;
  onDuplicateProfile?: (id: string) => void;
}

const EMPTY_PROFILES: Profile[] = [];
const EMPTY_ACTIVE_IDS: string[] = [];
const PROFILES_PER_PAGE = 6;

function getPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, "ellipsis", total];
  }
  if (current >= total - 2) {
    return [1, "ellipsis", total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function ProfileTabs({
  profiles: propProfiles,
  selectedProfileId: propSelectedProfileId,
  activeProfileIds: propActiveProfileIds,
  masterEnabled: propMasterEnabled,
  disabled: propDisabled,
  onSelectProfile: propOnSelectProfile,
  onToggleProfile: propOnToggleProfile,
  onCreateProfile: propOnCreateProfile,
  onUpdateProfile: propOnUpdateProfile,
  onDeleteProfile: propOnDeleteProfile,
  onDuplicateProfile: propOnDuplicateProfile,
}: ProfileTabsProps = {}) {
  const { t } = useLanguage();
  const storeProfiles = useSiteBlockStore((s) => s.state?.profiles ?? EMPTY_PROFILES);
  const storeSelectedProfile = useSiteBlockStore((s) => s.getSelectedProfile());
  const storeActiveProfileIds = useSiteBlockStore((s) => s.state?.activeProfileIds ?? EMPTY_ACTIVE_IDS);
  const storeMasterEnabled = useSiteBlockStore((s) => s.state?.enabled ?? true);
  const busy = useUIStore((s) => s.busy);
  const helperInstalled = useSiteBlockStore((s) => s.state?.helperInstalled ?? true);

  const selectProfile = useSiteBlockStore((s) => s.selectProfile);
  const toggleProfileEnabled = useSiteBlockStore((s) => s.toggleProfileEnabled);
  const createProfile = useSiteBlockStore((s) => s.createProfile);
  const updateProfile = useSiteBlockStore((s) => s.updateProfile);
  const deleteProfile = useSiteBlockStore((s) => s.deleteProfile);
  const duplicateProfile = useSiteBlockStore((s) => s.duplicateProfile);

  const profiles = propProfiles ?? storeProfiles;
  const selectedProfileId =
    propSelectedProfileId ?? (storeSelectedProfile?.id ?? (profiles[0]?.id ?? ""));
  const activeProfileIds = propActiveProfileIds ?? storeActiveProfileIds;
  const masterEnabled = propMasterEnabled ?? storeMasterEnabled;
  const disabled = propDisabled ?? (busy || !helperInstalled);

  const onSelectProfile = propOnSelectProfile ?? selectProfile;
  const onToggleProfile = propOnToggleProfile ?? ((id) => void toggleProfileEnabled(id));
  const onCreateProfile =
    propOnCreateProfile ?? ((name, icon, color) => void createProfile(name, icon, color));
  const onUpdateProfile =
    propOnUpdateProfile ?? ((id, updates) => void updateProfile(id, updates));
  const onDeleteProfile = propOnDeleteProfile ?? ((id) => void deleteProfile(id));
  const onDuplicateProfile = propOnDuplicateProfile ?? ((id) => void duplicateProfile(id));

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const activeCount = profiles.filter((p) => activeProfileIds.includes(p.id)).length;
  const totalPages = Math.max(1, Math.ceil(profiles.length / PROFILES_PER_PAGE));

  const [currentPage, setCurrentPage] = useState(() => {
    const initId = propSelectedProfileId ?? storeSelectedProfile?.id ?? profiles[0]?.id;
    if (initId) {
      const idx = profiles.findIndex((p) => p.id === initId);
      if (idx !== -1) {
        return Math.floor(idx / PROFILES_PER_PAGE) + 1;
      }
    }
    return 1;
  });

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  const prevSelectedIdRef = useRef(selectedProfileId);
  useEffect(() => {
    if (selectedProfileId && selectedProfileId !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedProfileId;
      const idx = profiles.findIndex((p) => p.id === selectedProfileId);
      if (idx !== -1) {
        const pageOfSelected = Math.floor(idx / PROFILES_PER_PAGE) + 1;
        setCurrentPage(pageOfSelected);
      }
    }
  }, [selectedProfileId, profiles]);

  const startIndex = (safePage - 1) * PROFILES_PER_PAGE;
  const paginatedProfiles = profiles.slice(startIndex, startIndex + PROFILES_PER_PAGE);
  const pageItems = getPageItems(safePage, totalPages);

  return (
    <div className="w-full space-y-3">
      {/* Top info and header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">
            {t("profiles.eyebrow")}
          </span>
          <span className="text-xs text-muted-foreground/60">•</span>
          <span className="text-xs text-muted-foreground">
            {t("profiles.activeCount", {
              active: masterEnabled ? activeCount : 0,
              total: profiles.length,
            })}
          </span>
          {totalPages > 1 && (
            <>
              <span className="text-xs text-muted-foreground/60">•</span>
              <span className="text-xs font-medium text-muted-foreground">
                {t("profiles.pagination", { current: safePage, total: totalPages })}
              </span>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setCreateDialogOpen(true)}
          className="h-7 gap-1 text-xs font-medium self-start sm:self-auto"
        >
          <Plus className="size-3.5" />
          {t("profiles.new")}
        </Button>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
        {paginatedProfiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          const isCurrentlyActive = masterEnabled && activeProfileIds.includes(profile.id);
          const IconComp = getProfileIconComponent(profile.icon);

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
              className={cn(
                "group relative flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer select-none text-xs w-full min-w-0",
                isSelected
                  ? "border-foreground/25 bg-muted/60 text-foreground font-medium shadow-2xs"
                  : "border-border/60 bg-card hover:bg-muted/30 text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Profile Icon and active indicator */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative flex items-center justify-center shrink-0">
                  <div
                    className={cn(
                      "size-7 rounded-md flex items-center justify-center border transition-colors",
                      isSelected
                        ? "border-border bg-background text-foreground"
                        : "border-border/40 bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <IconComp className="size-3.5" />
                  </div>
                  {isCurrentlyActive && (
                    <span
                      className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
                      title={t("profiles.activeNow")}
                    />
                  )}
                </div>

                {/* Profile Name and status */}
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span
                    className="text-xs font-medium tracking-tight truncate w-full"
                    title={profile.name}
                  >
                    {profile.name}
                  </span>

                  <div className="flex items-center gap-1 text-[10px] w-full min-w-0">
                    {isCurrentlyActive ? (
                      <span className="flex items-center gap-1 text-emerald-500 font-medium truncate">
                        <CheckCircle2 className="size-2.5 shrink-0" />
                        <span className="truncate">{t("profiles.activeNow")}</span>
                      </span>
                    ) : profile.enabled ? (
                      <span className="flex items-center gap-1 text-muted-foreground truncate">
                        <Clock className="size-2.5 shrink-0" />
                        <span className="truncate">{t("profiles.outsideSchedule")}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground/60 truncate">
                        <PowerOff className="size-2.5 shrink-0" />
                        <span className="truncate">{t("profiles.disabled")}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action controls: Divider, Switch, Context Menu */}
              <div className="flex items-center gap-1 shrink-0">
                <div className="h-5 w-px bg-border/60 my-auto mx-0.5" />

                {/* Per-profile Toggle Switch */}
                <div
                  className="flex items-center"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Switch
                    checked={profile.enabled}
                    disabled={disabled}
                    onCheckedChange={() => onToggleProfile(profile.id)}
                    className="scale-75"
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
                        className="size-6 rounded flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/70 transition-colors"
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
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 px-0.5 text-xs text-muted-foreground">
          <span className="text-xs">
            {t("profiles.paginationInfo", {
              start: startIndex + 1,
              end: Math.min(startIndex + PROFILES_PER_PAGE, profiles.length),
              total: profiles.length,
            })}
          </span>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs gap-1"
              aria-label={t("profiles.prevPage")}
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">{t("profiles.prevPage")}</span>
            </Button>

            <div className="flex items-center gap-1">
              {pageItems.map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    aria-hidden
                    className="px-1 text-xs text-muted-foreground/60 select-none"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant={item === safePage ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentPage(item)}
                    className={cn(
                      "size-7 p-0 text-xs",
                      item === safePage &&
                        "font-semibold bg-muted text-foreground border border-border shadow-2xs",
                    )}
                    aria-label={t("profiles.pageNumber", { page: item })}
                    aria-current={item === safePage ? "page" : undefined}
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs gap-1"
              aria-label={t("profiles.nextPage")}
            >
              <span className="hidden sm:inline">{t("profiles.nextPage")}</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog for Create */}
      <ProfileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        existingProfiles={profiles}
        onSave={async (name, icon, color) => {
          onCreateProfile(name, icon, color);
        }}
      />

      {/* Dialog for Edit */}
      {editingProfile && (
        <ProfileDialog
          open={Boolean(editingProfile)}
          profile={editingProfile}
          existingProfiles={profiles}
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
