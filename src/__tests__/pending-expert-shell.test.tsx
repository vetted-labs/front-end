import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PendingExpertShell } from "@/components/layout/PendingExpertShell";

const mockUseAccount = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("wagmi", () => ({
  useAccount: () => mockUseAccount(),
  useDisconnect: () => ({
    disconnect: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuthContext: () => ({
    logout: vi.fn(),
  }),
}));

vi.mock("@/lib/walletConnectCleanup", () => ({
  fullWalletTeardown: vi.fn(),
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock("@/components/Logo", () => ({
  Logo: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      Vetted
    </button>
  ),
}));

describe("PendingExpertShell", () => {
  it("does not show a disconnect action when no wallet is connected", () => {
    mockUseAccount.mockReturnValue({ address: undefined });

    render(
      <PendingExpertShell>
        <div>Apply content</div>
      </PendingExpertShell>
    );

    expect(screen.getByText("Apply content")).toBeInTheDocument();
    expect(screen.queryByTitle("Disconnect Wallet")).not.toBeInTheDocument();
  });

  it("shows wallet controls when a wallet address exists", () => {
    mockUseAccount.mockReturnValue({
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });

    render(
      <PendingExpertShell>
        <div>Apply content</div>
      </PendingExpertShell>
    );

    expect(screen.getByTitle("Disconnect Wallet")).toBeInTheDocument();
    expect(screen.getByText("0x1234...5678")).toBeInTheDocument();
  });
});
