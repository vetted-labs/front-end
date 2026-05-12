import { cn } from "@/lib/utils";
import type { ExpertRole } from "@/types";

interface GuildCardHeaderProps {
  /** Registry slug derived from the guild name, e.g. "DESIGN". */
  registrySlug: string;
  /** Padded registry number, e.g. "01". */
  registryNumber: string;
  /** Optional role pill displayed inline with the registry, e.g. "MASTER". */
  role?: ExpertRole;
  /** Right-side status. */
  status:
    | "live"
    | { kind: "open"; count: number }
    | { kind: "applicationStatus"; label: string }
    | "none";
}

export function GuildCardHeader({
  registrySlug,
  registryNumber,
  role,
  status,
}: GuildCardHeaderProps) {
  return (
    <div className="flex justify-between items-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5">
      <div className="truncate">
        <span>G-{registryNumber} · {registrySlug}</span>
        {role && (
          <span className="text-primary ml-1.5 capitalize">{role}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {status === "live" && (
          <>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-positive shadow-[0_0_8px_theme(colors.positive)] guild-card-live-dot" />
            <span className="text-positive tracking-[0.15em]">LIVE</span>
          </>
        )}
        {typeof status === "object" && status.kind === "open" && (
          <span className="text-primary tracking-[0.18em]">{status.count} OPEN</span>
        )}
        {typeof status === "object" && status.kind === "applicationStatus" && (
          <span className="text-warning tracking-[0.18em]">{status.label}</span>
        )}
      </div>
    </div>
  );
}
