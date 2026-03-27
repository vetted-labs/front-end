"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  Wallet,
  Network,
} from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";

interface WalletStatusBannerProps {
  isBackendWallet: boolean;
  backendWalletAddress: string;
  isOnSepolia: boolean;
  chainName: string | undefined;
  address: string;
  shortAddress: string;
  formattedBalance: string | null;
  onSwitchToSepolia: () => void;
}

export function WalletStatusBanner({
  isBackendWallet,
  backendWalletAddress,
  isOnSepolia,
  chainName,
  address,
  shortAddress,
  formattedBalance,
  onSwitchToSepolia,
}: WalletStatusBannerProps) {
  return (
    <>
      {/* Backend Wallet Test Mode Indicator */}
      {isBackendWallet && (
        <Card className={`rounded-xl border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle}`}>
          <CardContent className="p-4 flex items-start gap-4">
            <AlertCircle className={`w-6 h-6 ${STATUS_COLORS.warning.icon} flex-shrink-0 mt-1`} />
            <div className="flex-1">
              <h3 className={`text-xl font-bold ${STATUS_COLORS.warning.text} mb-1`}>
                Test Mode
              </h3>
              <p className={`text-sm ${STATUS_COLORS.warning.text}`}>
                You&apos;re connected with the backend test wallet ({backendWalletAddress.substring(0, 6)}...{backendWalletAddress.substring(38)}). Use this for development testing only.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wrong Network Warning */}
      {!isOnSepolia && (
        <Card className={`rounded-xl border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle}`}>
          <CardContent className="p-4 flex items-start gap-4">
            <AlertTriangle className={`w-6 h-6 ${STATUS_COLORS.warning.icon} flex-shrink-0 mt-1`} />
            <div className="flex-1">
              <h3 className={`text-xl font-bold ${STATUS_COLORS.warning.text} mb-2`}>
                Wrong Network Detected
              </h3>
              <p className={`text-sm ${STATUS_COLORS.warning.text} mb-3`}>
                Your wallet is connected to <strong>{chainName || "Unknown Network"}</strong>.
                Please switch to <strong>Sepolia Testnet</strong> to endorse applications.
              </p>
              <Button
                onClick={onSwitchToSepolia}
                className="bg-primary text-primary-foreground"
              >
                Switch to Sepolia Testnet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Wallet Info */}
      {address && (
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Connected Wallet</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xl font-bold text-foreground">{shortAddress}</code>
                    <Badge className="border-primary/30 bg-primary/10 text-primary">
                      Vault
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formattedBalance ? `${formattedBalance} VETD available` : 'Balance loading...'}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Network</p>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span>{chainName || 'Unknown Network'}</span>
                </div>
                <p className={`mt-1 text-xs ${isOnSepolia ? 'text-primary' : STATUS_COLORS.warning.text}`}>
                  {isOnSepolia ? 'Sepolia ready' : 'Switch required'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
