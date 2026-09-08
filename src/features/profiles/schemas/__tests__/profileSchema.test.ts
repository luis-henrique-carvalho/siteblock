import { describe, expect, it } from "vitest";
import { createProfileSchema, getAvailableDuplicateName } from "../profileSchema";

describe("profileSchema (Zod validation)", () => {
  const existingProfiles = [
    { id: "profile-1", name: "Trabalho" },
    { id: "profile-2", name: "Estudo" },
  ];

  it("validates successful profile data", () => {
    const schema = createProfileSchema({ existingProfiles });
    const result = schema.safeParse({
      name: "   Novo Perfil   ",
      icon: "target",
      color: "blue",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Novo Perfil");
      expect(result.data.icon).toBe("target");
      expect(result.data.color).toBe("blue");
    }
  });

  it("fails when name is empty or only whitespace", () => {
    const schema = createProfileSchema({ existingProfiles });
    const result = schema.safeParse({
      name: "    ",
      icon: "target",
      color: "blue",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("O nome do perfil é obrigatório.");
    }
  });

  it("fails when name exceeds 50 characters", () => {
    const schema = createProfileSchema({ existingProfiles });
    const longName = "a".repeat(51);
    const result = schema.safeParse({
      name: longName,
      icon: "target",
      color: "blue",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("O nome do perfil deve ter no máximo 50 caracteres.");
    }
  });

  it("fails when name already exists (case-insensitive and trimmed)", () => {
    const schema = createProfileSchema({ existingProfiles });
    const result = schema.safeParse({
      name: "  trabalho  ",
      icon: "target",
      color: "blue",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Já existe um perfil com este nome.");
    }
  });

  it("allows same name when editing the profile itself", () => {
    const schema = createProfileSchema({
      existingProfiles,
      currentProfileId: "profile-1",
    });
    const result = schema.safeParse({
      name: "Trabalho",
      icon: "target",
      color: "blue",
    });

    expect(result.success).toBe(true);
  });

  it("allows custom error messages via context", () => {
    const schema = createProfileSchema({
      existingProfiles,
      duplicateMessage: "Custom duplicate error",
      requiredMessage: "Custom required error",
    });

    const dupResult = schema.safeParse({
      name: "trabalho",
      icon: "target",
      color: "blue",
    });
    expect(dupResult.success).toBe(false);
    if (!dupResult.success) {
      expect(dupResult.error.issues[0].message).toBe("Custom duplicate error");
    }

    const emptyResult = schema.safeParse({
      name: "",
      icon: "target",
      color: "blue",
    });
    expect(emptyResult.success).toBe(false);
    if (!emptyResult.success) {
      expect(emptyResult.error.issues[0].message).toBe("Custom required error");
    }
  });
});

describe("getAvailableDuplicateName", () => {
  it("generates '(cópia)' for first duplicate", () => {
    const profiles = [{ name: "Foco" }];
    const name = getAvailableDuplicateName("Foco", profiles);
    expect(name).toBe("Foco (cópia)");
  });

  it("generates '(cópia 2)' when '(cópia)' is already present", () => {
    const profiles = [{ name: "Foco" }, { name: "Foco (cópia)" }];
    const name = getAvailableDuplicateName("Foco", profiles);
    expect(name).toBe("Foco (cópia 2)");
  });

  it("generates '(cópia 3)' when 1 and 2 exist", () => {
    const profiles = [
      { name: "Foco" },
      { name: "Foco (cópia)" },
      { name: "Foco (cópia 2)" },
    ];
    const name = getAvailableDuplicateName("Foco", profiles);
    expect(name).toBe("Foco (cópia 3)");
  });
});
