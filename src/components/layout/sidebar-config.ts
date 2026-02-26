import {
  Home,
  Users,
  Award,
  Landmark,
  TrendingUp,
  Wallet,
  Bell,
  LayoutDashboard,
  BarChart3,
  Settings,
  Briefcase,
  Building2,
  FileText,
  Shield,
  MessageSquare,
  Coins,
  Handshake,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
        { label: "Dashboard", href: "/expert/dashboard", icon: Home },
        { label: "Notifications", href: "/expert/notifications", icon: Bell, badge: "notifications" },
      ],
    },
    {
      label: "Vetting",
      items: [
        { label: "Applications", href: "/expert/voting", icon: FileText },
        { label: "Endorsements", href: "/expert/endorsements", icon: Handshake },
      ],
    },
    {
      label: "Guilds",
      items: [
        { label: "My Guilds", href: "/expert/guilds", icon: Users },
        { label: "Guild Ranks", href: "/expert/guild-ranks", icon: Shield },
      ],
    },
    {
      label: "Governance",
      items: [
        { label: "Proposals", href: "/expert/governance", icon: Landmark },
      ],
    },
    {
      label: "Rewards",
      items: [
        { label: "Earnings", href: "/expert/earnings", icon: Coins },
        { label: "Reputation", href: "/expert/reputation", icon: TrendingUp },
        { label: "Leaderboard", href: "/expert/leaderboard", icon: Trophy },
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
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
        { label: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
        { label: "Candidates", href: "/dashboard/candidates", icon: Users },
        { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "messages" },
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
      label: "Main",
      items: [
        { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard, exact: true },
        { label: "Messages", href: "/candidate/messages", icon: MessageSquare, badge: "messages" },
      ],
    },
    {
      label: "Jobs",
      items: [
        { label: "Browse Jobs", href: "/browse/jobs", icon: Briefcase },
        { label: "My Applications", href: "/candidate/applications", icon: FileText },
      ],
    },
    {
      label: "Guilds",
      items: [
        { label: "Browse Guilds", href: "/guilds", icon: Users },
        { label: "My Guilds", href: "/candidate/guilds", icon: Shield },
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
        { label: "Vet Talent", href: "/auth/login?type=expert", icon: Award },
        {
          label: "Find Work",
          href: "/auth/login?type=candidate",
          icon: Users,
        },
        {
          label: "Start Hiring",
          href: "/auth/login?type=company",
          icon: Building2,
        },
      ],
    },
  ],
};
