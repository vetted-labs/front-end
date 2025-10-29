"use client";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import {
  Building2,
  Mail,
  Lock,
  ArrowRight,
  Wallet,
  Globe,
  MapPin,
  Users,
  Briefcase,
} from "lucide-react";
import { Input, Textarea, Select, Button, Alert, Modal } from "./ui";
import { companyApi } from "@/lib/api";
import { useApi } from "@/hooks/useFetch";
import { COMPANY_SIZES, INDUSTRIES } from "@/config/constants";

interface FormData {
  companyName: string;
  email: string;
  password: string;
  website: string;
  location: string;
  size: string;
  industry: string;
  description: string;
  walletAddress: string;
}

export function CompanyForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { execute, isLoading, error } = useApi();

  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    email: "",
    password: "",
    website: "",
    location: "",
    size: "",
    industry: "",
    description: "",
    walletAddress: "",
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!address) {
      newErrors.wallet = "Please connect your wallet";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await execute(
      () =>
        companyApi.create({
          companyName: formData.companyName,
          email: formData.email,
          password: formData.password,
          website: formData.website,
          location: formData.location,
          size: formData.size,
          industry: formData.industry,
          description: formData.description,
          walletAddress: address,
        }),
      {
        onSuccess: (data) => {
          const response = data as Record<string, unknown>;
          localStorage.setItem("companyAuthToken", String(response.token));
          localStorage.setItem("companyId", String(response.id));
          localStorage.setItem("companyEmail", String(response.email));
          localStorage.setItem("companyWallet", String(response.walletAddress));
          router.push("/dashboard");
        },
      }
    );
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-xl"></div>
            <span className="text-2xl font-bold text-foreground">Vetted</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Company Account
          </h1>
          <p className="text-muted-foreground">Start hiring vetted Web3 talent</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8">
          {/* Wallet Connection Section */}
          <div className="mb-6 p-6 bg-primary/10 rounded-xl border-2 border-violet-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Wallet Connection
                  </h3>
                  {isConnected && address ? (
                    <p className="text-sm text-muted-foreground">
                      Connected: {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">Not connected</p>
                  )}
                </div>
              </div>
              {!isConnected && (
                <Button
                  type="button"
                  onClick={() => setShowWalletModal(true)}
                >
                  Connect Wallet
                </Button>
              )}
            </div>
            {errors.wallet && (
              <p className="text-destructive text-sm mt-2">{errors.wallet}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </h3>

              <Input
                label="Company Name *"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                placeholder="Acme Inc."
                error={errors.companyName}
              />

              <Textarea
                label="Company Description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                placeholder="Tell us about your company..."
              />
            </div>

            {/* Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      Website
                    </div>
                  }
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://acme.com"
                />

                <Input
                  label={
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Location
                    </div>
                  }
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="San Francisco, CA"
                />

                <Select
                  label={
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Company Size
                    </div>
                  }
                  value={formData.size}
                  onChange={(e) => handleInputChange("size", e.target.value)}
                  options={COMPANY_SIZES}
                  placeholder="Select size"
                />

                <Select
                  label={
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      Industry
                    </div>
                  }
                  value={formData.industry}
                  onChange={(e) => handleInputChange("industry", e.target.value)}
                  options={INDUSTRIES}
                  placeholder="Select industry"
                />
              </div>
            </div>

            {/* Account Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Account Credentials</h3>

              <Input
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                icon={<Mail className="h-5 w-5" />}
                placeholder="john@acme.com"
                error={errors.email}
              />

              <Input
                label="Password *"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                icon={<Lock className="h-5 w-5" />}
                placeholder="••••••••"
                error={errors.password}
                helperText="Minimum 6 characters"
              />
            </div>

            {error && (
              <Alert variant="error">{error}</Alert>
            )}

            <Button
              type="submit"
              disabled={!isConnected}
              isLoading={isLoading}
              className="w-full"
              size="lg"
              icon={!isLoading && <ArrowRight className="w-5 h-5" />}
            >
              Create Company Account
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/auth/login?type=company")}
              className="text-primary hover:text-primary font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* Wallet Modal */}
      <Modal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        title="Connect Your Wallet"
        size="sm"
      >
        <div className="space-y-3">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector });
                setShowWalletModal(false);
              }}
              className="w-full py-4 px-6 bg-muted hover:bg-muted rounded-xl transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {connector.name === "MetaMask" && "🦊"}
                  {connector.name === "Coinbase Wallet" && "💙"}
                  {connector.name === "WalletConnect" && "🔗"}
                </span>
                <span className="font-medium text-foreground">
                  {connector.name}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
