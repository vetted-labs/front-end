"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Bell,
  Lock,
  CreditCard,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { companyNotificationsApi } from "@/lib/api";
import { toast } from "sonner";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import type { CompanyNotificationPreferences } from "@/types";

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
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      const result = await companyNotificationsApi.getPreferences();
      setPrefs(result);
    } catch {
      // Use defaults on error
    } finally {
      setIsLoadingPrefs(false);
    }
  }, []);

  // eslint-disable-next-line no-restricted-syntax -- fetches on auth readiness
  useEffect(() => {
    if (ready) fetchPreferences();
  }, [ready, fetchPreferences]);

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const result = await companyNotificationsApi.updatePreferences(prefs);
      setPrefs(result);
      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const updatePref = (key: keyof CompanyNotificationPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  if (!ready) return null;

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0 content-gradient" />
      {/* Main Content */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          </div>
          <p className="text-muted-foreground">Manage your company profile and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden p-2 space-y-1 dark:bg-card/30 dark:border-white/[0.06]">
              <button
                onClick={() => router.push("/dashboard/company-profile")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-foreground hover:bg-muted/50"
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Company Profile</span>
              </button>

              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "notifications"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <Bell className="w-5 h-5" />
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
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-6 dark:bg-card/30 dark:border-white/[0.06]">
              {/* Notification Settings */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Notification Preferences</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Choose how you want to receive updates about your job postings
                    </p>
                  </div>

                  {isLoadingPrefs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}

              {/* Security Settings */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Security Settings</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Manage your account security and authentication
                    </p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground mb-1">Password Management</p>
                        <p className="text-sm text-muted-foreground">
                          To change your password, please contact support or use the password reset feature on the login page.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border/30">
                      <p className="font-medium text-foreground mb-2">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add an extra layer of security to your account
                      </p>
                      <button className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all text-sm font-medium">
                        Enable 2FA
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-border/30">
                      <p className="font-medium text-foreground mb-2">Active Sessions</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manage devices where you&apos;re currently logged in
                      </p>
                      <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-all text-sm font-medium">
                        View Sessions
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Settings */}
              {activeTab === "billing" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Billing & Subscription</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Manage your subscription and payment methods
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">Pro Plan</h3>
                        <p className="text-sm text-muted-foreground">Unlimited job postings and candidates</p>
                      </div>
                      <span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-medium">
                        Active
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-foreground mb-4">
                      $99<span className="text-lg font-normal text-muted-foreground">/month</span>
                    </p>
                    <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-all text-sm font-medium">
                      Manage Subscription
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border/30">
                      <p className="font-medium text-foreground mb-2">Payment Method</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        •••• •••• •••• 4242
                      </p>
                      <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-all text-sm font-medium">
                        Update Payment Method
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-border/30">
                      <p className="font-medium text-foreground mb-2">Billing History</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        View and download your past invoices
                      </p>
                      <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-all text-sm font-medium">
                        View Invoices
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
