import {
  Home,
  Users,
  Award,
  Vote,
  Landmark,
  TrendingUp,
  Wallet,
  LayoutDashboard,
  BarChart3,
  Settings,
  Briefcase,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Show notification badge from useNotificationCount */
  badge?: "notifications";
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
      label: "Main",
      items: [
        { label: "Dashboard", href: "/expert/dashboard", icon: Home },
      ],
    },
    {
      label: "Guilds & Vetting",
      items: [
        { label: "My Guilds", href: "/expert/guilds", icon: Users },
        { label: "Endorsements", href: "/expert/endorsements", icon: Award },
        { label: "Voting", href: "/expert/voting", icon: Vote },
      ],
    },
    {
      label: "Governance",
      items: [
        { label: "Proposals", href: "/expert/governance", icon: Landmark },
      ],
    },
    {
      label: "Reputation",
      items: [
        { label: "Leaderboard", href: "/expert/leaderboard", icon: TrendingUp },
        { label: "Withdrawals", href: "/expert/withdrawals", icon: Wallet },
      ],
    },
  ],
};

export const companySidebarConfig: SidebarConfig = {
  variant: "company",
  groups: [
    {
      label: "Main",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Candidates", href: "/dashboard/candidates", icon: Users },
        { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ],
};

export const candidateSidebarConfig: SidebarConfig = {
  variant: "candidate",
  groups: [
    {
      label: "Explore",
      items: [
        { label: "Home", href: "/", icon: Home },
        { label: "Find Jobs", href: "/browse/jobs", icon: Briefcase },
        { label: "Guilds", href: "/guilds", icon: Users },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "My Profile", href: "/candidate/profile", icon: Users },
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
        { label: "Home", href: "/", icon: Home },
        { label: "Find Jobs", href: "/browse/jobs", icon: Briefcase },
        { label: "Guilds", href: "/guilds", icon: Users },
      ],
    },
    {
      label: "Get Started",
      items: [
        { label: "Vet Talent", href: "/expert/apply", icon: Award },
        {
          label: "Find Work",
          href: "/auth/signup?type=candidate",
          icon: Users,
        },
        {
          label: "Start Hiring",
          href: "/auth/signup?type=company",
          icon: Building2,
        },
      ],
    },
  ],
};
