import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWalletVerification } from "@/lib/hooks/useWalletVerification";
import { blockchainApi } from "@/lib/api";
import { storeExpertAuthState } from "@/lib/auth";

const signMessageAsync = vi.fn();

vi.mock("wagmi", () => ({
  useSignMessage: () => ({
    signMessageAsync,
  }),
}));

vi.mock("@/lib/api", () => ({
  blockchainApi: {
    isWalletVerified: vi.fn(),
    getWalletChallenge: vi.fn(),
    verifyWallet: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  storeExpertAuthState: vi.fn(),
}));

describe("useWalletVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signMessageAsync.mockResolvedValue("signature");
  });

  it("scopes verification state to the checked wallet address", async () => {
    vi.mocked(blockchainApi.isWalletVerified)
      .mockResolvedValueOnce({ verified: true })
      .mockResolvedValueOnce({ verified: false });

    const { result } = renderHook(() => useWalletVerification());

    await act(async () => {
      await result.current.checkVerification("0xAAA");
    });

    expect(result.current.isVerified).toBe(true);
    expect(result.current.verifiedAddress).toBe("0xaaa");

    await act(async () => {
      const pending = result.current.checkVerification("0xBBB");
      expect(result.current.isVerifiedFor("0xBBB")).toBe(false);
      await pending;
    });

    expect(result.current.isVerified).toBe(false);
    expect(result.current.verifiedAddress).toBe("0xbbb");
    expect(result.current.isVerifiedFor("0xAAA")).toBe(false);
    expect(result.current.isVerifiedFor("0xBBB")).toBe(false);
  });

  it("ignores stale manual verification results after a newer wallet check starts", async () => {
    let resolveVerifyWalletA: ((value: unknown) => void) | undefined;
    vi.mocked(blockchainApi.getWalletChallenge).mockResolvedValue({
      message: "Sign this challenge",
    });
    vi.mocked(blockchainApi.verifyWallet).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerifyWalletA = resolve;
        }) as never
    );
    vi.mocked(blockchainApi.isWalletVerified).mockResolvedValue({ verified: true });

    const { result } = renderHook(() => useWalletVerification());

    let walletAPromise: Promise<boolean>;
    await act(async () => {
      walletAPromise = result.current.requestVerification("0xAAA");
    });

    await act(async () => {
      await result.current.checkVerification("0xBBB");
    });

    await act(async () => {
      resolveVerifyWalletA?.({
        token: "token-a",
        expert: { id: "expert-a", walletAddress: "0xAAA" },
      });
      await walletAPromise!;
    });

    expect(result.current.isVerifiedFor("0xBBB")).toBe(true);
    expect(result.current.isVerifiedFor("0xAAA")).toBe(false);
    expect(result.current.verifiedAddress).toBe("0xbbb");
    expect(result.current.isSigning).toBe(false);
    expect(storeExpertAuthState).not.toHaveBeenCalled();
  });
});
