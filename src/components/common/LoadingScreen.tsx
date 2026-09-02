interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "Carregando o painel de proteção…",
}: LoadingScreenProps) {
  return (
    <main className="loading" role="status" aria-live="polite">
      {message}
    </main>
  );
}
