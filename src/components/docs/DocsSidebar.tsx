"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { docsNav, type DocsNavSection } from "./docs-nav";

interface DocsSidebarProps {
  onNavigate?: () => void;
}

const MOBILE_PERSONAS = [
  { key: "experts", label: "Experts", icon: Shield, href: "/docs/experts" },
  { key: "candidates", label: "Candidates", icon: Users, href: "/docs/candidates" },
  { key: "companies", label: "Companies", icon: Building2, href: "/docs/companies" },
] as const;

type Persona = "experts" | "candidates" | "companies" | "shared";

/**
 * GitBook-inspired left navigation, scoped to the current persona.
 *
 * Expert links are split into 4 sub-groups (Start here / Core workflows /
 * Economics / Advanced) so the sidebar stays scannable. Candidates and
 * companies each have a single group. Shared sections (Getting started,
 * Reference) appear for every persona.
 */
export function DocsSidebar({ onNavigate }: DocsSidebarProps) {
  const pathname = usePathname() ?? "";

  const persona: Persona = pathname.includes("/experts")
    ? "experts"
    : pathname.includes("/candidates")
    ? "candidates"
    : pathname.includes("/companies")
    ? "companies"
    : "shared";

  // Show: all sections for the current persona + all shared sections
  const sectionsToShow = docsNav.filter(
    (s) => s.persona === persona || s.persona === "shared"
  );

  // If no persona matched (e.g. landing/glossary/faq), show shared only
  const sections =
    sectionsToShow.length > 0
      ? sectionsToShow
      : docsNav.filter((s) => s.persona === "shared");

  return (
    <nav className="h-full overflow-y-auto px-5 py-8">
      {/* Mobile persona switcher — row 2 tabs are hidden on mobile */}
      <div className="mb-6 flex gap-1.5 md:hidden">
        {MOBILE_PERSONAS.map((p) => {
          const PIcon = p.icon;
          const isActive = persona === p.key;
          return (
            <Link
              key={p.key}
              href={p.href}
              onClick={onNavigate}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-colors",
                isActive
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <PIcon className="h-3 w-3" />
              {p.label}
            </Link>
          );
        })}
      </div>

      <ul className="space-y-5">
        {sections.map((section) => (
          <SectionBlock
            key={section.label}
            section={section}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}

function SectionBlock({
  section,
  pathname,
  onNavigate,
}: {
  section: DocsNavSection;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
        {section.label}
      </p>
      <ul className="space-y-0.5">
        {section.items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-md px-2 py-2.5 text-[14px] leading-[20px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:py-[5px]",
                  isActive
                    ? "font-semibold text-primary"
                    : "font-normal text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
                {item.isNew && (
                  <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-px align-middle text-[9px] font-semibold uppercase tracking-wide text-primary">
                    New
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
