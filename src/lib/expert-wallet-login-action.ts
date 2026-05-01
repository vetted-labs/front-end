export type ExpertWalletLoginAction =
  | "use-connected-wallet"
  | "open-connect-modal"
  | "provider-initializing";

export function getExpertWalletLoginAction({
  address,
  hasOpenConnectModal,
  isConnected,
}: {
  address?: string | null;
  hasOpenConnectModal: boolean;
  isConnected: boolean;
}): ExpertWalletLoginAction {
  if (isConnected && address) return "use-connected-wallet";
  if (hasOpenConnectModal) return "open-connect-modal";
  return "provider-initializing";
}
