import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "Carregando o painel de proteção…",
}: LoadingScreenProps) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground"
      role="status"
      aria-live="polite"
    >
      <Card className="flex flex-col items-center gap-4 p-8 max-w-sm w-full border-border/60 bg-card/70 shadow-lg backdrop-blur">
        <Spinner className="size-8 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground tracking-wide text-center">{message}</p>
        <div className="w-full space-y-2 pt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5 mx-auto" />
        </div>
      </Card>
    </main>
  );
}
