"use client";

import { ArrowRight } from "lucide-react";
import { Modal } from "../ui/modal";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectors: any[];
  onConnect: (connectorId: string) => void;
  mounted: boolean;
}

export function WalletConnectModal({
  isOpen,
  onClose,
  connectors,
  onConnect,
  mounted,
}: WalletConnectModalProps) {
  // Helper to get wallet descriptions
  const getWalletDescription = (walletName: string): string => {
    const descriptions: Record<string, string> = {
      MetaMask: 'Connect using MetaMask browser extension',
      'Coinbase Wallet': 'Connect using Coinbase Wallet app',
      WalletConnect: 'Scan QR code with mobile wallet app',
    };
    return descriptions[walletName] || 'Connect with your wallet';
  };

  if (!mounted) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Your Wallet">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          Choose your preferred wallet to get started as an expert
        </p>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => onConnect(connector.id)}
            className="w-full flex items-center gap-4 px-4 py-4 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
              {/* Connector icon will be rendered by wagmi */}
              <span className="text-2xl">{connector.icon || '💼'}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-card-foreground">
                {connector.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {getWalletDescription(connector.name)}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </Modal>
  );
}
