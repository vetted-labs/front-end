"use client";

import { useState } from "react";
import { Bell, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Alert } from "@/components/ui/alert";
import { DataSection } from "@/lib/motion";
import { companyNotificationsApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import type { CompanyNotificationPreferences } from "@/types";

const DEFAULT_PREFS: CompanyNotificationPreferences = {
  emailNotifications: true,
  newApplications: true,
  applicationUpdates: true,
  messagesMeetings: true,
  jobUpdates: true,
  weeklyReports: false,
};

interface TopicConfig {
  key: keyof Omit<CompanyNotificationPreferences, "emailNotifications">;
  label: string;
  description: string;
}

const TOPICS: TopicConfig[] = [
  {
    key: "newApplications",
    label: "New applications",
    description: "When a candidate applies to one of your roles.",
  },
  {
    key: "applicationUpdates",
    label: "Application updates",
    description: "Status changes and guild vetting outcomes.",
  },
  {
    key: "messagesMeetings",
    label: "Messages & meetings",
    description: "New messages and meeting invitations.",
  },
  {
    key: "jobUpdates",
    label: "Job updates",
    description: "Expiring jobs and low-application alerts.",
  },
  {
    key: "weeklyReports",
    label: "Weekly reports",
    description: "A summary of your hiring activity each week.",
  },
];

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<CompanyNotificationPreferences>(DEFAULT_PREFS);

  const { isLoading, error } = useFetch(
    () => companyNotificationsApi.getPreferences(),
    {
      onSuccess: (result) => setPrefs(result),
    },
  );

  const { execute, isLoading: isSaving } = useApi<CompanyNotificationPreferences>();

  const update = <K extends keyof CompanyNotificationPreferences>(
    key: K,
    value: CompanyNotificationPreferences[K],
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    execute(() => companyNotificationsApi.updatePreferences(prefs), {
      onSuccess: (result) => {
        setPrefs(result);
        toast.success("Notification preferences saved");
      },
      onError: (msg) => toast.error(msg || "Failed to save preferences"),
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">
            <Bell className="w-4 h-4" />
          </span>
          Notifications
        </h2>
      </div>

      <div className="p-5 space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        <DataSection isLoading={isLoading} skeleton={null}>
          {/* Email master toggle */}
          <div>
            <SubgroupHeader
              icon={<Mail className="w-3.5 h-3.5" />}
              label="Email"
            />
            <ToggleSwitch
              label="Email notifications"
              description="Receive any of the topics below via email."
              checked={prefs.emailNotifications}
              onChange={(v) => update("emailNotifications", v)}
            />
          </div>

          {/* Topics */}
          <div>
            <SubgroupHeader
              icon={<Bell className="w-3.5 h-3.5" />}
              label="Topics"
            />
            <div className="space-y-2.5">
              {TOPICS.map((topic) => (
                <ToggleSwitch
                  key={topic.key}
                  label={topic.label}
                  description={topic.description}
                  checked={prefs[topic.key]}
                  onChange={(v) => update(topic.key, v)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              disabled={isSaving}
            >
              Save preferences
            </Button>
          </div>
        </DataSection>
      </div>
    </section>
  );
}

function SubgroupHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-muted-foreground">{icon}</span>
      <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </h3>
    </div>
  );
}
