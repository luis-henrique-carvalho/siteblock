import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeInfo } from "lucide-react";
import { useLanguage } from "../../i18n";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-3 pr-8">
          <div className="flex size-10 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
            <BadgeInfo className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">{t("about.title")}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t("about.description")}
          </DialogDescription>
          <p className="pt-1 text-xs font-mono text-muted-foreground">{t("about.version")}</p>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
