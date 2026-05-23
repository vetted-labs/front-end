import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuildCard } from "@/components/guild/card";
import { GuildHeader } from "@/components/guild/GuildHeader";
import { HomeNavbar } from "@/components/home/HomeNavbar";
import { browseSidebarConfig } from "@/components/layout/sidebar-config";
import { Building2 } from "lucide-react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const noop = vi.fn();

describe("Vetted icon presentation", () => {
  it("uses the company hiring icon in browse navigation and home navbar", () => {
    const startHiringItem = browseSidebarConfig.groups
      .find((group) => group.label === "Get Started")
      ?.items.find((item) => item.label === "Start Hiring");

    expect(startHiringItem?.icon).toBe(Building2);

    render(
      <HomeNavbar
        isAuthenticated={false}
        userType={null}
        userEmail={null}
        showUserMenu={false}
        onToggleMenu={noop}
        onFindJob={noop}
        onStartVetting={noop}
        onStartHiring={noop}
        onViewGuilds={noop}
        onNavigateDashboard={noop}
        onLogout={noop}
        onLogoClick={noop}
      />,
    );

    const startHiringButton = screen.getByRole("button", {
      name: "Start Hiring",
    });
    expect(startHiringButton.querySelector("svg")).toBeInTheDocument();
  });

  it("gives the guild detail hero avatar enough room to showcase the logo", () => {
    const { container } = render(
      <GuildHeader
        guild={{
          name: "Engineering",
          memberCount: 4,
          expertRole: "master",
          reputation: 1200,
          description:
            "Software engineers, data scientists, ML engineers, and all technical builders",
          totalProposalsReviewed: 12,
          averageApprovalTime: "2d",
          candidateCount: 3,
          openPositions: 2,
          totalVetdStaked: 5000,
        }}
      />,
    );

    expect(
      container.querySelector('[data-vetted-icon="engineering"]'),
    ).toHaveClass("w-7", "h-7");
  });

  it("uses larger guild logos on guild cards instead of small utility icon sizing", () => {
    const { container } = render(
      <GuildCard
        guild={{
          id: "engineering",
          name: "Engineering",
          description: "Technical builders",
          memberCount: 4,
          expertRole: "master",
          pendingProposals: 0,
          ongoingProposals: 0,
          closedProposals: 0,
          totalEarnings: 120,
          reputation: 900,
        }}
        variant="workspace"
        catalogueIndex={1}
      />,
    );

    expect(
      container.querySelector('[data-vetted-icon="engineering"]'),
    ).toHaveClass("w-7", "h-7");
  });
});
