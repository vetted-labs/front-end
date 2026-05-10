"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Bell,
  Lock,
  Users,
  CreditCard,
  ExternalLink,
  Edit,
  ChevronRight,
} from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { companyApi, getAssetUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DataSection } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CompanyProfile } from "@/types";
import {
  SecuritySection,
  NotificationsSection,
  TeamSection,
  BillingSection,
} from "./settings";

type SettingsSection =
  | "profile"
  | "notifications"
  | "security"
  | "team"
  | "billing";

interface NavItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Bell;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Company name, logo, public info",
    icon: Building2,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Email and topic preferences",
    icon: Bell,
  },
  {
    id: "security",
    label: "Security",
    description: "Password, sessions, two-factor",
    icon: Lock,
  },
  {
    id: "team",
    label: "Team",
    description: "Members and roles",
    icon: Users,
  },
  {
    id: "billing",
    label: "Billing",
    description: "Plan and payment",
    icon: CreditCard,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { ready } = useRequireAuth("company");
  const [active, setActive] = useState<SettingsSection>("notifications");

  const { data: profile, isLoading: isLoadingProfile } = useFetch<CompanyProfile>(
    () => companyApi.getProfile(),
    { skip: !ready },
  );

  if (!ready) return null;

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </button>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Manage your company preferences, security, and team in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6">
          {/* Left rail */}
          <aside className="lg:sticky lg:top-6 self-start">
            <nav
              aria-label="Settings sections"
              className="rounded-xl border border-border bg-card overflow-hidden p-1.5"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-foreground hover:bg-muted/50 border border-transparent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-tight">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "block text-[11px] leading-tight mt-0.5 truncate",
                          isActive
                            ? "text-primary/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content area */}
          <div className="min-w-0">
            <DataSection
              isLoading={active === "profile" && isLoadingProfile && !profile}
              skeleton={null}
            >
              {active === "profile" && (
                <ProfileSection profile={profile} onEdit={() => router.push("/dashboard/company-profile")} />
              )}
              {active === "notifications" && <NotificationsSection />}
              {active === "security" && <SecuritySection />}
              {active === "team" && <TeamSection />}
              {active === "billing" && <BillingSection profile={profile ?? null} />}
            </DataSection>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfileSectionProps {
  profile: CompanyProfile | null | undefined;
  onEdit: () => void;
}

function ProfileSection({ profile, onEdit }: ProfileSectionProps) {
  const logoSrc = profile?.logoUrl ? getAssetUrl(profile.logoUrl) : null;
  const subtitle = [profile?.industry, profile?.location].filter(Boolean).join(" · ");

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">
            <Building2 className="w-4 h-4" />
          </span>
          Company profile
        </h2>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-4">
          <span className="w-16 h-16 rounded-2xl bg-card border border-border grid place-items-center overflow-hidden flex-shrink-0">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
              <img
                src={logoSrc}
                alt={profile?.name ?? "Company logo"}
                className="w-full h-full object-contain p-1.5 bg-white"
              />
            ) : (
              <Building2 className="w-7 h-7 text-muted-foreground/60" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground tracking-tight truncate">
              {profile?.name || "Your company"}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
            {profile?.email && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {profile.email}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-5 leading-relaxed">
          Your public profile, logo, description and links live on the company
          profile editor. Open it to make changes.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={onEdit} icon={<Edit className="w-3.5 h-3.5" />}>
            Edit company profile
          </Button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View editor
            <ChevronRight className="w-3 h-3" />
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
