import { describe, expect, it } from "vitest";
import { formatSystemError } from "../errorFormatter";

describe("errorFormatter", () => {
  it("should return localized message on polkit dismiss", () => {
    const error = "polkit::Dismissed: Request dismissed by user";
    expect(formatSystemError(error)).toBe(
      "Autorização cancelada. Na próxima tentativa, confirme a senha na janela do Ubuntu.",
    );
  });

  it("should prefix generic error with Erro:", () => {
    const error = new Error("Failed to write config file");
    expect(formatSystemError(error)).toBe("Erro: Error: Failed to write config file");
  });
});
