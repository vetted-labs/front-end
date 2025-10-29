import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = "Loading...", fullScreen = true }: LoadingStateProps) {
  const containerClass = fullScreen
    ? "min-h-screen bg-muted flex flex-col items-center justify-center"
    : "flex flex-col items-center justify-center p-8";

  return (
    <div className={containerClass}>
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
