"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  CreditCard,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { companyNotificationsApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { EmptyState } from "@/components/ui/empty-state";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { DataSection } from "@/lib/motion";
import type { CompanyNotificationPreferences } from "@/types";

function SecurityContent() {
  const { execute, isLoading } = useApi<void>();
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.current) e.current = "Required";
    if (form.newPass.length < 8) e.newPass = "Min 8 characters";
    if (form.newPass !== form.confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="max-w-md space-y-4">
      <h3 className="font-semibold">Change Password</h3>
      <Input
        type="password"
        placeholder="Current password"
        value={form.current}
        onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
        error={errors.current}
      />
      <Input
        type="password"
        placeholder="New password"
        value={form.newPass}
        onChange={(e) => setForm((f) => ({ ...f, newPass: e.target.value }))}
        error={errors.newPass}
      />
      <Input
        type="password"
        placeholder="Confirm new password"
        value={form.confirm}
        onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
        error={errors.confirm}
      />
      <Button
        onClick={() => {
          if (!validate()) return;
          execute(
            () => Promise.reject(new Error("Password change endpoint not available yet")),
            {
              onSuccess: () => toast.success("Password updated"),
              onError: (err) => toast.error(err),
            }
          );
        }}
        disabled={isLoading}
        isLoading={isLoading}
      >
        Update Password
      </Button>

      <div className="mt-8 pt-6 border-t">
        <h3 className="font-semibold text-muted-foreground">Two-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground mt-1">Coming in a future update.</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { ready } = useRequireAuth("company");
  const [activeTab, setActiveTab] = useState<"notifications" | "security" | "billing">("notifications");

  // Notification preferences state
  const [prefs, setPrefs] = useState<CompanyNotificationPreferences>({
    emailNotifications: true,
    newApplications: true,
    applicationUpdates: true,
    messagesMeetings: true,
    jobUpdates: true,
    weeklyReports: false,
  });

  const { isLoading: isLoadingPrefs } = useFetch(
    () => companyNotificationsApi.getPreferences(),
    {
      skip: !ready,
      onSuccess: (result) => setPrefs(result),
    }
  );

  const { execute: executeSave, isLoading: isSavingPrefs } = useApi<CompanyNotificationPreferences>();

  const handleSavePreferences = async () => {
    await executeSave(
      () => companyNotificationsApi.updatePreferences(prefs),
      {
        onSuccess: (result) => {
          setPrefs(result);
          toast.success("Notification preferences saved");
        },
        onError: (errorMsg) => {
          toast.error(errorMsg || "Failed to save preferences");
        },
      }
    );
  };

  const updatePref = (key: keyof CompanyNotificationPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  if (!ready) return null;

  return (
    <div className="min-h-full relative animate-page-enter">
      {/* Main Content */}
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          </div>
          <p className="text-muted-foreground">Manage your company profile and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card overflow-hidden p-2 space-y-2">
              <button
                onClick={() => router.push("/dashboard/company-profile")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-foreground hover:bg-muted/50"
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium flex-1 text-left">Company Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50" />
              </button>

              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "notifications"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <VettedIcon name="notification" className="w-5 h-5" />
                <span className="font-medium">Notifications</span>
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "security"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <Lock className="w-5 h-5" />
                <span className="font-medium">Security</span>
              </button>

              <button
                onClick={() => setActiveTab("billing")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "billing"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">Billing</span>
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-border bg-card p-6">
              {/* Notification Settings */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-4">Notification Preferences</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Choose how you want to receive updates about your job postings
                    </p>
                  </div>

                  <DataSection isLoading={isLoadingPrefs} skeleton={null}>
                    <div className="space-y-4">
                      <ToggleSwitch label="Email Notifications" description="Receive notifications via email" checked={prefs.emailNotifications} onChange={(v) => updatePref("emailNotifications", v)} />
                      <ToggleSwitch label="New Applications" description="Get notified when someone applies" checked={prefs.newApplications} onChange={(v) => updatePref("newApplications", v)} />
                      <ToggleSwitch label="Application Updates" description="Status changes and guild vetting results" checked={prefs.applicationUpdates} onChange={(v) => updatePref("applicationUpdates", v)} />
                      <ToggleSwitch label="Messages & Meetings" description="New messages and meeting invitations" checked={prefs.messagesMeetings} onChange={(v) => updatePref("messagesMeetings", v)} />
                      <ToggleSwitch label="Job Updates" description="Expiring jobs and low application alerts" checked={prefs.jobUpdates} onChange={(v) => updatePref("jobUpdates", v)} />
                      <ToggleSwitch label="Weekly Reports" description="Summary of your hiring activity" checked={prefs.weeklyReports} onChange={(v) => updatePref("weeklyReports", v)} />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSavePreferences}
                        disabled={isSavingPrefs}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingPrefs && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Preferences
                      </button>
                    </div>
                  </DataSection>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === "security" && <SecurityContent />}

              {/* Billing Settings */}
              {activeTab === "billing" && (
                <EmptyState
                  icon={CreditCard}
                  title="Billing coming soon"
                  description="Subscription management and payment processing will be available in a future release."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
