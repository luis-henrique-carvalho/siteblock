import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useLanguage } from "@/i18n";

export interface BrowserRestartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  browserName?: string;
}

export function BrowserRestartDialog({
  open,
  onOpenChange,
  browserName = "",
}: BrowserRestartDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-3 pr-8">
          <div className="flex size-10 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-500 shadow-2xs">
            <RefreshCw className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            {t("browser.restartRequiredTitle", { browser: browserName })}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {t("browser.restartRequiredDescription", { browser: browserName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" className="w-full sm:w-auto font-medium">
              {t("common.understand")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
