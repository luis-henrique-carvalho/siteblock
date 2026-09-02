/**
 * Formats system and IPC errors into user-friendly localized messages.
 */
export function formatSystemError(error: unknown): string {
  const detail = String(error);
  if (detail.includes("Request dismissed") || detail.includes("polkit::Dismissed")) {
    return "Autorização cancelada. Na próxima tentativa, confirme a senha na janela do Ubuntu.";
  }
  return `Erro: ${detail}`;
}
