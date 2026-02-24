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
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Test Mode
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                You're connected with the backend test wallet ({backendWalletAddress.substring(0, 6)}...{backendWalletAddress.substring(38)}). Use this for development testing only.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wrong Network Warning */}
      {!isOnSepolia && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Wrong Network Detected
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                Your wallet is connected to <strong>{chainName || "Unknown Network"}</strong>.
                Please switch to <strong>Sepolia Testnet</strong> to endorse applications.
              </p>
              <Button
                onClick={onSwitchToSepolia}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Switch to Sepolia Testnet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Wallet Info */}
      {address && (
        <Card className="border-border/60 bg-card shadow-sm dark:bg-gradient-to-r dark:from-slate-950/85 dark:via-slate-900/80 dark:to-slate-950/85 dark:shadow-[0_25px_70px_-45px_rgba(14,116,144,0.6)]">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10">
                  <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected Wallet</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-semibold text-foreground">{shortAddress}</code>
                    <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300">
                      Vault
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formattedBalance ? `${formattedBalance} VETD available` : 'Balance loading...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Network</p>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <Network className="h-4 w-4 text-sky-400" />
                    <span>{chainName || 'Unknown Network'}</span>
                  </div>
                  <p className={`mt-1 text-xs ${isOnSepolia ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-500'}`}>
                    {isOnSepolia ? 'Sepolia ready' : 'Switch required'}
                  </p>
                </div>
                <Badge className={`${isOnSepolia ? 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'}`}>
                  {isOnSepolia ? 'Sepolia' : 'Wrong network'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
