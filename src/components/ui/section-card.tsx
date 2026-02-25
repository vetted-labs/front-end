import { cn } from "@/lib/utils";
import Link from "next/link";

interface SectionCardProps {
  title?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  action,
  children,
  className,
  contentClassName,
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="text-xs text-primary hover:underline font-medium"
              >
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className="text-xs text-primary hover:underline font-medium"
              >
                {action.label}
              </button>
            )
          )}
        </div>
      )}
      <div className={cn(!noPadding && !title && "p-5", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
