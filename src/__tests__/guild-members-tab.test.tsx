import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuildMembersTab } from "@/components/guild/GuildMembersTab";
import type { ExpertMember } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("GuildMembersTab", () => {
  it("renders missing expert stats as zero values instead of partial labels", () => {
    const expert: ExpertMember = {
      id: "expert-1",
      fullName: "You",
      email: "you@example.com",
      walletAddress: "0x0000000000000000000000000000000000000E7E",
      role: "craftsman",
      reputation: 54,
      joinedAt: "2026-03-15T12:00:00Z",
    };

    render(<GuildMembersTab experts={[expert]} candidates={[]} />);

    expect(screen.getByText("Reviews").nextSibling).toHaveTextContent("0");
    expect(screen.getByText("Success").nextSibling).toHaveTextContent("0%");
  });
});
