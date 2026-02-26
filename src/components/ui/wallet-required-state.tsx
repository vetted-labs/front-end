import { Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletRequiredStateProps {
  icon?: LucideIcon;
  message?: string;
  className?: string;
}

export function WalletRequiredState({
  icon: Icon = Wallet,
  message = "Please connect your wallet to continue",
  className,
}: WalletRequiredStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      <Icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
