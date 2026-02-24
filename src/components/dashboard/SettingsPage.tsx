"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Bell,
  Lock,
  CreditCard,
  Users,
  Save,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { companyApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"company" | "notifications" | "security" | "billing">("company");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Company Settings
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newApplications, setNewApplications] = useState(true);
  const [applicationUpdates, setApplicationUpdates] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const auth = useAuthContext();

  useEffect(() => {
    if (!auth.isAuthenticated || auth.userType !== "company") {
      router.push("/auth/login?type=company");
      return;
    }
    if (auth.email) setCompanyEmail(auth.email);

    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, auth.userType, router]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const profile = await companyApi.getProfile();

      // Set company data from API
      setCompanyName(profile.company_name || "");
      setCompanyEmail(profile.email || auth.email || "");
      setCompanyPhone(profile.phone || "");
      setCompanyWebsite(profile.website || "");
      setCompanyAddress(profile.address || "");
      setCompanyDescription(profile.description || "");
    } catch (error) {
      console.error("Error loading settings:", error);
      // If error, at least set the email from auth context
      if (auth.email) setCompanyEmail(auth.email);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      await companyApi.updateProfile({
        company_name: companyName,
        email: companyEmail,
        phone: companyPhone || null,
        website: companyWebsite || null,
        address: companyAddress || null,
        description: companyDescription || null,
      });

      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setSaveMessage(error.message || "Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="bg-card rounded-xl border border-border p-2 space-y-1">
              <button
                onClick={() => setActiveTab("company")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "company"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Company</span>
              </button>

              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "notifications"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Bell className="w-5 h-5" />
                <span className="font-medium">Notifications</span>
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "security"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Lock className="w-5 h-5" />
                <span className="font-medium">Security</span>
              </button>

              <button
                onClick={() => setActiveTab("billing")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "billing"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">Billing</span>
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl border border-border p-6">
              {/* Company Settings */}
              {activeTab === "company" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Company Profile</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Update your company information that will be visible to candidates
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter your company name"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Email *
                    </label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="contact@company.com"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Website (Optional)
                    </label>
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://yourcompany.com"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="123 Main St, City, State, ZIP"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Description (Optional)
                    </label>
                    <textarea
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      rows={4}
                      placeholder="Tell candidates about your company, culture, and mission..."
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Notification Preferences</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Choose how you want to receive updates about your job postings
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">New Applications</p>
                        <p className="text-sm text-muted-foreground">Get notified when someone applies</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newApplications}
                          onChange={(e) => setNewApplications(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">Application Updates</p>
                        <p className="text-sm text-muted-foreground">Status changes and updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applicationUpdates}
                          onChange={(e) => setApplicationUpdates(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">Weekly Reports</p>
                        <p className="text-sm text-muted-foreground">Summary of your hiring activity</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={weeklyReports}
                          onChange={(e) => setWeeklyReports(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
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

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-foreground mb-2">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add an extra layer of security to your account
                      </p>
                      <button className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all text-sm font-medium">
                        Enable 2FA
                      </button>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-foreground mb-2">Active Sessions</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manage devices where you're currently logged in
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
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-foreground mb-2">Payment Method</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        •••• •••• •••• 4242
                      </p>
                      <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-all text-sm font-medium">
                        Update Payment Method
                      </button>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
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

              {/* Save Button */}
              {(activeTab === "company" || activeTab === "notifications") && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      {saveMessage && (
                        <p className={`text-sm ${saveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                          {saveMessage}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
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
