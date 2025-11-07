"use client";
import Image from "next/image";
import { useEffect, useState, ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Shield,
  Users,
  Briefcase,
  Award,
  Star,
  TrendingUp,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  User,
  LogOut,
  Target,
  Activity,
  Trophy,
  Zap,
  CheckCircle,
  FileText,
  Calendar,
  Wallet,
} from "lucide-react";
import { LoadingState, Alert, Button } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { guildsApi, getAssetUrl } from "@/lib/api";

interface ExpertMember {
  id: string;
  fullName: string;
  email: string;
  role: "recruit" | "craftsman" | "master";
  reputation: number;
  expertise: string[];
  totalReviews: number;
  successRate: number;
  joinedAt: string;
}

interface CandidateMember {
  id: string;
  fullName: string;
  email: string;
  headline: string;
  experienceLevel: string;
  reputation: number;
  endorsements: number;
  joinedAt: string;
}

interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  applicants: number;
  createdAt: string;
}

interface Activity {
  id: string;
  type: "proposal_submitted" | "candidate_approved" | "job_posted" | "endorsement_given";
  actor: string;
  target?: string;
  timestamp: string;
  details: string;
}

interface Guild {
  id: string;
  name: string;
  description: string;
  expertCount: number;
  candidateCount: number;
  totalMembers: number;
  experts: ExpertMember[];
  candidates: CandidateMember[];
  openPositions: number;
  recentJobs: Job[];
  totalProposalsReviewed: number;
  averageApprovalTime: string;
  recentActivity: Activity[];
  establishedDate: string;
}

interface MembershipStatus {
  isMember: boolean;
  status?: "pending" | "approved" | "rejected";
  appliedAt?: string;
  role?: "recruit" | "craftsman" | "master";
}

interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  memberId: string;
  fullName: string;
  role: "recruit" | "craftsman" | "master" | "candidate";
  reputation: number;
  totalReviews?: number;
  successRate?: number;
  contributionScore: number;
  reputationChange?: string;
  trend?: "up" | "down" | "same";
}

// Wallet information helper
const getWalletInfo = (walletName: string) => {
  const wallets: Record<string, { icon: ReactElement; description: string }> = {
    MetaMask: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <path d="M36.5 3.5L22 13.5L24.5 7.5L36.5 3.5Z" fill="#E17726" stroke="#E17726" />
          <path d="M3.5 3.5L17.8 13.6L15.5 7.5L3.5 3.5Z" fill="#E27625" stroke="#E27625" />
        </svg>
      ),
      description: "Connect using MetaMask browser extension",
    },
    "Coinbase Wallet": {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0052FF" />
        </svg>
      ),
      description: "Connect using Coinbase Wallet app",
    },
  };

  return (
    wallets[walletName] || {
      icon: <Wallet className="w-6 h-6 text-violet-600" />,
      description: "Connect with your wallet",
    }
  );
};

export default function PublicGuildPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const rawGuildId = params.guildId as string;

  // Clean up guild ID: decode URL encoding and remove " Guild" suffix
  const guildId = decodeURIComponent(rawGuildId).replace(/ Guild$/i, '');

  const [guild, setGuild] = useState<Guild | null>(null);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState("");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "experts" | "candidates" | "jobs" | "activity" | "leaderboard">("overview");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
      const email = localStorage.getItem("candidateEmail");
      if (email) setCandidateEmail(email);
    }
    fetchGuildData();
  }, [guildId]);

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      try {
        await connect({ connector });
        setShowWalletModal(false);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    router.push("/?section=guilds");
  };

  const fetchGuildData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch public guild details
      const guildData: any = await guildsApi.getPublicDetail(guildId);
      console.log("[Guild Page] Guild data:", guildData);
      setGuild(guildData);

      // If authenticated, check membership status
      const candidateId = localStorage.getItem("candidateId");
      if (candidateId) {
        try {
          const membershipData: any = await guildsApi.checkMembership(candidateId, guildId);
          setMembership(membershipData);
        } catch (err) {
          // Not a member - that's okay
          setMembership({ isMember: false });
        }
      }
    } catch (err) {
      // Silently fall back to mock data if backend isn't ready
      // console.error("[Guild Page] Error loading guild:", err);

      // Use mock data if backend isn't ready
      const mockGuild: Guild = {
        id: guildId,
        name: guildId,
        description: `Professional community for ${guildId} professionals, where experts vet candidates and maintain high standards`,
        expertCount: 12,
        candidateCount: 45,
        totalMembers: 57,
        openPositions: 8,
        totalProposalsReviewed: 156,
        averageApprovalTime: "24h",
        establishedDate: "2024-01-01",
        experts: [
          {
            id: "expert-1",
            fullName: "Sarah Chen",
            email: "sarah@example.com",
            role: "master",
            reputation: 1850,
            expertise: ["React", "Node.js", "TypeScript", "AWS"],
            totalReviews: 48,
            successRate: 94,
            joinedAt: "2024-01-15",
          },
          {
            id: "expert-2",
            fullName: "Michael Rodriguez",
            email: "michael@example.com",
            role: "craftsman",
            reputation: 1420,
            expertise: ["Python", "Django", "PostgreSQL", "Docker"],
            totalReviews: 35,
            successRate: 91,
            joinedAt: "2024-02-20",
          },
          {
            id: "expert-3",
            fullName: "Emily Watson",
            email: "emily@example.com",
            role: "craftsman",
            reputation: 1280,
            expertise: ["Vue.js", "Laravel", "MySQL", "Redis"],
            totalReviews: 29,
            successRate: 89,
            joinedAt: "2024-03-10",
          },
          {
            id: "expert-4",
            fullName: "James Kim",
            email: "james@example.com",
            role: "recruit",
            reputation: 850,
            expertise: ["JavaScript", "Express", "MongoDB"],
            totalReviews: 18,
            successRate: 85,
            joinedAt: "2024-04-05",
          },
        ],
        candidates: [
          {
            id: "candidate-1",
            fullName: "Alex Johnson",
            email: "alex@example.com",
            headline: "Full Stack Developer",
            experienceLevel: "senior",
            reputation: 450,
            endorsements: 8,
            joinedAt: "2024-05-12",
          },
          {
            id: "candidate-2",
            fullName: "Maria Garcia",
            email: "maria@example.com",
            headline: "Frontend Engineer",
            experienceLevel: "mid",
            reputation: 320,
            endorsements: 5,
            joinedAt: "2024-06-01",
          },
          {
            id: "candidate-3",
            fullName: "David Lee",
            email: "david@example.com",
            headline: "Backend Developer",
            experienceLevel: "junior",
            reputation: 180,
            endorsements: 3,
            joinedAt: "2024-06-15",
          },
        ],
        recentJobs: [
          {
            id: "job-1",
            title: "Senior Full Stack Engineer",
            location: "Remote",
            type: "Full-time",
            salary: { min: 120000, max: 180000, currency: "USD" },
            applicants: 12,
            createdAt: "2024-10-15",
          },
          {
            id: "job-2",
            title: "Frontend Developer",
            location: "New York, NY",
            type: "Full-time",
            salary: { min: 90000, max: 140000, currency: "USD" },
            applicants: 8,
            createdAt: "2024-10-20",
          },
          {
            id: "job-3",
            title: "DevOps Engineer",
            location: "San Francisco, CA",
            type: "Contract",
            salary: { min: 100000, max: 150000, currency: "USD" },
            applicants: 5,
            createdAt: "2024-10-25",
          },
        ],
        recentActivity: [
          {
            id: "activity-1",
            type: "candidate_approved",
            actor: "Sarah Chen",
            target: "Alex Johnson",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            details: "approved",
          },
          {
            id: "activity-2",
            type: "proposal_submitted",
            actor: "Maria Garcia",
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            details: "submitted application",
          },
          {
            id: "activity-3",
            type: "job_posted",
            actor: "Tech Corp",
            target: "Senior Full Stack Engineer",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            details: "posted",
          },
          {
            id: "activity-4",
            type: "endorsement_given",
            actor: "Michael Rodriguez",
            target: "David Lee",
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            details: "endorsed",
          },
          {
            id: "activity-5",
            type: "candidate_approved",
            actor: "Emily Watson",
            target: "Maria Garcia",
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            details: "approved",
          },
        ],
      };

      // console.log("[Guild Page] Using mock data for guild:", guildId);
      setGuild(mockGuild);

      // Check membership with mock data for authenticated users
      const candidateId = localStorage.getItem("candidateId");
      if (candidateId) {
        setMembership({ isMember: false });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const leaderboardData: any = await guildsApi.getLeaderboard(guildId, { limit: 100 });
      console.log("[Guild Page] Leaderboard data:", leaderboardData);
      setLeaderboard(leaderboardData.leaderboard || []);
    } catch (err) {
      // Silently fall back to mock data if backend isn't ready
      // console.error("[Guild Page] Failed to fetch leaderboard:", err);

      // Use mock leaderboard data if backend isn't ready
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          previousRank: 2,
          memberId: "expert-1",
          fullName: "Sarah Chen",
          role: "master",
          reputation: 1850,
          totalReviews: 48,
          successRate: 94,
          contributionScore: 950,
          reputationChange: "+150",
          trend: "up",
        },
        {
          rank: 2,
          previousRank: 1,
          memberId: "expert-2",
          fullName: "Michael Rodriguez",
          role: "craftsman",
          reputation: 1420,
          totalReviews: 35,
          successRate: 91,
          contributionScore: 820,
          reputationChange: "+80",
          trend: "down",
        },
        {
          rank: 3,
          previousRank: 4,
          memberId: "expert-3",
          fullName: "Emily Watson",
          role: "craftsman",
          reputation: 1280,
          totalReviews: 29,
          successRate: 89,
          contributionScore: 750,
          reputationChange: "+120",
          trend: "up",
        },
        {
          rank: 4,
          previousRank: 3,
          memberId: "expert-4",
          fullName: "James Kim",
          role: "recruit",
          reputation: 850,
          totalReviews: 18,
          successRate: 85,
          contributionScore: 580,
          reputationChange: "-20",
          trend: "down",
        },
        {
          rank: 5,
          memberId: "candidate-1",
          fullName: "Alex Johnson",
          role: "candidate",
          reputation: 450,
          contributionScore: 420,
          reputationChange: "+60",
          trend: "same",
        },
        {
          rank: 6,
          memberId: "candidate-2",
          fullName: "Maria Garcia",
          role: "candidate",
          reputation: 320,
          contributionScore: 350,
          reputationChange: "+45",
          trend: "same",
        },
      ];

      // console.log("[Guild Page] Using mock leaderboard data");
      setLeaderboard(mockLeaderboard);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard" && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const handleApplyToGuild = () => {
    if (!isAuthenticated) {
      router.push(`/auth/signup?redirect=/guilds/${guildId}/apply`);
      return;
    }
    router.push(`/guilds/${guildId}/apply`);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("candidateId");
    localStorage.removeItem("candidateEmail");
    setIsAuthenticated(false);
    setCandidateEmail("");
    setShowUserMenu(false);
    router.push("/?section=guilds");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "master":
        return "bg-gradient-to-r from-amber-400 to-orange-500 text-white";
      case "craftsman":
        return "bg-gradient-to-r from-violet-500 to-indigo-600 text-white";
      case "recruit":
        return "bg-gradient-to-r from-blue-400 to-cyan-500 text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "proposal_submitted":
        return <FileText className="w-4 h-4" />;
      case "candidate_approved":
        return <CheckCircle className="w-4 h-4" />;
      case "job_posted":
        return <Briefcase className="w-4 h-4" />;
      case "endorsement_given":
        return <Award className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "proposal_submitted":
        return "bg-blue-100 text-blue-600";
      case "candidate_approved":
        return "bg-green-100 text-green-600";
      case "job_posted":
        return "bg-violet-100 text-primary";
      case "endorsement_given":
        return "bg-amber-100 text-amber-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading guild details..." />;
  }

  if (error || !guild) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Alert variant="error">{error || "Guild not found"}</Alert>
      </div>
    );
  }

  const showApplyButton = !membership?.isMember && membership?.status !== "pending";
  const showPendingStatus = membership?.status === "pending";
  const showMemberBadge = membership?.isMember;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/")}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Guilds
              </button>
              <ThemeToggle />
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground hidden sm:block">
                      {candidateEmail}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground">{candidateEmail}</p>
                        <p className="text-xs text-muted-foreground mt-1">Candidate Account</p>
                      </div>
                      <button
                        onClick={() => router.push("/candidate/profile")}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </button>
                      {membership?.isMember && (
                        <button
                          onClick={() => router.push(`/guilds/${guildId}/my-stats`)}
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <TrendingUp className="w-4 h-4" />
                          My Guild Stats
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => router.push("/auth/login?type=candidate")}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-indigo-600 rounded-lg hover:opacity-90 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-indigo-600/10 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-3">{guild.name}</h1>
                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed mb-4">
                  {guild.description}
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">{guild.totalMembers || (guild.expertCount + guild.candidateCount)} Members</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold">{guild.expertCount} Experts</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{guild.openPositions} Open Roles</span>
                  </div>
                  {guild.establishedDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-5 h-5" />
                      <span className="text-sm">Est. {new Date(guild.establishedDate).getFullYear()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {showMemberBadge && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border-2 border-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-300">Guild Member</p>
                    {membership.role && (
                      <p className="text-xs text-green-600 capitalize">{membership.role}</p>
                    )}
                  </div>
                </div>
              )}
              {showPendingStatus && (
                <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                      Application Pending
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Applied {membership?.appliedAt ? new Date(membership.appliedAt).toLocaleDateString() : "Recently"}
                    </p>
                  </div>
                </div>
              )}
              {showApplyButton && (
                <Button onClick={handleApplyToGuild} size="lg" className="px-8">
                  Apply to Join Guild
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guild Stats Bar */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{guild.totalProposalsReviewed || 0}</p>
              </div>
              <p className="text-sm text-muted-foreground">Proposals Reviewed</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <p className="text-2xl font-bold text-foreground">{guild.averageApprovalTime || "24h"}</p>
              </div>
              <p className="text-sm text-muted-foreground">Avg Approval Time</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <p className="text-2xl font-bold text-foreground">{guild.candidateCount}</p>
              </div>
              <p className="text-sm text-muted-foreground">Active Candidates</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <p className="text-2xl font-bold text-foreground">{guild.openPositions}</p>
              </div>
              <p className="text-sm text-muted-foreground">Open Positions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-border mb-8">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-4 px-2 font-medium transition-all relative ${
                activeTab === "overview"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Overview
              {activeTab === "overview" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("experts")}
              className={`pb-4 px-2 font-medium transition-all relative ${
                activeTab === "experts"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Experts ({guild.expertCount})
              {activeTab === "experts" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("candidates")}
              className={`pb-4 px-2 font-medium transition-all relative ${
                activeTab === "candidates"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Candidates ({guild.candidateCount})
              {activeTab === "candidates" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`pb-4 px-2 font-medium transition-all relative ${
                activeTab === "jobs"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Jobs ({guild.recentJobs?.length || 0})
              {activeTab === "jobs" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-4 px-2 font-medium transition-all relative ${
                activeTab === "activity"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Activity
              {activeTab === "activity" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`pb-4 px-2 font-medium transition-all relative ${
                activeTab === "leaderboard"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Leaderboard
              {activeTab === "leaderboard" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Top Experts */}
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Top Experts
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(guild.experts || []).slice(0, 4).map((expert) => (
                      <div
                        key={expert.id}
                        className="border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">{expert.fullName}</h3>
                            <span
                              className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                                expert.role
                              )}`}
                            >
                              {expert.role.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-primary">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="font-bold">{expert.reputation}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {expert.expertise.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-muted text-card-foreground text-xs rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        {expert.totalReviews > 0 && (
                          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                            {expert.totalReviews} reviews • {expert.successRate}% success rate
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(guild.experts || []).length > 4 && (
                    <button
                      onClick={() => setActiveTab("experts")}
                      className="mt-4 text-sm text-primary hover:underline"
                    >
                      View all {guild.expertCount} experts →
                    </button>
                  )}
                </div>

                {/* Recent Jobs */}
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Recent Positions
                  </h2>
                  {guild.recentJobs && guild.recentJobs.length > 0 ? (
                    <div className="space-y-3">
                      {guild.recentJobs.slice(0, 5).map((job) => (
                        <button
                          key={job.id}
                          onClick={() => router.push(`/browse/jobs/${job.id}`)}
                          className="w-full border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-2">{job.title}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </span>
                                <span className="px-2 py-1 bg-violet-100 text-primary text-xs font-medium rounded">
                                  {job.type}
                                </span>
                                {job.salary.min && job.salary.max && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    ${job.salary.min / 1000}k - ${job.salary.max / 1000}k
                                  </span>
                                )}
                                {job.applicants > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {job.applicants} applicants
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No recent job postings
                    </p>
                  )}
                  <button
                    onClick={() => setActiveTab("jobs")}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    View all jobs →
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Why Join */}
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Why Join This Guild?
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Vetted by Experts</p>
                        <p className="text-sm text-muted-foreground">
                          Get reviewed and endorsed by industry professionals
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Exclusive Access</p>
                        <p className="text-sm text-muted-foreground">
                          Apply to guild-specific job openings
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Build Reputation</p>
                        <p className="text-sm text-muted-foreground">
                          Earn reputation points and stand out to employers
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Community Support</p>
                        <p className="text-sm text-muted-foreground">
                          Connect with peers and mentors in your field
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Recent Activity */}
                {guild.recentActivity && guild.recentActivity.length > 0 && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      {guild.recentActivity.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{activity.actor}</span> {activity.details}
                              {activity.target && (
                                <span className="font-medium"> {activity.target}</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.timestamp).toRelativeTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveTab("activity")}
                      className="mt-4 text-sm text-primary hover:underline"
                    >
                      View all activity →
                    </button>
                  </div>
                )}

                {/* CTA */}
                {!showMemberBadge && !showPendingStatus && (
                  <div className="bg-gradient-to-br from-primary/10 to-indigo-600/10 rounded-xl border-2 border-primary/20 p-6">
                    <h3 className="text-lg font-bold text-foreground mb-2">Ready to Join?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Submit your application and get vetted by our expert community
                    </p>
                    <Button onClick={handleApplyToGuild} className="w-full">
                      Apply Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Experts Tab */}
          {activeTab === "experts" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Expert Members</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(guild.experts || []).map((expert) => (
                  <div
                    key={expert.id}
                    className="bg-card rounded-xl p-6 shadow-sm border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg mb-2">{expert.fullName}</h3>
                        <span
                          className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                            expert.role
                          )}`}
                        >
                          {expert.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-primary mb-1">
                          <Star className="w-5 h-5 fill-current" />
                          <span className="font-bold text-lg">{expert.reputation}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">reputation</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {expert.expertise.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-muted text-card-foreground text-xs rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Reviews</p>
                          <p className="font-semibold text-foreground">{expert.totalReviews || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Success Rate</p>
                          <p className="font-semibold text-foreground">{expert.successRate || 0}%</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Joined {new Date(expert.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {(guild.experts || []).length === 0 && (
                <p className="text-center text-muted-foreground py-12">No experts in this guild yet</p>
              )}
            </div>
          )}

          {/* Candidates Tab */}
          {activeTab === "candidates" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Candidate Members</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guild.candidates && guild.candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="bg-card rounded-xl p-6 shadow-sm border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg mb-1">{candidate.fullName}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{candidate.headline}</p>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                          {candidate.experienceLevel}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-primary mb-1">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-bold">{candidate.reputation || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Endorsements</p>
                          <p className="font-semibold text-foreground">{candidate.endorsements || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Member Since</p>
                          <p className="font-semibold text-foreground text-xs">
                            {new Date(candidate.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {(!guild.candidates || guild.candidates.length === 0) && (
                <p className="text-center text-muted-foreground py-12">No candidates in this guild yet</p>
              )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Open Positions</h2>
              {guild.recentJobs && guild.recentJobs.length > 0 ? (
                <div className="space-y-4">
                  {guild.recentJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => router.push(`/browse/jobs/${job.id}`)}
                      className="w-full bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-3">{job.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                            <span className="px-2 py-1 bg-violet-100 text-primary text-xs font-medium rounded">
                              {job.type}
                            </span>
                            {job.salary.min && job.salary.max && (
                              <span className="flex items-center gap-1 font-semibold text-green-700">
                                <DollarSign className="w-4 h-4" />
                                ${job.salary.min / 1000}k - ${job.salary.max / 1000}k {job.salary.currency}
                              </span>
                            )}
                            {job.applicants > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {job.applicants} applicants
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No open positions at the moment</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Recent Activity</h2>
              {guild.recentActivity && guild.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {guild.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground">
                            <span className="font-semibold">{activity.actor}</span> {activity.details}
                            {activity.target && (
                              <span className="font-semibold"> {activity.target}</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Guild Leaderboard</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Top {leaderboard.length} Members</span>
                </div>
              </div>

              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.memberId}
                      className={`bg-card border rounded-xl p-5 hover:border-primary/50 transition-all ${
                        index < 3 ? "border-2 border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank Badge */}
                        <div className="flex-shrink-0">
                          {index === 0 ? (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                              <Trophy className="w-7 h-7 text-white" />
                            </div>
                          ) : index === 1 ? (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg">
                              <Trophy className="w-7 h-7 text-white" />
                            </div>
                          ) : index === 2 ? (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center shadow-lg">
                              <Trophy className="w-7 h-7 text-white" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                              <span className="text-xl font-bold text-foreground">#{entry.rank}</span>
                            </div>
                          )}
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-foreground">{entry.fullName}</h3>
                            <span
                              className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                                entry.role
                              )}`}
                            >
                              {entry.role.toUpperCase()}
                            </span>
                            {entry.trend && (
                              <div className="flex items-center gap-1">
                                {entry.trend === "up" ? (
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                ) : entry.trend === "down" ? (
                                  <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                                ) : null}
                                {entry.previousRank && (
                                  <span className="text-xs text-muted-foreground">
                                    {entry.previousRank > entry.rank
                                      ? `+${entry.previousRank - entry.rank}`
                                      : entry.previousRank < entry.rank
                                      ? `-${entry.rank - entry.previousRank}`
                                      : "—"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-500 fill-current" />
                              <div>
                                <p className="text-sm font-bold text-foreground">{entry.reputation}</p>
                                <p className="text-xs text-muted-foreground">Reputation</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-sm font-bold text-foreground">{entry.contributionScore}</p>
                                <p className="text-xs text-muted-foreground">Contribution</p>
                              </div>
                            </div>
                            {entry.totalReviews !== undefined && (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <div>
                                  <p className="text-sm font-bold text-foreground">{entry.totalReviews}</p>
                                  <p className="text-xs text-muted-foreground">Reviews</p>
                                </div>
                              </div>
                            )}
                            {entry.successRate !== undefined && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <div>
                                  <p className="text-sm font-bold text-foreground">{entry.successRate}%</p>
                                  <p className="text-xs text-muted-foreground">Success Rate</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Reputation Change Badge */}
                          {entry.reputationChange && (
                            <div className="mt-2">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                  entry.reputationChange.startsWith("+")
                                    ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                    : entry.reputationChange.startsWith("-")
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {entry.reputationChange} this month
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Trophy className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-lg text-muted-foreground mb-2">No leaderboard data available</p>
                  <p className="text-sm text-muted-foreground">
                    Rankings will appear as members earn reputation
                  </p>
                </div>
              )}

              {/* Leaderboard Info */}
              <div className="mt-8 p-6 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  How Rankings Work
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Members are ranked by reputation and contribution score</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Complete reviews, earn endorsements, and successfully place candidates to climb</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Top 3 members receive special recognition badges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Rankings update in real-time as you contribute to the guild</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to format relative time
declare global {
  interface Date {
    toRelativeTimeString(): string;
  }
}

Date.prototype.toRelativeTimeString = function() {
  const now = new Date();
  const diffMs = now.getTime() - this.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return this.toLocaleDateString();
};
