"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";

interface WalletVerificationStepProps {
  isVerified: boolean;
  isSigning: boolean;
  signingError?: string | null;
  onVerify: () => void;
}

export function WalletVerificationStep({
  isVerified,
  isSigning,
  signingError,
  onVerify,
}: WalletVerificationStepProps) {
  return (
    <div className="p-8 border-t border-border">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isVerified
            ? STATUS_COLORS.positive.bgSubtle
            : "bg-primary/10"
        }`}>
          {isVerified ? (
            <CheckCircle className={`w-5 h-5 ${STATUS_COLORS.positive.icon}`} />
          ) : (
            <Shield className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Wallet Ownership Verification
          </h3>
          {isVerified ? (
            <p className={`text-sm ${STATUS_COLORS.positive.text}`}>
              Wallet verified &mdash; you&apos;re good to go.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Sign a message to prove you own this wallet. This is a free signature &mdash; no gas fees.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={onVerify}
                disabled={isSigning}
                className="gap-2"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for signature...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Verify Wallet
                  </>
                )}
              </Button>
            </>
          )}
          {signingError && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">
                <p>{signingError}</p>
                {signingError.toLowerCase().includes("network") || signingError.toLowerCase().includes("fetch") ? (
                  <p className="mt-1 text-muted-foreground">Check your internet connection and try again. If the issue persists, the backend server may be down.</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
