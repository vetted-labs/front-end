import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = "Loading...", fullScreen = true }: LoadingStateProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 px-8 py-6 shadow-2xl">
          <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute -bottom-12 -left-10 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border border-primary/30" />
              <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
              <div className="absolute inset-3 rounded-full bg-primary/10" />
              <Loader2 className="absolute inset-0 m-auto h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Loading
              </p>
              <p className="text-base font-semibold text-foreground">{message}</p>
            </div>
          </div>

          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted/60">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
