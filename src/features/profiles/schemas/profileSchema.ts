import { z } from "zod";

export interface ProfileValidationContext {
  existingProfiles?: Array<{ id: string; name: string }>;
  currentProfileId?: string | null;
  duplicateMessage?: string;
  requiredMessage?: string;
  maxMessage?: string;
}

export function createProfileNameSchema(context: ProfileValidationContext = {}) {
  const {
    existingProfiles = [],
    currentProfileId = null,
    duplicateMessage = "Já existe um perfil com este nome.",
    requiredMessage = "O nome do perfil é obrigatório.",
    maxMessage = "O nome do perfil deve ter no máximo 50 caracteres.",
  } = context;

  return z
    .string()
    .trim()
    .min(1, requiredMessage)
    .max(50, maxMessage)
    .refine(
      (val) => {
        const lower = val.toLowerCase();
        return !existingProfiles.some(
          (p) =>
            (!currentProfileId || p.id !== currentProfileId) &&
            p.name.trim().toLowerCase() === lower,
        );
      },
      {
        message: duplicateMessage,
      },
    );
}

export function createProfileSchema(context: ProfileValidationContext = {}) {
  return z.object({
    name: createProfileNameSchema(context),
    icon: z.string().min(1, "O ícone é obrigatório."),
    color: z.string().min(1, "A cor é obrigatória."),
  });
}

export function getAvailableDuplicateName(
  baseName: string,
  existingProfiles: Array<{ name: string }>,
): string {
  const cleanBase = baseName.trim();
  let candidate = `${cleanBase} (cópia)`;
  let counter = 2;

  while (
    existingProfiles.some(
      (p) => p.name.trim().toLowerCase() === candidate.toLowerCase(),
    )
  ) {
    candidate = `${cleanBase} (cópia ${counter})`;
    counter++;
  }

  return candidate;
}

export type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;
