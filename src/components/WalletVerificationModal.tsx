"use client";
import { Shield, Loader2, X, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

interface WalletVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
  isSigning: boolean;
  error: string | null;
  walletAddress: string;
}

export function WalletVerificationModal({
  isOpen,
  onClose,
  onVerify,
  isSigning,
  error,
  walletAddress,
}: WalletVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            Verify Your Wallet
          </h2>

          <p className="text-muted-foreground text-center mb-6">
            Sign a message to prove ownership of your wallet. This is required to review applications, stake on proposals, and endorse candidates.
          </p>

          {/* Wallet Address */}
          <div className="bg-muted/50 rounded-lg p-3 mb-6">
            <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
            <p className="text-sm font-mono text-foreground break-all">
              {walletAddress}
            </p>
          </div>

          {/* How it works */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Click &quot;Verify Wallet&quot; to open your wallet
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sign the verification message (no gas fee)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You&apos;re verified and ready to participate
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSigning}
            >
              Later
            </Button>
            <Button
              onClick={onVerify}
              disabled={isSigning}
              className="flex-1 bg-gradient-to-r from-primary to-accent text-white"
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify Wallet
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
