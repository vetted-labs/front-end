"use client";

import { ReactNode } from "react";
import { Loader2, AlertCircle, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "./card";
import { Button } from "./button";

interface DataViewProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  error?: string | null;
  isEmpty?: (data: T) => boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  loadingMessage?: string;
  retry?: () => void;
  /** "card" wraps in Card (default), "inline" renders bare, "fullscreen" centers on viewport */
  variant?: "card" | "inline" | "fullscreen";
  children: (data: T) => ReactNode;
}

export function DataView<T>({
  data,
  isLoading,
  error,
  isEmpty,
  emptyMessage = "Nothing to show",
  emptyIcon: EmptyIcon = AlertCircle,
  loadingMessage,
  retry,
  variant = "card",
  children,
}: DataViewProps<T>) {
  const Wrapper = variant === "card" ? CardWrapper : variant === "fullscreen" ? FullscreenWrapper : InlineWrapper;

  if (isLoading) {
    return (
      <Wrapper>
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
        {loadingMessage && (
          <p className="text-muted-foreground">{loadingMessage}</p>
        )}
      </Wrapper>
    );
  }

  if (error) {
    return (
      <Wrapper>
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <p className="text-destructive mb-4">{error}</p>
        {retry && (
          <Button variant="outline" onClick={retry}>
            Try Again
          </Button>
        )}
      </Wrapper>
    );
  }

  if (!data || (isEmpty && isEmpty(data))) {
    return (
      <Wrapper>
        <EmptyIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Wrapper>
    );
  }

  return <>{children(data)}</>;
}

function CardWrapper({ children }: { children: ReactNode }) {
  return (
    <Card padding="none">
      <CardContent className="p-12 text-center">{children}</CardContent>
    </Card>
  );
}

function InlineWrapper({ children }: { children: ReactNode }) {
  return <div className="p-12 text-center">{children}</div>;
}

function FullscreenWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">{children}</div>
    </div>
  );
}
