// components/homepage.tsx
"use client";
import { useState, useEffect, ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useConnect, useAccount } from "wagmi";
import Image from "next/image";
import {
  ArrowRight,
  Shield,
  Users,
  Zap,
  Briefcase,
  CheckCircle,
  TrendingUp,
  Target,
  Search,
  FileCheck,
  Award,
  Clock,
  Coins,
  Wallet,
} from "lucide-react";
import { Modal } from "./ui/Modal";
import { ThemeToggle } from "./ThemeToggle";
import { expertApi } from "@/lib/api";

// Wallet information helper
const getWalletInfo = (walletName: string) => {
  const wallets: Record<string, { icon: ReactElement; description: string }> = {
    MetaMask: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <path d="M36.5 3.5L22 13.5L24.5 7.5L36.5 3.5Z" fill="#E17726" stroke="#E17726" />
          <path d="M3.5 3.5L17.8 13.6L15.5 7.5L3.5 3.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M31 28.5L27.5 34.5L35.5 36.5L37.5 28.5H31Z" fill="#E27625" stroke="#E27625" />
          <path d="M2.5 28.5L4.5 36.5L12.5 34.5L9 28.5H2.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M12 17.5L10 20.5L18 20.8L17.7 12.5L12 17.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M28 17.5L22.2 12.4L22 20.8L30 20.5L28 17.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M12.5 34.5L17 32.5L13.2 28.6L12.5 34.5Z" fill="#E27625" stroke="#E27625" />
          <path d="M23 32.5L27.5 34.5L26.8 28.6L23 32.5Z" fill="#E27625" stroke="#E27625" />
        </svg>
      ),
      description: "Connect using MetaMask browser extension",
    },
    "Coinbase Wallet": {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0052FF" />
          <path
            d="M20 36C28.8366 36 36 28.8366 36 20C36 11.1634 28.8366 4 20 4C11.1634 4 4 11.1634 4 20C4 28.8366 11.1634 36 20 36Z"
            fill="#0052FF"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11 20C11 15.0294 15.0294 11 20 11C24.9706 11 29 15.0294 29 20C29 24.9706 24.9706 29 20 29C15.0294 29 11 24.9706 11 20ZM17.5 17.5H22.5V22.5H17.5V17.5Z"
            fill="white"
          />
        </svg>
      ),
      description: "Connect using Coinbase Wallet app",
    },
    WalletConnect: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#3B99FC" />
          <path
            d="M12.5 15.5C17 11 25 11 29.5 15.5L30 16L27.5 18.5L27 18C24 15 17 15 14 18L13.5 18.5L11 16L12.5 15.5Z"
            fill="white"
          />
          <path d="M24 21L26 23L20 29L14 23L16 21L20 25L24 21Z" fill="white" />
        </svg>
      ),
      description: "Scan QR code with mobile wallet app",
    },
  };

  return (
    wallets[walletName] || {
      icon: <Wallet className="w-6 h-6 text-violet-600" />,
      description: "Connect with your wallet",
    }
  );
};

export function HomePage() {
  const router = useRouter();
  const { connectors, connect } = useConnect();
  const { address, isConnected } = useAccount();
  const [activeSection, setActiveSection] = useState<"employers" | "jobseekers" | "experts" | "guilds">("employers");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shouldCheckStatus, setShouldCheckStatus] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check expert status after wallet connection from experts tab
  useEffect(() => {
    if (mounted && isConnected && address && shouldCheckStatus && activeSection === "experts") {
      checkExpertStatus(address);
      setShouldCheckStatus(false);
    }
  }, [mounted, isConnected, address, shouldCheckStatus, activeSection]);

  const checkExpertStatus = async (walletAddress: string) => {
    try {
      const result: any = await expertApi.getProfile(walletAddress);
      if (result.success && result.data) {
        const expert = result.data;
        // Redirect based on status
        if (expert.status === "approved") {
          router.push("/expert/dashboard");
          return;
        } else if (expert.status === "pending") {
          router.push("/expert/application-pending");
          return;
        }
      }
    } catch (error: any) {
      // If 404, no profile found - redirect to application (this is expected for new wallets)
      if (error.status === 404) {
        router.push("/expert/apply");
        return;
      }
      // Silently handle other network errors - don't spam console
      // On error, redirect to expert home page
      router.push("/expert");
    }
  };

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      try {
        await connect({ connector });
        setShowWalletModal(false);
        // Set flag to check status after connection completes
        setShouldCheckStatus(true);
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    }
  };

  const employerFeatures = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Verified Talent Pool",
      description:
        "Access candidates validated by expert guilds with stake-backed endorsements",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Reduced Hiring Risk",
      description:
        "Expert reviewers stake their reputation on every candidate they endorse",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Faster Time-to-Hire",
      description:
        "Pre-screened candidates mean less time reviewing unqualified applications",
    },
    {
      icon: <FileCheck className="w-6 h-6" />,
      title: "Structured Evaluation",
      description:
        "Domain-specific rubrics ensure consistent, objective candidate assessment",
    },
  ];

  const jobSeekerFeatures = [
    {
      icon: <Award className="w-6 h-6" />,
      title: "Stand Out",
      description:
        "Get endorsed by industry experts and build a verified reputation",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Fair Evaluation",
      description:
        "Be judged on skills and merit through structured, objective reviews",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Career Growth",
      description:
        "Receive detailed feedback and build a track record of guild validations",
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Quality Opportunities",
      description:
        "Access vetted companies serious about finding the right talent",
    },
  ];

  const expertFeatures = [
    {
      icon: <Coins className="w-6 h-6" />,
      title: "Financial Rewards",
      description:
        "Earn tokens for voting with the majority consensus and making accurate assessments",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Vote with the Flock",
      description:
        "Get rewarded when you align with expert consensus - financial incentives for accurate judgment",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Guild Membership",
      description:
        "Join domain-specific expert communities and advance through ranks with proven performance",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Stake Your Expertise",
      description:
        "Put your reputation on the line and earn more when your endorsements succeed",
    },
  ];

  const guildFeatures = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Expert-Led Communities",
      description:
        "Professional communities organized by skill domain where experts vet and endorse candidates",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Quality Assurance",
      description:
        "High standards maintained through decentralized review process and reputation staking",
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Exclusive Job Access",
      description:
        "Members get access to curated job opportunities from companies seeking pre-vetted talent",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "DAO Governance",
      description:
        "Sub-guilds managed by decentralized autonomous organizations for community-led decision making",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation Header */}
      <nav className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
            </div>

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveSection("employers")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeSection === "employers"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                For Employers
              </button>
              <button
                onClick={() => setActiveSection("jobseekers")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeSection === "jobseekers"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                For Job Seekers
              </button>
              <button
                onClick={() => setActiveSection("experts")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeSection === "experts"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                For Experts
              </button>
              <button
                onClick={() => setActiveSection("guilds")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeSection === "guilds"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Guilds
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              {activeSection === "experts" ? (
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-indigo-600 rounded-lg hover:opacity-90 transition-all shadow-sm"
                >
                  Sign In
                </button>
              ) : (
                <button
                  onClick={() => router.push("/auth/login")}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-indigo-600 rounded-lg hover:opacity-90 transition-all shadow-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Hiring Built on{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Trust & Expertise
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-3xl mx-auto">
            Vetted transforms hiring through expert guild validation. Get candidates verified by
            industry professionals who stake their reputation on every endorsement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {activeSection === "experts" ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Sign In
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push("/auth/login")}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Sign In
                  <ArrowRight className="ml-2 w-5 h-5" />
                </button>
                {activeSection === "jobseekers" && (
                  <button
                    onClick={() => router.push("/browse/jobs")}
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-foreground bg-card border-2 border-border rounded-xl hover:border-primary hover:text-primary transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Search className="mr-2 w-5 h-5" />
                    Browse Jobs
                  </button>
                )}
                {activeSection === "guilds" && (
                  <button
                    onClick={() => router.push("/guilds")}
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-foreground bg-card border-2 border-border rounded-xl hover:border-primary hover:text-primary transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Shield className="mr-2 w-5 h-5" />
                    Explore Guilds
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Section - Dynamic based on active tab */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {activeSection === "employers"
              ? "Why Employers Choose Vetted"
              : activeSection === "jobseekers"
              ? "Why Job Seekers Choose Vetted"
              : activeSection === "guilds"
              ? "What are Guilds?"
              : "Why Experts Choose Vetted"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {activeSection === "employers"
              ? "Hire with confidence using our expert-validated talent pool"
              : activeSection === "jobseekers"
              ? "Stand out with expert endorsements and build your verified reputation"
              : activeSection === "guilds"
              ? "Professional communities where experts vet candidates and companies find pre-qualified talent"
              : "Earn rewards while shaping the future of hiring in your industry"}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(activeSection === "employers"
            ? employerFeatures
            : activeSection === "jobseekers"
            ? jobSeekerFeatures
            : activeSection === "guilds"
            ? guildFeatures
            : expertFeatures
          ).map((feature, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border hover:border-primary/50"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      {/* How It Works Section */}
      <div className="bg-card py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            How Vetted Works
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {activeSection === "employers"
              ? "A simple process that connects you with pre-validated talent"
              : activeSection === "jobseekers"
              ? "Get endorsed by experts and access quality job opportunities"
              : "Join guilds, review candidates, and earn rewards"}
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {(activeSection === "employers"
              ? [
                  {
                    step: "1",
                    title: "Post Your Role",
                    desc: "Define requirements and select the relevant expert guild",
                    icon: <Briefcase className="w-5 h-5" />,
                  },
                  {
                    step: "2",
                    title: "Applications Flow In",
                    desc: "Candidates apply and submit to guild review",
                    icon: <Users className="w-5 h-5" />,
                  },
                  {
                    step: "3",
                    title: "Guild Validation",
                    desc: "Expert reviewers evaluate candidates with stake-backed endorsements",
                    icon: <Shield className="w-5 h-5" />,
                  },
                  {
                    step: "4",
                    title: "Hire Top Talent",
                    desc: "Review validated candidates and make confident hiring decisions",
                    icon: <CheckCircle className="w-5 h-5" />,
                  },
                ]
              : activeSection === "jobseekers"
              ? [
                  {
                    step: "1",
                    title: "Create Profile",
                    desc: "Build your profile and upload your resume",
                    icon: <Users className="w-5 h-5" />,
                  },
                  {
                    step: "2",
                    title: "Apply to Jobs",
                    desc: "Browse vetted companies and apply to roles that match your skills",
                    icon: <Search className="w-5 h-5" />,
                  },
                  {
                    step: "3",
                    title: "Guild Review",
                    desc: "Expert reviewers evaluate your application and provide endorsements",
                    icon: <Award className="w-5 h-5" />,
                  },
                  {
                    step: "4",
                    title: "Get Hired",
                    desc: "Stand out with verified credentials and land your next role",
                    icon: <CheckCircle className="w-5 h-5" />,
                  },
                ]
              : [
                  {
                    step: "1",
                    title: "Apply to Join",
                    desc: "Connect wallet and apply to join an expert guild",
                    icon: <Shield className="w-5 h-5" />,
                  },
                  {
                    step: "2",
                    title: "Get Approved",
                    desc: "Current guild members review and vote on your application",
                    icon: <Users className="w-5 h-5" />,
                  },
                  {
                    step: "3",
                    title: "Review Candidates",
                    desc: "Evaluate job applicants and stake on your endorsements",
                    icon: <Award className="w-5 h-5" />,
                  },
                  {
                    step: "4",
                    title: "Earn & Progress",
                    desc: "Gain rewards and reputation, advance through guild ranks",
                    icon: <TrendingUp className="w-5 h-5" />,
                  },
                ]
            ).map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold mx-auto mb-4 shadow-lg">
                  <div className="flex flex-col items-center">
                    {item.icon}
                  </div>
                </div>
                <div className="absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent hidden md:block -z-10">
                  {index === 3 && <div className="hidden" />}
                </div>
                <h3 className="font-semibold text-card-foreground mb-2 text-base">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Core Platform Features */}
      <div className="bg-gradient-to-b from-background to-muted py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              The Vetted Difference
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built on trust, expertise, and accountability
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 shadow-sm border">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">
                Guild-Based Validation
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Expert communities evaluate talent using domain-specific rubrics.
                Reviewers stake their reputation on every endorsement they make.
              </p>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-sm border">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">
                AI-Enhanced Review
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Context-aware AI assists human judgment by analyzing portfolios,
                code samples, and work history—but experts always make the final call.
              </p>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-sm border">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">
                Reputation System
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Build a verified track record over time. Both candidates and reviewers
                accumulate credibility through successful placements and accurate assessments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {activeSection === "employers"
              ? "Ready to hire validated talent?"
              : activeSection === "jobseekers"
              ? "Ready to get verified and stand out?"
              : "Ready to join the expert community?"}
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            {activeSection === "employers"
              ? "Join companies that trust expert validation over traditional screening"
              : activeSection === "jobseekers"
              ? "Join professionals building verified reputations through guild endorsements"
              : "Earn rewards while shaping the future of hiring in your industry"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {activeSection === "experts" ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-primary bg-white rounded-xl hover:bg-white/90 transition-all shadow-lg"
              >
                <Wallet className="mr-2 w-5 h-5" />
                Connect Wallet
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => router.push("/auth/login")}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-primary bg-white rounded-xl hover:bg-white/90 transition-all shadow-lg"
              >
                {activeSection === "employers" ? "Start Hiring Today" : "Join Vetted Today"}
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-secondary text-muted-foreground py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8" />
                <span className="text-xl font-bold text-foreground">Vetted</span>
              </div>
              <p className="text-sm">
                Hiring built on trust, expertise, and accountability.
              </p>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => router.push("/auth/login")} className="hover:text-foreground transition-colors">Sign In</button></li>
                <li><button onClick={() => router.push("/dashboard")} className="hover:text-foreground transition-colors">Dashboard</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => router.push("/browse/jobs")} className="hover:text-foreground transition-colors">Browse Jobs</button></li>
                <li><button onClick={() => router.push("/auth/login")} className="hover:text-foreground transition-colors">Sign In</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">For Experts</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => router.push("/expert")} className="hover:text-foreground transition-colors">Become an Expert</button></li>
                <li><button onClick={() => router.push("/expert/dashboard")} className="hover:text-foreground transition-colors">Expert Dashboard</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Vetted. Building trust in hiring.</p>
          </div>
        </div>
      </footer>

      {/* Wallet Connection Modal */}
      {mounted && (
        <Modal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          title="Connect Your Wallet"
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Choose your preferred wallet to get started as an expert
            </p>
            {connectors.map((connector) => {
              const walletInfo = getWalletInfo(connector.name);
              return (
                <button
                  key={connector.id}
                  onClick={() => handleWalletConnect(connector.id)}
                  className="w-full flex items-center gap-4 px-4 py-4 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                    {walletInfo.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-card-foreground">{connector.name}</p>
                    <p className="text-xs text-muted-foreground">{walletInfo.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
