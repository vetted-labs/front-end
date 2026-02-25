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
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-1">
                Test Mode
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You're connected with the backend test wallet ({backendWalletAddress.substring(0, 6)}...{backendWalletAddress.substring(38)}). Use this for development testing only.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wrong Network Warning */}
      {!isOnSepolia && (
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-2">
                Wrong Network Detected
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                Your wallet is connected to <strong>{chainName || "Unknown Network"}</strong>.
                Please switch to <strong>Sepolia Testnet</strong> to endorse applications.
              </p>
              <Button
                onClick={onSwitchToSepolia}
                className="bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))]"
              >
                Switch to Sepolia Testnet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Wallet Info */}
      {address && (
        <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected Wallet</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-semibold text-foreground">{shortAddress}</code>
                    <Badge className="border-primary/30 bg-primary/10 text-primary">
                      Vault
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formattedBalance ? `${formattedBalance} VETD available` : 'Balance loading...'}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Network</p>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span>{chainName || 'Unknown Network'}</span>
                </div>
                <p className={`mt-1 text-xs ${isOnSepolia ? 'text-primary' : 'text-amber-700 dark:text-amber-300'}`}>
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
