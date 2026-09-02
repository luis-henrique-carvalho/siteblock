interface FooterProps {
  message?: string;
}

export function Footer({ message }: FooterProps) {
  const isError = message ? message.toLowerCase().includes("erro") : false;

  return (
    <footer>
      {message && (
        <p
          className={isError ? "message error" : "message"}
          role={isError ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      )}
      <span>
        Autorização solicitada uma vez por abertura do app, ou ao atualizar a integração. Alterações
        da lista são aplicadas automaticamente.
      </span>
    </footer>
  );
}
