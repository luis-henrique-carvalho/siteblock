import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileTabs } from "../components/ProfileTabs";
import type { Profile } from "@/types/siteblock";

function createMockProfiles(count: number): Profile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `profile-${i + 1}`,
    name: `Perfil ${i + 1}`,
    icon: "target",
    color: "blue",
    enabled: true,
    domains: [],
    schedules: [],
  }));
}

describe("ProfileTabs Component", () => {
  it("renders all profiles without pagination when 6 or fewer profiles exist", () => {
    const profiles = createMockProfiles(6);

    render(
      <ProfileTabs
        profiles={profiles}
        selectedProfileId="profile-1"
        activeProfileIds={["profile-1"]}
      />,
    );

    // All 6 profiles should be in the document
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(`Perfil ${i}`)).toBeInTheDocument();
    }

    // Pagination navigation should NOT be present
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próxima" })).not.toBeInTheDocument();
  });

  it("paginates profiles when more than 6 profiles exist", async () => {
    const user = userEvent.setup();
    const profiles = createMockProfiles(10);

    render(
      <ProfileTabs
        profiles={profiles}
        selectedProfileId="profile-1"
        activeProfileIds={["profile-1"]}
      />,
    );

    // Page 1 should show profiles 1 to 6
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(`Perfil ${i}`)).toBeInTheDocument();
    }

    // Profiles 7 to 10 should NOT be visible on page 1
    expect(screen.queryByText("Perfil 7")).not.toBeInTheDocument();
    expect(screen.queryByText("Perfil 10")).not.toBeInTheDocument();

    // Pagination controls should be visible
    expect(screen.getByText("Mostrando 1–6 de 10 perfis")).toBeInTheDocument();
    const prevBtn = screen.getByRole("button", { name: "Anterior" });
    const nextBtn = screen.getByRole("button", { name: "Próxima" });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Navigate to page 2 via next button
    await user.click(nextBtn);

    // Page 2 should show profiles 7 to 10
    for (let i = 7; i <= 10; i++) {
      expect(screen.getByText(`Perfil ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText("Perfil 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Perfil 6")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 7–10 de 10 perfis")).toBeInTheDocument();

    // Next button should now be disabled, previous button enabled
    expect(nextBtn).toBeDisabled();
    expect(prevBtn).toBeEnabled();

    // Navigate back to page 1 via page number button
    const page1Btn = screen.getByRole("button", { name: "Página 1" });
    await user.click(page1Btn);
    expect(screen.getByText("Perfil 1")).toBeInTheDocument();
  });

  it("automatically switches to the page of the selected profile", () => {
    const profiles = createMockProfiles(10);

    const { rerender } = render(
      <ProfileTabs
        profiles={profiles}
        selectedProfileId="profile-1"
        activeProfileIds={[]}
      />,
    );

    // Initially on page 1
    expect(screen.getByText("Perfil 1")).toBeInTheDocument();
    expect(screen.queryByText("Perfil 9")).not.toBeInTheDocument();

    // Rerender with profile-9 selected (which is on page 2 with page size 6)
    rerender(
      <ProfileTabs
        profiles={profiles}
        selectedProfileId="profile-9"
        activeProfileIds={[]}
      />,
    );

    // Should now display page 2 with Perfil 9
    expect(screen.getByText("Perfil 9")).toBeInTheDocument();
    expect(screen.queryByText("Perfil 1")).not.toBeInTheDocument();
  });

  it("calls onSelectProfile when clicking on a profile card", async () => {
    const user = userEvent.setup();
    const profiles = createMockProfiles(4);
    const onSelectProfile = vi.fn();

    render(
      <ProfileTabs
        profiles={profiles}
        selectedProfileId="profile-1"
        onSelectProfile={onSelectProfile}
      />,
    );

    await user.click(screen.getByText("Perfil 3"));
    expect(onSelectProfile).toHaveBeenCalledWith("profile-3");
  });

  it("calls onToggleProfile when toggling the profile switch", async () => {
    const user = userEvent.setup();
    const profiles = createMockProfiles(3);
    const onToggleProfile = vi.fn();

    render(
      <ProfileTabs
        profiles={profiles}
        selectedProfileId="profile-1"
        onToggleProfile={onToggleProfile}
      />,
    );

    const switchBtn = screen.getByRole("switch", { name: "Alternar Perfil 2" });
    await user.click(switchBtn);
    expect(onToggleProfile).toHaveBeenCalledWith("profile-2");
  });

  it("validates and prevents creating a profile with a duplicate name in the dialog", async () => {
    const user = userEvent.setup();
    const profiles = createMockProfiles(2);
    const onCreateProfile = vi.fn();

    render(
      <ProfileTabs
        profiles={profiles}
        selectedProfileId="profile-1"
        onCreateProfile={onCreateProfile}
      />,
    );

    // Open create profile dialog
    await user.click(screen.getByRole("button", { name: /Novo perfil/i }));

    const nameInput = screen.getByLabelText("Nome do perfil");
    const submitBtn = screen.getByRole("button", { name: "Criar perfil" });

    // Type duplicate name (Perfil 1)
    await user.type(nameInput, "perfil 1");

    expect(screen.getByText("Já existe um perfil com este nome.")).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Clear and type a unique name
    await user.clear(nameInput);
    await user.type(nameInput, "Trabalho");

    expect(screen.queryByText("Já existe um perfil com este nome.")).not.toBeInTheDocument();
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);
    expect(onCreateProfile).toHaveBeenCalledWith("Trabalho", "target", "blue");
  });
});
