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
  Clock,
  BookOpen,
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
        { label: "Analytics", href: "/expert/analytics", icon: BarChart3 },
        { label: "Earnings", href: "/expert/earnings", icon: Coins },
        { label: "Reputation", href: "/expert/reputation", icon: TrendingUp },
        { label: "Leaderboard", href: "/expert/leaderboard", icon: Trophy },
        { label: "Withdrawals", href: "/expert/withdrawals", icon: Wallet },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Docs", href: "/docs/experts", icon: BookOpen },
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
        { label: "Browse Guilds", href: "/guilds", icon: Users },
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
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
        { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: "notifications" },
      ],
    },
    {
      label: "Hiring",
      items: [
        { label: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
        { label: "Candidates", href: "/dashboard/candidates", icon: Users },
        { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: "messages" },
      ],
    },
    {
      label: "Company",
      items: [
        { label: "Company Profile", href: "/dashboard/company-profile", icon: Building2 },
        { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Docs", href: "/docs/companies", icon: BookOpen },
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
        { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard, exact: true },
        { label: "Notifications", href: "/candidate/notifications", icon: Bell, badge: "notifications" },
        { label: "Analytics", href: "/candidate/analytics", icon: BarChart3 },
      ],
    },
    {
      label: "Jobs",
      items: [
        { label: "Browse Jobs", href: "/browse/jobs", icon: Briefcase },
        { label: "My Applications", href: "/candidate/applications", icon: FileText },
        { label: "Messages", href: "/candidate/messages", icon: MessageSquare, badge: "messages" },
      ],
    },
    {
      label: "Guilds",
      items: [
        { label: "Browse Guilds", href: "/guilds", icon: Users },
        { label: "My Guilds", href: "/candidate/guilds", icon: Shield },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Docs", href: "/docs/candidates", icon: BookOpen },
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
        { label: "Docs", href: "/docs", icon: BookOpen },
      ],
    },
    {
      label: "Get Started",
      items: [
        {
          label: "Get Vetted",
          href: "/auth/login?type=candidate",
          icon: Users,
        },
        { label: "Vet Talent", href: "/auth/login?type=expert", icon: Award },
        {
          label: "Start Hiring",
          href: "/auth/login?type=company",
          icon: Building2,
        },
      ],
    },
  ],
};
