import { describe, expect, it } from "vitest";
import { getExpertWalletLoginAction } from "@/lib/expert-wallet-login-action";

describe("expert wallet login action", () => {
  it("uses an already connected wallet instead of forcing a reconnect", () => {
    expect(
      getExpertWalletLoginAction({
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        hasOpenConnectModal: true,
        isConnected: true,
      })
    ).toBe("use-connected-wallet");
  });

  it("opens the wallet modal when no wallet is connected", () => {
    expect(
      getExpertWalletLoginAction({
        address: undefined,
        hasOpenConnectModal: true,
        isConnected: false,
      })
    ).toBe("open-connect-modal");
  });

  it("reports provider initialization when the modal is unavailable", () => {
    expect(
      getExpertWalletLoginAction({
        address: undefined,
        hasOpenConnectModal: false,
        isConnected: false,
      })
    ).toBe("provider-initializing");
  });
});
