import {
  Building2,
  Settings,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { VettedIconName } from "@/components/ui/vetted-icon";
import { GUILD_RANKS_ENABLED, GOVERNANCE_ENABLED } from "@/config/constants";

export type SidebarIcon = LucideIcon | VettedIconName;

export interface NavItem {
  label: string;
  href: string;
  icon: SidebarIcon;
  /** Show badge from useNotificationCount or useMessageCount */
  badge?: "notifications" | "messages";
  /** When true, only highlight on exact pathname match (no prefix matching) */
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface SidebarConfig {
  variant: "expert" | "company" | "candidate" | "browse";
  groups: NavGroup[];
}

export const expertSidebarConfig: SidebarConfig = {
  variant: "expert",
  groups: [
    {
      label: "Home",
      items: [
        { label: "Dashboard", href: "/expert/dashboard", icon: "home" },
        { label: "Notifications", href: "/expert/notifications", icon: "notification", badge: "notifications" },
      ],
    },
    {
      label: "Vetting",
      items: [
        { label: "Applications", href: "/expert/voting", icon: "application" },
        { label: "Endorsements", href: "/expert/endorsements", icon: "endorsement" },
      ],
    },
    {
      label: "Guilds",
      items: [
        { label: "My Guilds", href: "/expert/guilds", icon: "guilds" },
        // Guild Ranks hidden pending rework (VET-102) — re-enable via GUILD_RANKS_ENABLED.
        ...(GUILD_RANKS_ENABLED
          ? [{ label: "Guild Ranks", href: "/expert/guild-ranks", icon: "guild-ranks" } satisfies NavItem]
          : []),
      ],
    },
    // Governance hidden pending rework (VET-103) — re-enable via GOVERNANCE_ENABLED.
    ...(GOVERNANCE_ENABLED
      ? [{
          label: "Governance",
          items: [
            { label: "Proposals", href: "/expert/governance", icon: "voting" } satisfies NavItem,
          ],
        } satisfies NavGroup]
      : []),
    {
      label: "Rewards",
      items: [
        { label: "Earnings", href: "/expert/earnings", icon: "earnings" },
        { label: "Reputation", href: "/expert/reputation", icon: "reputation" },
      ],
    },
  ],
};

/**
 * Sidebar shown to experts whose status is NOT "approved" yet — i.e.
 * pending / rejected. Only the routes the auth guard actually allows
 * (/expert/application-pending, /guilds) are rendered so the user can't
 * click into a disabled dashboard and bounce back.
 */
export const restrictedExpertSidebarConfig: SidebarConfig = {
  variant: "expert",
  groups: [
    {
      label: "Application",
      items: [
        { label: "My Status", href: "/expert/application-pending", icon: Clock, exact: true },
      ],
    },
    {
      label: "Explore",
      items: [
        { label: "Browse Guilds", href: "/guilds", icon: "guilds" },
      ],
    },
  ],
};

export const companySidebarConfig: SidebarConfig = {
  variant: "company",
  groups: [
    {
      label: "Home",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: "home", exact: true },
        { label: "Notifications", href: "/dashboard/notifications", icon: "notification", badge: "notifications" },
      ],
    },
    {
      label: "Hiring",
      items: [
        { label: "Jobs", href: "/dashboard/jobs", icon: "job" },
        { label: "Candidates", href: "/dashboard/candidates", icon: "vet-talent" },
        { label: "Messages", href: "/dashboard/messages", icon: "message", badge: "messages" },
      ],
    },
    {
      label: "Company",
      items: [
        { label: "Company Profile", href: "/dashboard/company-profile", icon: Building2 },
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ],
};

export const candidateSidebarConfig: SidebarConfig = {
  variant: "candidate",
  groups: [
    {
      label: "Home",
      items: [
        { label: "Dashboard", href: "/candidate/dashboard", icon: "home", exact: true },
        { label: "Notifications", href: "/candidate/notifications", icon: "notification", badge: "notifications" },
      ],
    },
    {
      label: "Jobs",
      items: [
        { label: "Browse Jobs", href: "/browse/jobs", icon: "job" },
        { label: "My Applications", href: "/candidate/applications", icon: "application" },
        { label: "Messages", href: "/candidate/messages", icon: "message", badge: "messages" },
      ],
    },
    {
      label: "Guilds",
      items: [
        { label: "Browse Guilds", href: "/guilds", icon: "guilds" },
        { label: "My Guilds", href: "/candidate/guilds", icon: "guild-ranks" },
      ],
    },
  ],
};

export const browseSidebarConfig: SidebarConfig = {
  variant: "browse",
  groups: [
    {
      label: "Explore",
      items: [
        { label: "Home", href: "/", icon: "home" },
        { label: "Find Jobs", href: "/browse/jobs", icon: "job" },
        { label: "Guilds", href: "/guilds", icon: "guilds" },
      ],
    },
    {
      label: "Get Started",
      items: [
        {
          label: "Get Vetted",
          href: "/auth/login?type=candidate",
          icon: "vet-talent",
        },
        { label: "Vet Talent", href: "/auth/login?type=expert", icon: "vetting" },
        {
          label: "Start Hiring",
          href: "/auth/login?type=company",
          icon: Building2,
        },
      ],
    },
  ],
};
